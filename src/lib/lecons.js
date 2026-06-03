// ── Leçons LSF ────────────────────────────────────────────────────────────

import { pb } from "./backend.js";

// ── Leçons ────────────────────────────────────────────────────────────────

export async function getLecons() {
  return await pb.collection("lecons").getFullList({ sort: "ordre" });
}

export async function getLeconById(id) {
  return await pb.collection("lecons").getOne(id);
}

export function getLeconImageUrl(lecon) {
  if (!lecon?.image) return null;
  return pb.files.getURL(lecon, lecon.image);
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

// ── Progression ───────────────────────────────────────────────────────────

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
    return await pb.collection("progression").update(existing.id, { termine, etoiles, score });
  } catch {
    return await pb.collection("progression").create({ utilisateur, lecon, termine, etoiles, score });
  }
}

// ── Quiz de leçon ─────────────────────────────────────────────────────────

// 3 mauvaises réponses aléatoires (exclut le signe correct)
export async function getRandomWrongAnswers(correctSigneId, count = 3) {
  const all = await pb.collection("signes").getFullList({ fields: "id,mot" });
  const others = all.filter(s => s.id !== correctSigneId);
  return others.sort(() => Math.random() - 0.5).slice(0, count);
}

// Questions du quiz lié à une leçon (jeu.type = "quiz")
export async function getQuestionsQuiz(leconId) {
  try {
    const jeux = await pb.collection("jeux").getFullList({
      filter: `actif = true && (type = "quiz" || slug = "Quiz")`,
    });
    const quizJeuId = jeux[0]?.id;
    if (!quizJeuId) return [];

    const questions = await pb.collection("questions_jeux").getFullList({
      filter: `actif = true && jeu ?= "${quizJeuId}"`,
      expand: "signe",
      sort: "created",
    });

    if (!leconId || !questions.length) return questions;

    try {
      const leconSignes = await pb.collection("lecon_signes").getFullList({
        filter: `lecon = "${leconId}"`, fields: "signe",
      });
      if (leconSignes.length) {
        const signeIds = new Set(leconSignes.map(ls => ls.signe).filter(Boolean));
        const filtered = questions.filter(q => signeIds.has(q.signe));
        if (filtered.length) return filtered;
      }
    } catch { /* non bloquant */ }

    return questions;
  } catch (e) {
    console.error("[ZOZZO] getQuestionsQuiz :", e);
    return [];
  }
}
