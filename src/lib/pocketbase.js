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
  return pb.authStore.model;
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
  return pb.getFileUrl(avatarRecord, avatarRecord.image);
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

// ── Leçons ───────────────────────────────────────────────────────────────

export async function getLecons() {
  return await pb.collection("lecons").getFullList({ sort: "ordre" });
}

export async function getLeconById(id) {
  return await pb.collection("lecons").getOne(id);
}

export function getLeconImageUrl(lecon) {
  if (!lecon?.image) return null;
  return pb.getFileUrl(lecon, lecon.image);
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
  return pb.getFileUrl(signe, signe.image);
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
