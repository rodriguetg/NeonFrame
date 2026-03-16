# NeonFrame — Context for Claude

## Projet
Générateur d'images IA pour Instagram, créé par Rodrigue Gbadou. Stack : Next.js 15 / TypeScript / Pollinations.ai. Déployé sur Vercel : https://neon-frame-delta.vercel.app

## Décisions importantes déjà prises

### Architecture
- Pages Router (pas App Router) — rester sur ce choix
- styled-jsx pour le CSS — tout le styling est inline dans index.tsx, ne pas migrer vers un autre système
- Pas de base de données — tout est stateless, l'historique est en localStorage
- Le rate limiter est in-memory (resets au redémarrage Vercel) — acceptable pour l'usage actuel

### UI/UX
- Design dark cyberpunk (#080c14 fond, #00f0ff cyan accent, #7c3aed violet)
- Interface EN par défaut, toggle EN/FR — ne pas changer l'ordre
- Le prompt de l'utilisateur est passé directement à Pollinations, avec un suffix de style ajouté côté API
- La section caption/hashtags apparaît APRÈS génération de l'image (pas automatique, bouton manuel)
- Le prompt généré final n'est PAS affiché à l'utilisateur (caché intentionnellement)
- La section "API & Chrome Extension" est cachée de l'UI mais les endpoints fonctionnent

### API
- CORS activé sur toutes les routes API (préparation extension Chrome)
- Clé Pollinations : pk_sY52OWOvVCIEJgMo (dans .env, ne jamais committer)
- Rate limit : 8 req / 2 min / IP sur /api/generate-instagram-image
- Le proxy /api/pollinations-image gère les retries (3x avec backoff)

### Modèles Pollinations par style
- cyberpunk → flux
- anime → flux-anime
- realism/nature → flux-realism
- 3d → flux-3d
- dark → any-dark
- fantasy/vaporwave/minimal/abstract → flux

## Problèmes déjà résolus
- Hydration error en prod : causé par extensions Chrome (traducteur, etc.) → résolu avec _document.tsx (translate="no", suppressHydrationWarning)
- Caption API : l'endpoint GET de Pollinations text ne supporte pas les longs prompts → utiliser POST /openai
- Image hors écran : previewFrame limité à max-height: 70vh pour que la caption reste visible

## Prochaines étapes prévues
1. Extension Chrome (API CORS prête)
2. Icônes PWA (192px, 512px) pour installation mobile
3. Domaine personnalisé
4. Historique des images (pas seulement les prompts)
