/* Fonction planifiée. Le cron est défini dans netlify.toml.
   Netlify n'autorise pas l'appel HTTP d'une fonction planifiée :
   pour tester, utiliser /api/envoi-test. */

import { envoyerFicheDuJour } from "../lib/envoi.js";

export default async () => {
  const r = await envoyerFicheDuJour();
  if (r.ok) {
    console.log(r.message);
    return new Response("ok", { status: 200 });
  }
  console.error(r.message);
  return new Response(r.message, { status: 500 });
};
