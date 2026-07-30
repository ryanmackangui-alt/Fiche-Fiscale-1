/* Ajoute une adresse à la liste Brevo. La clé API reste côté serveur. */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ message: "Méthode non autorisée." }, { status: 405 });
  }

  let email;
  try {
    ({ email } = await req.json());
  } catch {
    return Response.json({ message: "Requête illisible." }, { status: 400 });
  }

  email = String(email || "").trim().toLowerCase();

  if (!EMAIL_OK.test(email) || email.length > 254) {
    return Response.json({ message: "Adresse invalide." }, { status: 400 });
  }

  const cle = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);

  if (!cle || !listId) {
    return Response.json({ message: "Service d'envoi non configuré." }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": cle,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
        attributes: { SOURCE: "site", CONSENTEMENT: new Date().toISOString() },
      }),
    });

    if (res.status === 201 || res.status === 204) {
      return Response.json({ ok: true }, { status: 200 });
    }

    const detail = await res.json().catch(() => ({}));
    if (detail.code === "duplicate_parameter") {
      return Response.json({ message: "Déjà inscrit." }, { status: 409 });
    }

    console.error("Brevo:", res.status, detail);
    return Response.json({ message: "L'inscription a échoué." }, { status: 502 });
  } catch (e) {
    console.error("inscription :", e.message);
    return Response.json({ message: "L'inscription a échoué." }, { status: 502 });
  }
};

export const config = { path: "/api/inscription" };
