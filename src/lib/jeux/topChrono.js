// ── Top Chrono ────────────────────────────────────────────────────────────

import { pb } from "../backend.js";

// Tous les jeux actifs
export async function getJeux() {
  return await pb.collection("jeux").getFullList({ filter: "actif = true", sort: "titre" });
}

// Un jeu par slug
export async function getJeuBySlug(slug) {
  const all = await pb.collection("jeux").getFullList({ filter: `actif = true && slug = "${slug}"` });
  return all[0] ?? null;
}

// Questions d'un jeu (mélangées, limitées au niveau)
// Filtrage JS pour gérer les champs multi-relation PocketBase
export async function getQuestionsJeu(jeuId, limit = 15) {
  let all = [];
  try {
    all = await pb.collection("questions_jeux").getFullList({
      filter: "actif = true",
      expand: "signe",
    });
  } catch {
    all = await pb.collection("questions_jeux").getFullList({ expand: "signe" });
  }

  // Filtrer par jeuId (mono ou multi-valeur)
  const filtered = all.filter(q => {
    const jeux = Array.isArray(q.jeu) ? q.jeu : [q.jeu];
    return jeux.includes(jeuId);
  });

  const pool = filtered.length > 0 ? filtered : all;

  // Répéter si le pool est plus petit que la limite
  const result = [];
  while (result.length < limit) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    result.push(...shuffled);
  }
  return result.slice(0, limit);
}
