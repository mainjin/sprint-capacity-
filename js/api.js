// Module d'accès à l'API GitHub Contents.
// Pattern : IIFE exposée sur window.GitHubAPI
// Rôle : lecture des fichiers JSON (API GitHub publique)
//        écriture via Cloudflare Worker (sans token côté client)

import { CONFIG } from '../config.js';

(function () {
  /**
   * Décode une chaîne base64.
   * @param {string} b64
   * @returns {string}
   */
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /**
   * Encode une chaîne en base64.
   * @param {string} str
   * @returns {string}
   */
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Construit l'URL de l'API GitHub Contents (publique, sans auth).
   * @param {string} path - Chemin du fichier (ex: "data/members.json")
   * @returns {string} URL complète
   */
  function getGitHubFileUrl(path) {
    return (
      `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}` +
      `/contents/${path}`
    );
  }

  /**
   * Lit un fichier JSON du dépôt GitHub (accès public, pas de token).
   * @param {string} path - Chemin du fichier (ex: "data/members.json")
   * @returns {Promise<{data: Array, sha: string}>}
   */
  async function readFile(path) {
    try {
      console.log(`[API] READ: ${path}`);

      const url = getGitHubFileUrl(path);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Erreur GitHub (${response.status}): ${errorData.message || 'Impossible de lire le fichier'}`
        );
      }

      const fileData = await response.json();
      const content = fromBase64(fileData.content);
      const data = JSON.parse(content);
      const sha = fileData.sha;

      console.log(`[API] READ SUCCESS: ${path} (${data.length} éléments, sha: ${sha.slice(0, 8)})`);

      return { data, sha };
    } catch (error) {
      console.error(`[API] READ ERROR: ${path}`, error);
      throw error;
    }
  }

  /**
   * Écrit un fichier JSON via le Cloudflare Worker.
   * Le Worker se charge du token PAT et de l'appel GitHub.
   * @param {string} path - Chemin du fichier (ex: "data/members.json")
   * @param {Array} data - Données à écrire (sera encodée en base64)
   * @param {string} sha - SHA actuel du fichier (pour détecter les conflits)
   * @returns {Promise<string>} Nouveau SHA retourné par le Worker
   */
  async function writeFile(path, data, sha) {
    try {
      console.log(`[API] WRITE: ${path}`);

      if (!CONFIG.WORKER_URL) {
        throw new Error('WORKER_URL non configuré dans config.js');
      }

      const content = toBase64(JSON.stringify(data, null, 2));
      const now = new Date().toLocaleString('fr-FR');
      const message = `chore: update ${path} - ${now}`;

      const response = await fetch(CONFIG.WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path,
          content,
          sha,
          message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Erreur Worker (${response.status}): ${errorData.error || 'Impossible d\'écrire le fichier'}`
        );
      }

      const result = await response.json();
      const newSha = result.sha;

      console.log(`[API] WRITE SUCCESS: ${path} (nouveau sha: ${newSha.slice(0, 8)})`);
      return newSha;
    } catch (error) {
      console.error(`[API] WRITE ERROR: ${path}`, error);
      throw error;
    }
  }

  // Exposition sur window.GitHubAPI
  window.GitHubAPI = {
    readFile,
    writeFile
  };

  console.log('GitHubAPI module loaded');
})();
