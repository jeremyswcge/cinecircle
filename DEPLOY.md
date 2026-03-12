# Déployer CineCircle sur Vercel

## Prérequis
- Node.js installé
- Un compte Vercel (gratuit sur vercel.com)

## Étapes

### 1. Installer Vercel CLI
```bash
npm install -g vercel
```

### 2. Se connecter à Vercel
```bash
vercel login
```

### 3. Aller dans le dossier du projet
```bash
cd cinecircle
```

### 4. Déployer
```bash
vercel deploy --prod
```
Lors du premier déploiement, Vercel te posera quelques questions :
- **Set up and deploy?** → `Y`
- **Which scope?** → Ton compte
- **Link to existing project?** → `N`
- **What's your project's name?** → `cinecircle` (ou ce que tu veux)
- **In which directory is your code located?** → `./`

### 5. Variables d'environnement (obligatoires pour que l'app fonctionne)

Après le déploiement, ajoute tes clés API dans le tableau de bord Vercel
(Project → Settings → Environment Variables) :

| Variable | Description |
|---|---|
| `VITE_TMDB_API_KEY` | Clé API TMDB — obtenir sur themoviedb.org/settings/api |
| `GEMINI_API_KEY` | Clé API Google Gemini — obtenir sur aistudio.google.com |

Puis redéploie avec `vercel deploy --prod` pour que les variables soient prises en compte.

---
Le fichier `vercel.json` est déjà configuré pour le routing React (SPA).
