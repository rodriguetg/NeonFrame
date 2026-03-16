# NeonFrame Chrome Extension

Extension Chrome qui apporte NeonFrame directement dans votre navigateur et sur Instagram.

## Fonctionnalités

### V1 — Popup
- Accessible depuis n'importe quel onglet via l'icône dans la barre Chrome
- Sélecteur de style (10 styles)
- Prompt + compteur de caractères
- Sélecteur de format (1:1 / 4:5 / 9:16)
- Bouton Random
- Timer de progression
- Téléchargement et copie de l'image dans le presse-papier
- Génération de caption & hashtags

### V2 — Instagram Integration
- Bouton flottant `◈` sur toutes les pages Instagram
- Panel latéral avec le générateur complet
- Même fonctionnalités que le popup
- Copie rapide caption/hashtags pour coller dans Instagram

## Installation (mode développeur)

1. Ouvrir Chrome → `chrome://extensions`
2. Activer le **Mode développeur** (toggle en haut à droite)
3. Cliquer **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `chrome-extension/`
5. L'extension apparaît dans la barre Chrome

## Ajouter les icônes

Placer 4 fichiers PNG dans le dossier `icons/` :
- `icon-16.png` (16×16)
- `icon-32.png` (32×32)
- `icon-48.png` (48×48)
- `icon-128.png` (128×128)

Sans icônes, Chrome affiche une icône par défaut — l'extension fonctionne quand même.

## Structure

```
chrome-extension/
├── manifest.json    # Config extension (Manifest V3)
├── popup.html       # Interface popup
├── popup.css        # Styles popup
├── popup.js         # Logique popup
├── content.js       # Script injecté sur Instagram
├── content.css      # Styles panel Instagram
├── icons/           # Icônes (à ajouter)
└── README.md
```

## API utilisée

Toutes les requêtes vont vers :
```
https://neon-frame-delta.vercel.app/api/generate-instagram-image
https://neon-frame-delta.vercel.app/api/generate-caption
```

CORS activé — pas de configuration supplémentaire nécessaire.
