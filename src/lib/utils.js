// ── Utilitaires généraux ZOZZO ────────────────────────────────────────────

import { pb } from "./backend.js";

// Construire l'URL d'un fichier PocketBase depuis un record et son champ
export function getFileUrl(record, field) {
  if (!record || !field) return null;
  return pb.files.getURL(record, field);
}

// Formater des secondes en "X min Y s" ou "Y s"
export function formatTime(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

// Mélanger un tableau (Fisher-Yates)
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
