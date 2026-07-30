/* Test manuel de l'envoi, protégé par un jeton.
   Appel : https://tonsite.netlify.app/api/envoi-test?cle=TON_JETON

   Options :
   &email=toi@domaine.fr  n'envoie qu'à cette adresse (mode drip)
   &brouillon=1           crée la campagne sans l'envoyer (mode campagne) */

import { envoyerFicheDuJour } from "../lib/envoi.js";

export default async (req) => {
  const url = new URL(req.url);
  const jeton = process.env.TEST_TOKEN;

  if (!jeton) {
    return new Response("TEST_TOKEN n'est pas défini dans les variables Netlify.", { status: 500 });
  }
  if (url.searchParams.get("cle") !== jeton) {
    return new Response("Jeton invalide.", { status: 401 });
  }

  const brouillon = url.searchParams.get("brouillon") === "1";
  const cible = url.searchParams.get("email");
  const r = await envoyerFicheDuJour({ brouillon, cible });

  return new Response(r.message, {
    status: r.ok ? 200 : 500,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};

export const config = { path: "/api/envoi-test" };
