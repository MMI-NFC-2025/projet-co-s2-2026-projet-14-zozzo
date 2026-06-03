// ── Relis-tout ────────────────────────────────────────────────────────────

import { pb } from "../backend.js";

// ID de la catégorie "Les bases" (filtrage des signes pour le jeu)
export async function getCategorieLesBases() {
  try {
    const cats = await pb.collection("categories").getFullList();
    return cats.find(c => c.titre?.toLowerCase().includes("base"))?.id ?? null;
  } catch { return null; }
}

// Signes actifs aléatoires pour le jeu, sans répétition
export async function getSignesForGame(limit = 15, categorieId = null) {
  try {
    let filter = "actif = true";
    if (categorieId) filter += ` && categorie = "${categorieId}"`;
    const all = await pb.collection("signes").getFullList({ filter });
    return all.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, all.length));
  } catch {
    const all = await pb.collection("signes").getFullList();
    const filtered = categorieId ? all.filter(s => s.categorie === categorieId) : all;
    return filtered.sort(() => Math.random() - 0.5).slice(0, Math.min(limit, filtered.length));
  }
}
