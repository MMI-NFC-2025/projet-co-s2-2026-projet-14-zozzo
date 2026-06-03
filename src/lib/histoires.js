// ── Histoires LSF ─────────────────────────────────────────────────────────

import { pb } from "./backend.js";

export async function getHistoires() {
  return await pb.collection("histoires").getFullList({ sort: "ordre" });
}

export async function getHistoireById(id) {
  return await pb.collection("histoires").getOne(id);
}

// Pages d'une histoire, triées par ordre
export async function getPagesByHistoire(histoireId) {
  return await pb.collection("pages_histoires").getFullList({
    filter: `histoire = "${histoireId}"`,
    sort: "ordre",
  });
}

// URL de la couverture d'une histoire
export function getCouvertureUrl(histoire) {
  if (!histoire?.couverture) return null;
  return pb.files.getURL(histoire, histoire.couverture);
}

// URL de l'image d'une page
export function getPageImageUrl(page) {
  if (!page?.image) return null;
  return pb.files.getURL(page, page.image);
}
