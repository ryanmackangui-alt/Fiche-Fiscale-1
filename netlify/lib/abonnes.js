/* Récupération des abonnés Brevo et calcul de leur avancement dans la série. */

import { createHmac } from "node:crypto";

const API = "https://api.brevo.com/v3";

/* Date de Paris au format AAAA-MM-JJ, quel que soit le fuseau du serveur. */
function jourParis(date) {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function enJours(iso) {
  const [a, m, j] = jourParis(new Date(iso)).split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86400000);
}

/* Nombre de jours écoulés depuis l'inscription.
   1 le lendemain de l'inscription, 2 le surlendemain, etc. */
export function jourDeParcours(contact, maintenant = new Date()) {
  const brut =
    (contact.attributes && (contact.attributes.CONSENTEMENT || contact.attributes.consentement)) ||
    contact.createdAt;
  if (!brut) return null;
  const debut = enJours(brut);
  const aujourdhui = enJours(maintenant);
  if (Number.isNaN(debut)) return null;
  return aujourdhui - debut;
}

/* Tous les contacts de la liste, désinscrits exclus. */
export async function listerAbonnes(cleBrevo, listId) {
  const abonnes = [];
  let offset = 0;
  const limit = 500;

  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${API}/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { "api-key": cleBrevo, accept: "application/json" } }
    );
    if (!res.ok) {
      throw new Error(`Lecture de la liste refusée (${res.status}) : ${(await res.text()).slice(0, 200)}`);
    }
    const data = await res.json();
    const lot = data.contacts || [];
    abonnes.push(...lot.filter((c) => !c.emailBlacklisted));
    if (lot.length < limit) break;
    offset += limit;
  }

  return abonnes;
}

/* Signature du lien de désinscription : personne ne peut désinscrire
   quelqu'un d'autre en devinant une URL. */
export function signer(email, secret) {
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 20);
}

export function lienDesinscription(email, urlSite, secret) {
  const e = encodeURIComponent(email);
  return `${urlSite}/api/desinscription?e=${e}&s=${signer(email, secret)}`;
}

/* Envoi individuel par l'API transactionnelle. */
export async function envoyerUn({ cleBrevo, senderName, senderEmail, replyTo, email, sujet, html, lienDesabo }) {
  const res = await fetch(`${API}/smtp/email`, {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": cleBrevo },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      replyTo: { email: replyTo || senderEmail },
      subject: sujet,
      htmlContent: html,
      headers: {
        "List-Unsubscribe": `<${lienDesabo}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`${res.status} : ${(await res.text()).slice(0, 160)}`);
  }
  return true;
}

/* Passage d'un contact en désinscrit. */
export async function desinscrire(cleBrevo, email) {
  const res = await fetch(`${API}/contacts/${encodeURIComponent(email)}`, {
    method: "PUT",
    headers: { "content-type": "application/json", "api-key": cleBrevo },
    body: JSON.stringify({ emailBlacklisted: true }),
  });
  return res.ok || res.status === 204;
}
