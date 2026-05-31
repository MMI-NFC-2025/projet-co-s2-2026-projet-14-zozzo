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
export async function getCurrentUserWithAvatar() {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    return await pb.collection("users").getOne(user.id, { expand: "avatar" });
  } catch {
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

// Met à jour la relation avatar de l'utilisateur
export async function updateUserAvatar(userId, avatarId) {
  return await pb.collection("users").update(userId, { avatar: avatarId });
}

// Construit l'URL de l'image d'un record de la collection avatars
export function getAvatarImageUrl(avatarRecord) {
  if (!avatarRecord?.image) return null;
  return pb.getFileUrl(avatarRecord, avatarRecord.image);
}
