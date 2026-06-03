// ── Authentification ZOZZO ────────────────────────────────────────────────

import { pb } from "./backend.js";

// Connexion avec email + mot de passe
export async function login(email, password) {
  return await pb.collection("users").authWithPassword(email, password);
}

// Inscription — crée le compte puis connecte automatiquement
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

// Déconnexion
export function logout() {
  pb.authStore.clear();
}

// Utilisateur connecté (depuis le authStore local)
export function getCurrentUser() {
  return pb.authStore.record;
}

// Vérifie si le token est valide
export function isLoggedIn() {
  return pb.authStore.isValid;
}

// Utilisateur connecté avec son avatar expandé (triple fallback)
export async function getCurrentUserWithAvatar() {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    const fullUser = await pb.collection("users").getOne(user.id, { expand: "avatar" });

    if (!fullUser.expand?.avatar && fullUser.avatar) {
      try {
        const avatarRecord = await pb.collection("avatars").getOne(fullUser.avatar);
        fullUser.expand = { avatar: avatarRecord };
      } catch { /* ignore */ }
    }
    return fullUser;
  } catch {
    const avatarId = user?.avatar;
    if (avatarId) {
      try {
        const avatarRecord = await pb.collection("avatars").getOne(avatarId);
        return { ...user, expand: { avatar: avatarRecord } };
      } catch { /* ignore */ }
    }
    return user;
  }
}

// Mettre à jour les données brutes de l'utilisateur connecté
export async function updateUser(data) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non connecté");
  return await pb.collection("users").update(user.id, data);
}

// Mettre à jour pseudo, email et âge
export async function updateUserProfile({ pseudo, email, age }) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non connecté");
  return await pb.collection("users").update(user.id, {
    pseudo,
    email,
    age: parseInt(age),
  });
}
