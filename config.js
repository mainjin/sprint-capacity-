// Configuration globale de l'application.
// Modifier les valeurs ci-dessous pour adapter le projet à votre environnement.

export const CONFIG = {
  // ===== GITHUB =====
  // Propriétaire du dépôt GitHub (ex: "mainjin")
  GITHUB_OWNER: 'mainjin',

  // Nom du dépôt GitHub (ex: "sprint-capacity-")
  GITHUB_REPO: 'sprint-capacity-',

  // ===== URLS =====
  // URL du Cloudflare Worker pour les opérations d'écriture sur GitHub
  // Exemple: "https://your-worker.your-domain.workers.dev"
  WORKER_URL: 'https://your-worker.your-domain.workers.dev',

  // ===== DONNEES =====
  // Chemin vers le répertoire des fichiers JSON
  DATA_PATH: 'data'
};

// Exporter aussi sur window pour compatibilité globale
window.CONFIG = CONFIG;
