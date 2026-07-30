# Fiche fiscale

Une règle de fiscalité d'entreprise française par jour : lisible sur le site, puis envoyée chaque midi par email aux inscrits. 30 fiches écrites et relues, de la découverte aux montages d'optimisation.

**Coût : zéro.** Pas de clé API, pas de carte bancaire, pas de facturation à l'usage. Netlify, GitHub et Brevo suffisent dans leurs offres gratuites.

## Comment ça tourne

```
Visiteur → site statique → fiches.json (fichier local)
Visiteur → /api/inscription → liste Brevo
Cron 10:00 UTC → envoi-quotidien → lit fiches.json → campagne Brevo → toute la liste
```

La fiche du jour est choisie par la date, avec le même calcul côté site et côté email : les deux tombent forcément sur la même. Au bout de 30 jours, le cycle recommence. Ajoute des fiches à `fiches.json` avant.

## Déploiement

**1. Le dépôt.** Pousse ce dossier sur GitHub, puis dans Netlify : *Add new site → Import an existing project*. Rien à configurer, `netlify.toml` s'en occupe.

**2. La liste email.** Crée un compte Brevo, crée une liste de contacts, note son identifiant (visible dans l'URL de la liste).

**3. Les variables.** Netlify → *Site configuration → Environment variables* :

| Variable | Valeur |
|---|---|
| `BREVO_API_KEY` | Brevo → SMTP & API → API keys |
| `BREVO_LIST_ID` | l'identifiant de ta liste |
| `SENDER_EMAIL` | une adresse sur ton domaine, **validée** dans Brevo |
| `SENDER_NAME` | le nom d'expéditeur affiché |
| `SITE_URL` | l'URL finale du site, sans slash final |

Après tout ajout de variable : *Deploys → Trigger deploy*. Une variable non redéployée n'existe pas.

**4. L'authentification du domaine.** Dans Brevo, ajoute les enregistrements DKIM et SPF à ton DNS. Sans cette étape, les emails partent en spam. C'est la plus lente et la moins facultative.

**5. Le premier envoi.** Inscris-toi sur ton propre site, puis Netlify → *Functions → envoi-quotidien → Run now*. Vérifie le rendu sur téléphone avant d'ouvrir les inscriptions.

**6. Les mentions légales.** Remplace les `[crochets]` dans `mentions.html`. Collecter des adresses sans éditeur identifiable ni information sur le traitement n'est pas conforme.

## En local

```bash
npm install
npx netlify dev
```

Un fichier `.env` avec les mêmes variables, jamais commité.

## Modifier le contenu

Tout est dans `fiches.json`. Une fiche = un objet avec `id`, `niveau` (`Découverte`, `Fondamental` ou `Avancé`), `tampon` (14 caractères maximum), `titre`, `principe`, `exemple`, `erreur`, `limite`, `references`. Ajoute des objets à la suite en incrémentant `id` : le site et l'email les prennent en compte au prochain déploiement, sans toucher au code.

## Points de vigilance

**Les chiffres vieillissent.** Les fiches sont à jour au 30 juillet 2026, sur la base de la loi de finances pour 2026 (loi n° 2026-103 du 19 février 2026) et de la LFSS 2026. Chaque loi de finances peut invalider un seuil : reprends `fiches.json` en janvier et en juillet. Le champ `meta.verifie_le` s'affiche dans le pied de page du site, sois honnête avec sa valeur.

**Les fiches les plus fragiles** sont celles qui reposent sur des textes récents ou en cours de commentaire : la taxe de 20 % sur les actifs non affectés (fiche 29), l'apport-cession (26), le Dutreil (27) et le calendrier de la facture électronique (10). Vérifie-les avant toute décision et avant chaque nouvelle diffusion.

**L'heure.** Le cron est en UTC : `0 10 * * *` donne midi à Paris en été, 11 h en hiver. Pour un midi exact toute l'année, planifie `0 10,11 * * *` et sors de la fonction quand l'heure de Paris n'est pas 12.

**Relecture avant envoi.** Le contenu est déjà écrit et relu, donc le risque est faible. Si tu préfères garder la main, commente l'appel `sendNow` dans `envoi-quotidien.js` : la campagne est créée en brouillon dans Brevo et tu l'envoies après lecture.

**Brevo gratuit** plafonne à 300 emails par jour, soit 300 abonnés pour un envoi quotidien.
