// ── Scores et classements ─────────────────────────────────────────────────

import { pb } from "./backend.js";

// Sauvegarder un score après une partie
export async function saveScore({ utilisateur, jeu, niveau, nombre_mots, score, temps_secondes }) {
  return await pb.collection("scores").create({
    utilisateur, jeu, niveau, nombre_mots, score, temps_secondes,
    date_partie: new Date().toISOString(),
  });
}

// Classement d'un jeu pour un niveau donné (score DESC, temps ASC)
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
