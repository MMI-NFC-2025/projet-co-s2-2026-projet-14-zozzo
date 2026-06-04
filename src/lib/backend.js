import PocketBase from "pocketbase";

export const pb = new PocketBase("https://api.zozzo.fr");

// ── Re-exports centralisés ────────────────────────────────────────────────
// Toutes les pages continuent d'importer depuis backend.js — rien ne casse.

// utils.js
export { getFileUrl, formatTime, shuffleArray, getSigneImageUrl, getSigneVideoUrl } from "./utils.js";

// auth.js
export {
  requireAuth, isAuthenticated, isLoggedIn,
  login, register, logout,
  getCurrentUser, getCurrentUserWithAvatar,
  updateUser, updateUserProfile,
} from "./auth.js";

// users.js
export { getAvatars, updateUserAvatar, getAvatarImageUrl } from "./users.js";

// lecons.js
export {
  getLecons, getLeconById, getLeconImageUrl,
  getSignesByLecon,
  getProgressionByUser, saveProgression,
  getRandomWrongAnswers, getQuestionsQuiz,
} from "./lecons.js";

// dictionnaire.js
export { getCategories, getSignes, getSignesByCategorie, getSigneById } from "./dictionnaire.js";

// histoires.js
export { getHistoires, getHistoireById, getPagesByHistoire, getCouvertureUrl, getPageImageUrl } from "./histoires.js";

// scores.js
export { saveScore, getClassement } from "./scores.js";

// jeux/topChrono.js
export { getJeux, getJeuBySlug, getQuestionsJeu } from "./jeux/topChrono.js";

// jeux/relisTout.js
export { getCategorieLesBases, getSignesForGame } from "./jeux/relisTout.js";

// jeux/reconsti.js
export { getPhrasesByNiveau, getAllPhrasesJeux, getSignesByMots } from "./jeux/reconsti.js";

