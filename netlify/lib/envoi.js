/* Envoi de la fiche du jour via Brevo. Utilisé par la fonction planifiée
   et par la fonction de test manuel. */

import { emailHtml, indexDuJour, dateLongue, sujetEmail, adresseReponse } from "./email.js";

export async function envoyerFicheDuJour({ brouillon = false } = {}) {
  const cleBrevo = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  const urlSite = process.env.SITE_URL;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || "Fiche fiscale";

  const manquantes = [];
  if (!cleBrevo) manquantes.push("BREVO_API_KEY");
  if (!listId) manquantes.push("BREVO_LIST_ID");
  if (!urlSite) manquantes.push("SITE_URL");
  if (!senderEmail) manquantes.push("SENDER_EMAIL");
  if (manquantes.length) {
    return { ok: false, message: `Variables manquantes : ${manquantes.join(", ")}` };
  }

  const res = await fetch(`${urlSite}/fiches.json`);
  if (!res.ok) return { ok: false, message: `fiches.json inaccessible (${res.status})` };

  const { fiches } = await res.json();
  if (!Array.isArray(fiches) || !fiches.length) {
    return { ok: false, message: "fiches.json vide ou mal formé" };
  }

  const fiche = fiches[indexDuJour(fiches.length)];
  const dateStr = dateLongue();

  const creation = await fetch("https://api.brevo.com/v3/emailCampaigns", {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": cleBrevo },
    body: JSON.stringify({
      name: `Fiche ${dateStr} : ${fiche.titre}`.slice(0, 100),
      subject: sujetEmail(fiche),
      sender: { name: senderName, email: senderEmail },
      replyTo: adresseReponse() || senderEmail,
      htmlContent: emailHtml(fiche, urlSite, dateStr),
      recipients: { listIds: [listId] },
    }),
  });

  if (!creation.ok) {
    const detail = (await creation.text()).slice(0, 300);
    return { ok: false, message: `Création de campagne refusée (${creation.status}) : ${detail}` };
  }

  const { id } = await creation.json();

  if (brouillon) {
    return { ok: true, message: `Brouillon ${id} créé dans Brevo, fiche ${fiche.id} : ${fiche.titre}` };
  }

  const envoi = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}/sendNow`, {
    method: "POST",
    headers: { "api-key": cleBrevo },
  });

  if (!envoi.ok) {
    const detail = (await envoi.text()).slice(0, 300);
    return { ok: false, message: `Envoi refusé (${envoi.status}) : ${detail}` };
  }

  return { ok: true, message: `Campagne ${id} envoyée, fiche ${fiche.id} : ${fiche.titre}` };
}
