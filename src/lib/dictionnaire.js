// ── Dictionnaire des signes LSF ───────────────────────────────────────────

import { pb } from "./backend.js";

// Toutes les catégories
export async function getCategories() {
  return await pb.collection("categories").getFullList({ sort: "titre" });
}

// Tous les signes actifs
export async function getSignes() {
  return await pb.collection("signes").getFullList({
    filter: "actif = true",
    sort: "mot",
  });
}

// Signes d'une catégorie (avec fallback sans filtre actif)
export async function getSignesByCategorie(categorieId) {
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

// Signe par ID (sans expand pour éviter les erreurs de permissions)
export async function getSigneById(id) {
  return await pb.collection("signes").getOne(id);
}
// getSigneImageUrl et getSigneVideoUrl → src/lib/utils.js (source unique)
