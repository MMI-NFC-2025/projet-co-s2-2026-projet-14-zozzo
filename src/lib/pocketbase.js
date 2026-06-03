import PocketBase from "pocketbase";

export const pb = new PocketBase("http://127.0.0.1:8090");

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email, password) {
  return await pb.collection("users").authWithPassword(email, password);
}

// avatar = ID du record dans la collection avatars (relation)
export async function register({ email, password, passwordConfirm, pseudo, age, avatar }) {
  await pb.collection("users").create({
    email,
    password,
    passwordConfirm,
    pseudo,
    age: parseInt(age),
    role: "enfant",
    experience: 0,
    niveau: 1,
    vies: 3,
    abonnement_actif: false,
    ...(avatar ? { avatar } : {}),
  });
  return await pb.collection("users").authWithPassword(email, password);
}

export function logout() {
  pb.authStore.clear();
}

export function getCurrentUser() {
  return pb.authStore.record;
}

export function isLoggedIn() {
  return pb.authStore.isValid;
}

// Utilisateur connecté avec la relation avatar expandée
// Triple fallback pour garantir l'affichage de l'avatar
export async function getCurrentUserWithAvatar() {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    // 1️ Essai principal : getOne avec expand
    const fullUser = await pb.collection("users").getOne(user.id, { expand: "avatar" });

    // 2️ Expand absent mais avatar ID présent → fetch direct
    if (!fullUser.expand?.avatar && fullUser.avatar) {
      try {
        const avatarRecord = await pb.collection("avatars").getOne(fullUser.avatar);
        fullUser.expand = { avatar: avatarRecord };
      } catch {
        // ignore
      }
    }
    return fullUser;
  } catch {
    // 3️ getOne a échoué → utiliser authStore + fetch avatar par ID
    const avatarId = user?.avatar;
    if (avatarId) {
      try {
        const avatarRecord = await pb.collection("avatars").getOne(avatarId);
        return { ...user, expand: { avatar: avatarRecord } };
      } catch {
        // ignore
      }
    }
    return user;
  }
}

export async function updateUser(data) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non connecté");
  return await pb.collection("users").update(user.id, data);
}

// ── Avatars ───────────────────────────────────────────────────────────────

// Récupère tous les avatars actifs de la collection avatars
export async function getAvatars() {
  return await pb.collection("avatars").getFullList({
    filter: "actif = true",
    sort: "nom",
  });
}

// Met à jour la relation avatar et rafraîchit le authStore (pour que le localStorage soit à jour)
export async function updateUserAvatar(userId, avatarId) {
  const result = await pb.collection("users").update(userId, { avatar: avatarId });
  // Critique : sans authRefresh, pb.authStore.model garde l'ancien avatar après refresh
  try {
    await pb.collection("users").authRefresh();
  } catch {
    // ignore si authRefresh échoue
  }
  return result;
}

// Construit l'URL de l'image d'un record de la collection avatars
export function getAvatarImageUrl(avatarRecord) {
  if (!avatarRecord?.image) return null;
  return pb.files.getURL(avatarRecord, avatarRecord.image);
}

// Met à jour pseudo, email et âge de l'utilisateur connecté
export async function updateUserProfile({ pseudo, email, age }) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non connecté");
  return await pb.collection("users").update(user.id, {
    pseudo,
    email,
    age: parseInt(age),
  });
}

// ── Mini-jeux ─────────────────────────────────────────────────────────────

export async function getJeux() {
  return await pb.collection("jeux").getFullList({ filter: "actif = true", sort: "titre" });
}

export async function getJeuBySlug(slug) {
  const all = await pb.collection("jeux").getFullList({ filter: `actif = true && slug = "${slug}"` });
  return all[0] ?? null;
}

