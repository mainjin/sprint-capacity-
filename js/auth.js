// Module de gestion du token GitHub personnel.
// Pattern : IIFE exposée sur window.Auth
// Stockage : localStorage avec clé 'sprint-capacity-github-token'

(function () {
  const TOKEN_KEY = 'sprint-capacity-github-token';

  /**
   * Récupère le token stocké en localStorage.
   * @returns {string|null}
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Stocke le token en localStorage.
   * @param {string} token
   */
  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('[Auth] Token stocké');
    }
  }

  /**
   * Supprime le token de localStorage.
   */
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    console.log('[Auth] Token supprimé');
  }

  /**
   * Vérifie si un token est présent.
   * @returns {boolean}
   */
  function hasToken() {
    return !!getToken();
  }

  // Exposition sur window.Auth
  window.Auth = {
    getToken,
    setToken,
    clearToken,
    hasToken
  };

  console.log('Auth module loaded');
})();
})();
