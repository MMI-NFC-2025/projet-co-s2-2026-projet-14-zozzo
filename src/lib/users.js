// ── Gestion des avatars utilisateurs ─────────────────────────────────────

import { pb } from "./backend.js";

// Récupère tous les avatars actifs
export async function getAvatars() {
  return await pb.collection("avatars").getFullList({
    filter: "actif = true",
    sort: "nom",
  });
}

// Met à jour la relation avatar et rafraîchit le authStore
export async function updateUserAvatar(userId, avatarId) {
  const result = await pb.collection("users").update(userId, { avatar: avatarId });
  try {
    await pb.collection("users").authRefresh();
  } catch { /* ignore */ }
  return result;
}

// Construit l'URL de l'image d'un record avatar
export function getAvatarImageUrl(avatarRecord) {
  if (!avatarRecord?.image) return null;
  return pb.files.getURL(avatarRecord, avatarRecord.image);
}