// Questions d'un jeu (mélangées, limitées au niveau)
// Filtrage JS côté client pour éviter les problèmes de filtre multi-relation PocketBase
export async function getQuestionsJeu(jeuId, limit = 15) {
  // Charger toutes les questions actives puis filtrer en JS
  let all = [];
  try {
    all = await pb.collection("questions_jeux").getFullList({
      filter: "actif = true",
      expand: "signe",
    });
  } catch {
    // Fallback sans filtre actif
    all = await pb.collection("questions_jeux").getFullList({ expand: "signe" });
  }

  // Filtrer : la relation jeu contient jeuId (mono ou multi-valeur)
  const filtered = all.filter(q => {
    const jeux = Array.isArray(q.jeu) ? q.jeu : [q.jeu];
    return jeux.includes(jeuId);
  });

  // Fallback : si aucune correspondance, utiliser toutes les questions
  const pool = filtered.length > 0 ? filtered : all;

  // Si le pool est plus petit que la limite, répéter les questions (mélangées à chaque cycle)
  const result = [];
  while (result.length < limit) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    result.push(...shuffled);
  }
  return result.slice(0, limit);
}

// Sauvegarder un score
export async function saveScore({ utilisateur, jeu, niveau, nombre_mots, score, temps_secondes }) {
  return await pb.collection("scores").create({
    utilisateur, jeu, niveau, nombre_mots, score, temps_secondes,
    date_partie: new Date().toISOString(),
  });
}

// Classement d'un jeu + niveau
export async function getClassement(jeuId, niveau, limit = 10) {
  try {
    const all = await pb.collection("scores").getFullList({
      filter: `jeu ?= "${jeuId}" && niveau = "${niveau}"`,
      sort: "-score,+temps_secondes",
      expand: "utilisateur",
    });
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

// Signes actifs aléatoires pour les jeux — sans répétition
export async function getSignesForGame(limit = 15, categorieId = null) {
  try {
    let filter = "actif = true";
    if (categorieId) filter += ` && categorie = "${categorieId}"`;
    const all = await pb.collection("signes").getFullList({ filter });
    // Pas de répétition : on prend au maximum ce qui est disponible
    return all.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, all.length));
  } catch {
    const all = await pb.collection("signes").getFullList();
    const filtered = categorieId ? all.filter(s => s.categorie === categorieId) : all;
    return filtered.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, filtered.length));
  }
}

// Récupère l'ID de la catégorie "Les bases"
export async function getCategorieLesBases() {
  try {
    const cats = await pb.collection("categories").getFullList();
    return cats.find(c => c.titre?.toLowerCase().includes("base"))?.id ?? null;
  } catch { return null; }
}

// ── Histoires ─────────────────────────────────────────────────────────────

export async function getHistoires() {
  return await pb.collection("histoires").getFullList({ sort: "ordre" });
}

export async function getHistoireById(id) {
  return await pb.collection("histoires").getOne(id);
}

export async function getPagesByHistoire(histoireId) {
  return await pb.collection("pages_histoires").getFullList({
    filter: `histoire = "${histoireId}"`,
    sort: "ordre",
  });
}

export function getCouvertureUrl(histoire) {
  if (!histoire?.couverture) return null;
  return pb.files.getURL(histoire, histoire.couverture);
}

export function getPageImageUrl(page) {
  if (!page?.image) return null;
  return pb.files.getURL(page, page.image);
}

// ── Dictionnaire ─────────────────────────────────────────────────────────

export async function getCategories() {
  return await pb.collection("categories").getFullList({ sort: "titre" });
}

export async function getSignes() {
  return await pb.collection("signes").getFullList({
    filter: "actif = true",
    sort: "mot",
  });
}

export async function getSignesByCategorie(categorieId) {
  // Essai avec filtre actif, fallback sans si le champ n'existe pas
  try {
    return await pb.collection("signes").getFullList({
      filter: `actif = true && categorie = "${categorieId}"`,
      sort: "mot",
    });
  } catch {
    const all = await pb.collection("signes").getFullList({ sort: "mot" });
    return all.filter(s => s.categorie === categorieId);
  }
}

