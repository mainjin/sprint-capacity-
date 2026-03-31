// Configuration globale de l'application.
// Modifier les valeurs ci-dessous pour adapter le projet à votre environnement.

export const CONFIG = {
  // ===== GITHUB =====
  // Propriétaire du dépôt GitHub (ex: "votre-username")
  GITHUB_OWNER: 'votre-owner',

  // Nom du dépôt GitHub (ex: "sprint-capacity")
  GITHUB_REPO: 'sprint-capacity',

  // Branche de données par défaut
  DATA_BRANCH: 'main',

  // ===== OAUTH =====
  // ID client OAuth (obtenu depuis le provider, ex: GitHub, Google)
  OAUTH_CLIENT_ID: 'votre-oauth-client-id',

  // ===== URLS =====
  // URL complète du site GitHub Pages
  // Exemple: "https://votre-owner.github.io/sprint-capacity"
  APP_URL: 'https://votre-owner.github.io/sprint-capacity',

  // URL du Cloudflare Worker pour l'échange OAuth
  // Exemple: "https://oauth-worker.votre-domaine.workers.dev"
  WORKER_URL: 'https://oauth-worker.example.workers.dev',

  // ===== API =====
  // Endpoint de base pour l'API GitHub
  API_BASE: 'https://api.github.com',

  // ===== DONNEES =====
  // Chemins des fichiers JSON de données
  DATA_FILES: {
    members: './data/members.json',
    sprints: './data/sprints.json',
    leaves: './data/leaves.json'
  },

  // Préfixe pour les clés localStorage
  STORAGE_PREFIX: 'sprint-capacity'
};

// Exporter aussi sur window pour compatibilité globale
window.CONFIG = CONFIG;
