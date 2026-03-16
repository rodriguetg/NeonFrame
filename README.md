# NeonFrame — AI Image Generator for Instagram

Générateur d'images IA pour Instagram. L'utilisateur choisit un style visuel, entre un prompt, et obtient une image prête à publier. Une caption et des hashtags peuvent être générés automatiquement après chaque image.

Live : **https://neon-frame-delta.vercel.app**
Repo : **https://github.com/rodriguetg/NeonFrame**

---

## Stack technique

| Élément | Technologie |
|---|---|
| Framework | Next.js 15 (Pages Router) |
| Langage | TypeScript 5 |
| UI | React 18 + styled-jsx (CSS-in-JS) |
| Images IA | Pollinations.ai (modèle Flux) |
| Texte IA | Pollinations.ai (modèle OpenAI-compatible) |
| Hébergement | Vercel (plan Hobby, gratuit) |
| Repo | GitHub |

---

## Fonctionnalités

- **10 styles visuels** avec modèle Pollinations dédié par style
- **3 formats Instagram** : carré 1:1 (1080×1080), portrait 4:5 (1080×1350), story 9:16 (1080×1920)
- **Bouton Random** : génère un prompt + style + format aléatoire et lance la génération
- **Caption & Hashtags IA** : générés automatiquement après chaque image via Pollinations text API
- **Historique des prompts** : 8 derniers prompts sauvegardés en localStorage
- **Compteur de caractères** sur le prompt (max 500)
- **Timer de progression** avec barre de progression et durée estimée
- **Ctrl+Enter** pour générer depuis le textarea
- **Toggle EN / FR** sur toute l'interface
- **Rate limiting** : 8 requêtes / 2 min par IP (côté serveur)
- **CORS activé** sur les API routes (prêt pour extension Chrome)
- **PWA** : manifest.json inclus, installable sur mobile une fois sur HTTPS

---

## Styles disponibles

| Style | Modèle Pollinations | Description |
|---|---|---|
| ⚡ Cyberpunk | `flux` | Néon, ville sombre, futuriste |
| 🌸 Anime | `flux-anime` | Illustration japonaise |
| 📷 Photo | `flux-realism` | Ultra réaliste |
| 🎮 3D / CGI | `flux-3d` | Rendu 3D cinématique |
| 🌑 Dark | `any-dark` | Gothique, mystérieux |
| ✨ Fantasy | `flux` | Monde magique, épique |
| 🌊 Vaporwave | `flux` | Rétro 80s, pastel |
| ◻ Minimal | `flux` | Épuré, élégant |
| 🔮 Abstract | `flux` | Formes audacieuses |
| 🌿 Nature | `flux-realism` | Organique, naturel |

---

## Architecture des fichiers

```
NeonFrame/
├── pages/
│   ├── index.tsx                        # UI principale (composant React)
│   ├── _document.tsx                    # HTML document (lang, suppressHydrationWarning)
│   └── api/
│       ├── generate-instagram-image.ts  # POST — génère l'URL de l'image
│       ├── generate-caption.ts          # POST — génère caption + hashtags
│       └── pollinations-image.ts        # GET  — proxy vers Pollinations (avec retry)
├── lib/
│   ├── pollinationsService.ts           # Dimensions formats, construction URL Pollinations
│   └── rateLimiter.ts                   # Rate limiter in-memory par IP
├── public/
│   └── manifest.json                    # PWA manifest
├── .env                                 # Clé API Pollinations (ne jamais committer)
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## API Routes

### `POST /api/generate-instagram-image`

Génère une image Instagram via Pollinations.

**Body :**
```json
{
  "prompt": "Cyberpunk city at night, neon lights",
  "type": "square",
  "model": "flux",
  "promptSuffix": "cyberpunk aesthetic, neon lights, dark rainy city"
}
```

**Réponse :**
```json
{
  "success": true,
  "imageUrl": "/api/pollinations-image?prompt=...&format=square&t=..."
}
```

**Formats acceptés :** `square` | `four_five` | `story`
**Rate limit :** 8 req / 2 min / IP

---

### `POST /api/generate-caption`

Génère une caption Instagram + hashtags via Pollinations text API.

**Body :**
```json
{
  "prompt": "Cyberpunk city at night, neon lights",
  "style": "Cyberpunk"
}
```

**Réponse :**
```json
{
  "success": true,
  "caption": "Neon dreams ignite the night. ✨🌃",
  "hashtags": ["#cyberpunk", "#neonlights", "..."]
}
```

---

### `GET /api/pollinations-image`

Proxy serveur vers Pollinations. Gère les retries (3 tentatives, backoff exponentiel) et le timeout (15s).

**Params :** `prompt`, `format`, `model`

---

## Variables d'environnement

| Variable | Description | Où la mettre |
|---|---|---|
| `POLLINATIONS_API_KEY` | Clé API Pollinations | `.env` en local, Vercel dashboard en prod |

**Clé actuelle :** `` (compte Rodrigue)

---

## Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Vérifier que .env contient la clé
# POLLINATIONS_API_KEY=

# 3. Démarrer le serveur de développement
npm run dev

# → http://127.0.0.1:3000
```

---

## Déploiement (Vercel)

Le déploiement est **automatique** à chaque push sur `main`.

Pour un redéploiement manuel ou pour modifier les variables d'env :
1. Aller sur https://vercel.com → projet NeonFrame
2. Settings → Environment Variables → ajouter/modifier `POLLINATIONS_API_KEY`
3. Redeploy si nécessaire

---

## Extension Chrome (à venir)

Les API routes ont le CORS activé (`Access-Control-Allow-Origin: *`). Une extension Chrome peut donc appeler directement :

```javascript
// Exemple depuis une extension Chrome
const response = await fetch("https://neon-frame-delta.vercel.app/api/generate-instagram-image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Cyberpunk city",
    type: "square",
    model: "flux",
    promptSuffix: "neon lights, dark atmosphere"
  })
});
const data = await response.json();
// data.imageUrl → URL de l'image générée
```

Dans le `manifest.json` de l'extension, ajouter :
```json
"host_permissions": ["https://neon-frame-delta.vercel.app/*"]
```

---

## Roadmap

- [ ] Icônes PWA (192px et 512px) pour installation mobile
- [ ] Historique des images générées (pas seulement les prompts)
- [ ] Option d'export direct vers l'app Instagram (Web Share API)
- [ ] Extension Chrome
- [ ] Domaine personnalisé (ex: neonframe.app)
- [ ] Authentification (pour sauvegarder l'historique cross-device)

---

## Crédits

- **Développeur** : Rodrigue Gbadou — [LinkedIn](https://www.linkedin.com/in/rodrigue-gbadou/)
- **IA Images** : [Pollinations.ai](https://pollinations.ai) (Flux, flux-anime, flux-realism, flux-3d, any-dark)
- **IA Texte** : [Pollinations.ai](https://text.pollinations.ai) (OpenAI-compatible endpoint)
- **Framework** : [Next.js](https://nextjs.org)
- **Hébergement** : [Vercel](https://vercel.com)