export async function getSigneById(id) {
  // Sans expand pour éviter les erreurs de permissions sur la relation
  return await pb.collection("signes").getOne(id);
}

export function getSigneVideoUrl(signe) {
  if (!signe?.video) return null;
  return pb.files.getURL(signe, signe.video);
}

// ── Leçons ───────────────────────────────────────────────────────────────

export async function getLecons() {
  return await pb.collection("lecons").getFullList({ sort: "ordre" });
}

export async function getLeconById(id) {
  return await pb.collection("lecons").getOne(id);
}

export function getLeconImageUrl(lecon) {
  if (!lecon?.image) return null;
  return pb.files.getURL(lecon, lecon.image);
}

// Signes d'une leçon via lecon_signes, triés par ordre
export async function getSignesByLecon(leconId) {
  const items = await pb.collection("lecon_signes").getFullList({
    filter: `lecon = "${leconId}"`,
    sort: "ordre",
    expand: "signe",
  });
  return items.map(i => i.expand?.signe).filter(Boolean);
}

export function getSigneImageUrl(signe) {
  if (!signe?.image) return null;
  return pb.files.getURL(signe, signe.image);
}

// ── Progression ──────────────────────────────────────────────────────────

export async function getProgressionByUser(userId) {
  return await pb.collection("progression").getFullList({
    filter: `utilisateur = "${userId}"`,
  });
}

// Crée ou met à jour la progression d'un utilisateur pour une leçon
export async function saveProgression({ utilisateur, lecon, termine, etoiles, score }) {
  try {
    const existing = await pb.collection("progression").getFirstListItem(
      `utilisateur = "${utilisateur}" && lecon = "${lecon}"`
    );
    return await pb.collection("progression").update(existing.id, {
      termine, etoiles, score,
    });
  } catch {
    return await pb.collection("progression").create({
      utilisateur, lecon, termine, etoiles, score,
    });
  }
}

// 3 mauvaises réponses aléatoires (exclut le signe correct)
export async function getRandomWrongAnswers(correctSigneId, count = 3) {
  const all = await pb.collection("signes").getFullList({ fields: "id,mot" });
  const others = all.filter(s => s.id !== correctSigneId);
  return others.sort(() => Math.random() - 0.5).slice(0, count);
}

// Questions du quiz de leçon (jeu.type = "quiz")
// Approche en 2 étapes pour éviter les problèmes de filtre PocketBase sur relations
export async function getQuestionsQuiz(leconId) {
  try {
    // Étape 1 : trouver l'ID du jeu de type "quiz"
    const jeux = await pb.collection("jeux").getFullList({
      filter: `actif = true && (type = "quiz" || slug = "Quiz")`,
    });
    const quizJeuId = jeux[0]?.id;

    if (!quizJeuId) {
      console.warn("[ZOZZO] Aucun jeu de type quiz trouvé");
      return [];
    }

    // Étape 2 : récupérer les questions de ce jeu avec le signe expandé
    // jeu ?= "id" → opérateur "any" pour les champs multi-relation
    const questions = await pb.collection("questions_jeux").getFullList({
      filter: `actif = true && jeu ?= "${quizJeuId}"`,
      expand: "signe",
      sort: "created",
    });

    if (!leconId || !questions.length) return questions;

    // Étape 3 : filtrer par les signes de la leçon (optionnel — fallback sur tout)
    try {
      const leconSignes = await pb.collection("lecon_signes").getFullList({
        filter: `lecon = "${leconId}"`,
        fields: "signe",
      });
      if (leconSignes.length) {
        const signeIds = new Set(leconSignes.map(ls => ls.signe).filter(Boolean));
        const filtered  = questions.filter(q => signeIds.has(q.signe));
        if (filtered.length) return filtered;
      }
    } catch { /* non bloquant */ }

    return questions; // fallback : toutes les questions du quiz
  } catch (e) {
    console.error("[ZOZZO] getQuestionsQuiz :", e);
    return [];
  }
}
