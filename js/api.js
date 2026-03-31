// Module d'accès à l'API GitHub Contents.
// Pattern : IIFE exposée sur window.GitHubAPI
// Rôle : lecture/écriture des fichiers JSON du dépôt

import { CONFIG } from '../config.js';

(function () {
  /**
   * Encode une chaîne en base64.
   * @param {string} str
   * @returns {string}
   */
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Décode une chaîne base64.
   * @param {string} b64
   * @returns {string}
   */
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /**
   * Récupère le token d'authentification.
   * @returns {string|null}
   */
  function getAuthToken() {
    return window.Auth?.getToken() || null;
  }

  /**
   * Récupère les informations utilisateur pour le message de commit.
   * @returns {object} { login: string, timestamp: string }
   */
  function getCommitAuthor() {
    const user = window.Auth?.getUser();
    const now = new Date().toLocaleString('fr-FR');
    return {
      login: user?.login || 'anonymous',
      timestamp: now
    };
  }

  /**
   * Construit les headers pour l'API GitHub.
   * @returns {object}
   */
  function getHeaders() {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Non authentifié : token manquant');
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Construit l'URL de l'API GitHub Contents.
   * @param {string} filename - Clé du fichier (members, sprints, leaves)
   * @returns {string} URL complète
   */
  function getFileUrl(filename) {
    const path = CONFIG.DATA_FILES[filename];
    if (!path) {
      throw new Error(`Fichier inconnu : ${filename}`);
    }

    // Extrait le chemin relatif (ex: "data/members.json")
    const filePath = path.replace(/^\.\//, '');

    return (
      `${CONFIG.API_BASE}/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}` +
      `/contents/${filePath}?ref=${CONFIG.DATA_BRANCH}`
    );
  }

  /**
   * Lit un fichier JSON du dépôt.
   * @param {string} filename - Clé du fichier (members, sprints, leaves)
   * @returns {Promise<{data: Array, sha: string}>}
   */
  async function readFile(filename) {
    try {
      console.log(`[API] READ: ${filename}`);

      const url = getFileUrl(filename);
      const response = await fetch(url, {
        headers: getHeaders()
      });

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

      console.log(`[API] READ SUCCESS: ${filename} (${data.length} éléments, sha: ${sha.slice(0, 8)})`);

      return { data, sha };
    } catch (error) {
      console.error(`[API] READ ERROR: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Écrit un fichier JSON dans le dépôt avec gestion des conflits.
   * @param {string} filename - Clé du fichier
   * @param {Array} data - Données à écrire
   * @param {string} sha - SHA actuel du fichier
   * @returns {Promise<string>} Nouveau SHA
   */
  async function writeFile(filename, data, sha, retryCount = 0) {
    try {
      console.log(`[API] WRITE: ${filename} (attempt ${retryCount + 1})`);

      const author = getCommitAuthor();
      const message = `chore: update ${filename} - ${author.login} - ${author.timestamp}`;
      const content = toBase64(JSON.stringify(data, null, 2));
      const url = getFileUrl(filename);

      const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          content,
          sha,
          branch: CONFIG.DATA_BRANCH
        })
      });

      // Succès
      if (response.ok) {
        const result = await response.json();
        const newSha = result.commit.sha;
        console.log(`[API] WRITE SUCCESS: ${filename} (nouveau sha: ${newSha.slice(0, 8)})`);
        return newSha;
      }

      // Conflit SHA (409) : re-lire et retenter une seule fois
      if (response.status === 409 && retryCount === 0) {
        console.warn(`[API] WRITE CONFLICT (409): ${filename} - récupération du SHA actuel...`);
        const { data: _, sha: currentSha } = await readFile(filename);
        return writeFile(filename, data, currentSha, retryCount + 1);
      }

      // Erreur après retry ou autre code
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 409) {
        throw new Error(
          `Conflit d'écriture (409) : impossible de synchroniser après 2 tentatives. ` +
          `Rechargez la page et réessayez.`
        );
      }

      throw new Error(
        `Erreur GitHub (${response.status}): ${errorData.message || 'Impossible d\'écrire le fichier'}`
      );
    } catch (error) {
      console.error(`[API] WRITE ERROR: ${filename}`, error);
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
