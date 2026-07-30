/* Envoi de la fiche du jour.

   Deux modes, réglés par la variable d'environnement MODE_ENVOI :

   - "drip" (défaut) : chaque abonné reçoit la fiche 001 le lendemain de son
     inscription, puis la 002, etc. Envoi individuel par l'API transactionnelle.
     Tout le monde suit la progression dans l'ordre.

   - "campagne" : tout le monde reçoit la même fiche le même jour, choisie
     par la date. Un seul appel, campagne Brevo classique.
*/

import { emailHtml, indexDuJour, dateLongue, sujetEmail, adresseReponse } from "./email.js";
import { listerAbonnes, jourDeParcours, lienDesinscription, envoyerUn } from "./abonnes.js";

function config() {
  const c = {
    cleBrevo: process.env.BREVO_API_KEY,
    listId: Number(process.env.BREVO_LIST_ID),
    urlSite: (process.env.SITE_URL || "").replace(/\/$/, ""),
    senderEmail: process.env.SENDER_EMAIL,
    senderName: process.env.SENDER_NAME || "Fiche fiscale",
    secret: process.env.UNSUB_SECRET || process.env.TEST_TOKEN,
    mode: (process.env.MODE_ENVOI || "drip").toLowerCase(),
  };
  const manquantes = [];
  if (!c.cleBrevo) manquantes.push("BREVO_API_KEY");
  if (!c.listId) manquantes.push("BREVO_LIST_ID");
  if (!c.urlSite) manquantes.push("SITE_URL");
  if (!c.senderEmail) manquantes.push("SENDER_EMAIL");
  if (!c.secret) manquantes.push("UNSUB_SECRET ou TEST_TOKEN");
  c.manquantes = manquantes;
  return c;
}

async function chargerFiches(urlSite) {
  const res = await fetch(`${urlSite}/fiches.json`);
  if (!res.ok) throw new Error(`fiches.json inaccessible (${res.status})`);
  const { fiches } = await res.json();
  if (!Array.isArray(fiches) || !fiches.length) throw new Error("fiches.json vide ou mal formé");
  return fiches;
}

export async function envoyerFicheDuJour({ brouillon = false, cible = null } = {}) {
  const c = config();
  if (c.manquantes.length) {
    return { ok: false, message: `Variables manquantes : ${c.manquantes.join(", ")}` };
  }

  try {
    const fiches = await chargerFiches(c.urlSite);
    return c.mode === "campagne"
      ? await envoiCampagne(c, fiches, brouillon)
      : await envoiIndividuel(c, fiches, cible);
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/* ---------- mode drip : un email par abonné, selon son ancienneté ---------- */
async function envoiIndividuel(c, fiches, cible) {
  const maintenant = new Date();
  const dateStr = dateLongue(maintenant);
  const abonnes = await listerAbonnes(c.cleBrevo, c.listId);

  let envoyes = 0;
  let termines = 0;
  let ignores = 0;
  const erreurs = [];

  for (const contact of abonnes) {
    const email = contact.email;
    if (cible && email.toLowerCase() !== cible.toLowerCase()) continue;

    const jour = jourDeParcours(contact, maintenant);
    if (jour === null || jour < 1) {
      ignores++;
      continue;
    }
    if (jour > fiches.length) {
      termines++;
      continue;
    }

    const fiche = fiches[jour - 1];
    const lienDesabo = lienDesinscription(email, c.urlSite, c.secret);
    const html = emailHtml(fiche, c.urlSite, dateStr, maintenant, lienDesabo);

    try {
      await envoyerUn({
        cleBrevo: c.cleBrevo,
        senderName: c.senderName,
        senderEmail: c.senderEmail,
        replyTo: adresseReponse(),
        email,
        sujet: sujetEmail(fiche),
        html,
        lienDesabo,
      });
      envoyes++;
    } catch (e) {
      erreurs.push(`${email} : ${e.message}`);
    }
  }

  const resume =
    `Mode drip. ${envoyes} envoyé(s), ${ignores} pas encore commencé(s), ` +
    `${termines} série terminée, ${erreurs.length} erreur(s).` +
    (erreurs.length ? ` Détail : ${erreurs.slice(0, 3).join(" | ")}` : "");

  return { ok: erreurs.length === 0, message: resume };
}

/* ---------- mode campagne : la même fiche pour tous ---------- */
async function envoiCampagne(c, fiches, brouillon) {
  const maintenant = new Date();
  const dateStr = dateLongue(maintenant);
  const fiche = fiches[indexDuJour(fiches.length, maintenant)];

  const creation = await fetch("https://api.brevo.com/v3/emailCampaigns", {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": c.cleBrevo },
    body: JSON.stringify({
      name: `Fiche ${dateStr} : ${fiche.titre}`.slice(0, 100),
      subject: sujetEmail(fiche),
      sender: { name: c.senderName, email: c.senderEmail },
      replyTo: adresseReponse() || c.senderEmail,
      htmlContent: emailHtml(fiche, c.urlSite, dateStr, maintenant),
      recipients: { listIds: [c.listId] },
    }),
  });

  if (!creation.ok) {
    return {
      ok: false,
      message: `Création de campagne refusée (${creation.status}) : ${(await creation.text()).slice(0, 300)}`,
    };
  }

  const { id } = await creation.json();

  if (brouillon) {
    return { ok: true, message: `Brouillon ${id} créé dans Brevo, fiche ${fiche.id} : ${fiche.titre}` };
  }

  const envoi = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}/sendNow`, {
    method: "POST",
    headers: { "api-key": c.cleBrevo },
  });

  if (!envoi.ok) {
    return { ok: false, message: `Envoi refusé (${envoi.status}) : ${(await envoi.text()).slice(0, 300)}` };
  }

  return { ok: true, message: `Campagne ${id} envoyée, fiche ${fiche.id} : ${fiche.titre}` };
}
