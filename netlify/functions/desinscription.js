/* Désinscription en un clic, appelée depuis le lien en pied d'email
   et par l'en-tête List-Unsubscribe des messageries. */

import { signer, desinscrire } from "../lib/abonnes.js";

const PAGE = (titre, texte) => `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titre}</title></head>
<body style="margin:0;padding:60px 20px;background:#E9E5DC;font-family:Georgia,serif;color:#1F1D1A;">
<div style="max-width:460px;margin:0 auto;">
  <div style="width:52px;height:4px;background:#EE6A4D;margin-bottom:22px;"></div>
  <h1 style="font-size:24px;line-height:1.2;margin:0 0 14px;">${titre}</h1>
  <p style="font-size:15px;line-height:1.7;color:#5C574E;margin:0;">${texte}</p>
</div></body></html>`;

export default async (req) => {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const signature = url.searchParams.get("s") || "";
  const secret = process.env.UNSUB_SECRET || process.env.TEST_TOKEN;
  const cleBrevo = process.env.BREVO_API_KEY;

  const html = (titre, texte, code = 200) =>
    new Response(PAGE(titre, texte), {
      status: code,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

  if (!secret || !cleBrevo) {
    return html("Service indisponible", "La désinscription n'est pas configurée. Écris-nous et nous le ferons à la main.", 500);
  }
  if (!email || signer(email, secret) !== signature) {
    return html("Lien invalide", "Ce lien de désinscription n'est pas valide. Utilise celui du dernier email reçu.", 400);
  }

  const ok = await desinscrire(cleBrevo, email);
  return ok
    ? html("C'est fait", "Tu ne recevras plus la fiche quotidienne. Le site reste accessible librement si tu veux continuer à lire.")
    : html("Échec", "La désinscription n'a pas pu être enregistrée. Réessaie dans un instant.", 502);
};

export const config = { path: "/api/desinscription" };
