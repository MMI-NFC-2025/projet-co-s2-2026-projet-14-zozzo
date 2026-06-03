// ── Reconsti ──────────────────────────────────────────────────────────────

import { pb } from "../backend.js";

// Phrases actives par niveau : facile / moyen / difficile
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
    const all = await pb.collection("phrases_jeux").getFullList({ filter: "actif = true" });
    return all.sort((a, b) => (ORDER[a.niveau] ?? 9) - (ORDER[b.niveau] ?? 9));
  } catch {
    const all = await pb.collection("phrases_jeux").getFullList();
    return all.filter(p => p.actif).sort((a, b) => (ORDER[a.niveau] ?? 9) - (ORDER[b.niveau] ?? 9));
  }
}

// Signes correspondant aux mots d'une phrase (depuis phrases_jeux.mots)
export async function getSignesByMots(mots) {
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
    const found = all.find(s => s.mot === mot)
               ?? all.find(s => s.mot?.toLowerCase() === mot?.toLowerCase())
               ?? all.find(s => s.mot?.toLowerCase().trim() === mot?.toLowerCase().trim());

    if (!found) console.warn(`[Reconsti] Signe introuvable pour : "${mot}"`);
    return found ?? { id: `nf_${mot}`, mot, image: null, video: null };
  });
}
