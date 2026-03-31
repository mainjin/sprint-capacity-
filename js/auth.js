// Module d'authentification OAuth GitHub pour une GitHub Pages app.
// Pattern : IIFE exposée sur window.Auth
// Stockage : sessionStorage (temporaire, perdu à la fermeture du navigateur)

import { CONFIG } from '../config.js';

(function () {
  const TOKEN_KEY = 'auth.token';
  const USER_KEY = 'auth.user';
  const STATE_KEY = 'auth.state';

  /**
   * Génère un state aléatoire pour la protection anti-CSRF.
   * @returns {string} State aléatoire de 32 caractères
   */
  function generateState() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Redirige l'utilisateur vers le formulaire OAuth GitHub.
   * Stocke un state anti-CSRF dans sessionStorage.
   */
  function login() {
    const state = generateState();
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: CONFIG.OAUTH_CLIENT_ID,
      redirect_uri: CONFIG.APP_URL,
      scope: 'public_repo',
      state: state
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Traite le callback OAuth (appelé au chargement si ?code= est présent).
   * Vérifie le state, échange le code contre un token, récupère le profil utilisateur.
   * @returns {Promise<boolean>} true si succès, false sinon
   */
  async function handleCallback() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Nettoyage de l'URL en toutes circonstances
    window.history.replaceState({}, document.title, window.location.pathname);

    // Gestion des erreurs GitHub
    if (error) {
      const errorDesc = url.searchParams.get('error_description') || 'Erreur inconnue';
      console.error('GitHub OAuth error:', { error, errorDesc });
      showError(`Erreur d'authentification : ${errorDesc}`);
      return false;
    }

    // Pas de code = pas de callback
    if (!code) {
      return false;
    }

    // Vérification anti-CSRF
    const storedState = sessionStorage.getItem(STATE_KEY);
    if (!state || state !== storedState) {
      console.error('State mismatch: CSRF attack detected or session expired');
      showError('Erreur de sécurité : state invalide. Veuillez réessayer.');
      sessionStorage.removeItem(STATE_KEY);
      return false;
    }

    try {
      // Étape 1 : échange du code contre un token via le Cloudflare Worker
      const workerUrl = `${CONFIG.WORKER_URL}?code=${encodeURIComponent(code)}`;
      const tokenResponse = await fetch(workerUrl);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Erreur Worker: HTTP ${tokenResponse.status}`
        );
      }

      const { token } = await tokenResponse.json();
      if (!token) {
        throw new Error('Token non reçu du worker');
      }

      // Étape 2 : récupération du profil utilisateur
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Impossible de récupérer le profil (HTTP ${userResponse.status})`);
      }

      const user = await userResponse.json();

      // Étape 3 : stockage
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.removeItem(STATE_KEY);

      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      showError(`Erreur d'authentification : ${error.message}`);
      sessionStorage.removeItem(STATE_KEY);
      return false;
    }
  }

  /**
   * Supprime le token et le profil utilisateur, puis redirige.
   */
  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    window.location.href = CONFIG.APP_URL;
  }

  /**
   * Retourne le token d'accès stocké.
   * @returns {string|null}
   */
  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  /**
   * Retourne l'objet profil utilisateur stocké.
   * @returns {object|null}
   */
  function getUser() {
    const user = sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Indique si l'utilisateur est authentifié.
   * @returns {boolean}
   */
  function isLogged() {
    return Boolean(getToken() && getUser());
  }

  /**
   * Affiche un message d'erreur à l'utilisateur.
   * @param {string} message - Message en français
   */
  function showError(message) {
    console.error(message);
    // Affichage simple dans la console pour maintenant
    // À adapter avec une UI toast/modal si nécessaire
    if (typeof window !== 'undefined' && window.alert) {
      // Optionnel : alert(message);
    }
  }

  // Exposition sur window.Auth
  window.Auth = {
    login,
    handleCallback,
    logout,
    getToken,
    getUser,
    isLogged
  };

  console.log('Auth module loaded');
})();
