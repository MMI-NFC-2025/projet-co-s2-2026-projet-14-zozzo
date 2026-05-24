import PocketBase from "pocketbase";

// ⚠️ Remplacer par l'URL de votre instance PocketBase (ex: https://votre-domaine.com)
export const pb = new PocketBase("http://127.0.0.1:8090");

// Connexion avec email + mot de passe
export async function login(email, password) {
  return await pb.collection("users").authWithPassword(email, password);
}

// Inscription d'un nouvel utilisateur
export async function register({ email, password, passwordConfirm, pseudo, age }) {
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
  });
  // Connexion automatique après inscription
  return await pb.collection("users").authWithPassword(email, password);
}

// Déconnexion
export function logout() {
  pb.authStore.clear();
}

// Retourne l'utilisateur connecté (ou null)
export function getCurrentUser() {
  return pb.authStore.model;
}

// Vérifie si le token est valide (utilisateur connecté)
export function isLoggedIn() {
  return pb.authStore.isValid;
}

// Mettre à jour les données du profil
export async function updateUser(data) {
  const user = getCurrentUser();
  if (!user) throw new Error("Non connecté");
  const updated = await pb.collection("users").update(user.id, data);
  return updated;
}

// Construire l'URL de l'avatar
export function getAvatarUrl(user) {
  if (!user?.avatar) return null;
  return pb.getFileUrl(user, user.avatar, { thumb: "200x200" });
}
