import PocketBase from "pocketbase";

export const pb = new PocketBase("http://127.0.0.1:8090");

// ── Re-exports depuis les fichiers organisés ──────────────────────────────
// Les pages importent toujours depuis backend.js — rien ne casse.

export {
  getFileUrl,
  formatTime,
  shuffleArray,
} from "./utils.js";

export {
  login,
  register,
  logout,
  getCurrentUser,
  isLoggedIn,
  getCurrentUserWithAvatar,
  updateUser,
  updateUserProfile,
} from "./auth.js";

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
      expand: "utilisateur,utilisateur.avatar",
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

// ── Reconsti ──────────────────────────────────────────────────────────────

// Phrases actives par niveau (facile / moyen / difficile)
export async function getPhrasesByNiveau(niveau) {
  try {
    return await pb.collection("phrases_jeux").getFullList({
      filter: `actif = true && niveau = "${niveau}"`,
    });
  } catch {
    const all = await pb.collection("phrases_jeux").getFullList();
    return all.filter(p => p.actif && p.niveau === niveau);
  }
}

// Toutes les phrases actives triées : facile → moyen → difficile
export async function getAllPhrasesJeux() {
  const ORDER = { facile: 0, moyen: 1, difficile: 2 };
  try {
    const all = await pb.collection("phrases_jeux").getFullList({
      filter: "actif = true",
    });
    return all.sort((a, b) => (ORDER[a.niveau] ?? 9) - (ORDER[b.niveau] ?? 9));
  } catch {
    const all = await pb.collection("phrases_jeux").getFullList();
    return all
      .filter(p => p.actif)
      .sort((a, b) => (ORDER[a.niveau] ?? 9) - (ORDER[b.niveau] ?? 9));
  }
}

// Signes correspondant à une liste de mots (depuis phrases_jeux.mots)
export async function getSignesByMots(mots) {
  // Charger TOUS les signes (avec et sans filtre actif pour maximiser les correspondances)
  let all = [];
  try {
    all = await pb.collection("signes").getFullList({ filter: "actif = true" });
  } catch {
    try {
      all = await pb.collection("signes").getFullList();
    } catch (e) {
      console.error("[Reconsti] Impossible de charger les signes :", e);
      return mots.map(mot => ({ id: `nf_${mot}`, mot, image: null, video: null }));
    }
  }

  return mots.map(mot => {
    // Comparaison exacte puis insensible à la casse
    const found = all.find(s => s.mot === mot)
               ?? all.find(s => s.mot?.toLowerCase() === mot?.toLowerCase())
               ?? all.find(s => s.mot?.toLowerCase().trim() === mot?.toLowerCase().trim());

    if (!found) {
      console.warn(`[Reconsti] Signe introuvable pour : "${mot}"`);
    }
    // Ne jamais retourner un placeholder avec image:null si on veut des vraies images
    return found ?? { id: `nf_${mot}`, mot, image: null, video: null };
  });
}
