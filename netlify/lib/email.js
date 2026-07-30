/* Gabarit email et choix de la fiche du jour. Aucune dépendance externe. */

const ORIGINE = Date.UTC(2026, 0, 1); // référence commune au site et à l'email

/* Index de la fiche du jour, calculé sur la date de Paris.
   Le site et l'email tombent forcément sur la même fiche. */
export function indexDuJour(total, date = new Date()) {
  const p = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [a, m, j] = p.split("-").map(Number);
  const jours = Math.floor((Date.UTC(a, m - 1, j) - ORIGINE) / 86400000);
  return ((jours % total) + total) % total;
}

export function dateLongue(date = new Date()) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

function echapper(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function emailHtml(fiche, urlSite, dateStr) {
  const bloc = (num, etiquette, texte, couleur, epaisseur) => `
    <tr><td style="padding:24px 0 0;border-top:${epaisseur}px solid ${couleur};">
      <div style="font-family:'Arial Narrow',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.2em;font-size:9.5px;font-weight:bold;color:${couleur};padding-bottom:9px;"><span style="color:#EE6A4D;">${num}</span>&nbsp;&nbsp;${etiquette}</div>
      <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.68;color:#1F1D1A;">${echapper(texte)}</div>
    </td></tr>`;

  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:26px 12px;background:#E9E5DC;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background:#F1EDE4;border:1px solid #CCC5B6;">
  <tr><td style="padding:30px 26px 28px;">

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#1F1D1A;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#EE6A4D;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7E9086;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6F7A6E;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C2A878;"></span>
        </td>
        <td align="right" style="font-family:'Arial Narrow',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.16em;font-size:9.5px;font-weight:bold;color:#5C574E;">${echapper(dateStr)}</td>
      </tr>
    </table>

    <div style="font-family:'Arial Narrow',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.19em;font-size:9.5px;font-weight:bold;color:#5C574E;padding-top:26px;">
      Fiche n° ${String(fiche.id).padStart(3, "0")} &nbsp;/&nbsp; <span style="color:#EE6A4D;">${echapper(fiche.niveau)}</span>
    </div>

    <div style="background:#EE6A4D;color:#F1EDE4;display:inline-block;padding:8px 11px;margin-top:14px;font-family:Impact,'Arial Narrow',Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.02em;font-size:14px;">${echapper(fiche.tampon)}</div>

    <h1 style="font-family:Impact,'Arial Narrow',Helvetica,sans-serif;font-size:33px;line-height:1.04;font-weight:normal;letter-spacing:.005em;text-transform:uppercase;color:#1F1D1A;margin:16px 0 0;">${echapper(fiche.titre)}</h1>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:26px;">
      ${bloc("01", "Le principe", fiche.principe, "#7E9086", 1)}
      ${bloc("02", "Exemple chiffré", fiche.exemple, "#7E9086", 1)}
      ${bloc("03", "L'erreur classique", fiche.erreur, "#7E9086", 1)}
      ${bloc("04", "La limite légale", fiche.limite, "#EE6A4D", 3)}
    </table>

    <div style="margin-top:26px;padding-top:13px;border-top:1px solid #1F1D1A;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:.06em;color:#5C574E;">
      ${(fiche.references || []).map(echapper).join(" &nbsp;·&nbsp; ")}
    </div>

    <div style="margin-top:26px;font-family:Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.65;color:#5C574E;">
      Veille pédagogique, pas un conseil fiscal : fais valider toute décision par ton expert-comptable.
      <br /><a href="${urlSite}" style="color:#EE6A4D;">Lire les autres fiches</a>
    </div>

  </td></tr>
</table>
</body></html>`;
}
