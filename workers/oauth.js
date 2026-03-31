// Cloudflare Worker pour l'échange OAuth GitHub.
// Rôle : convertir un code d'autorisation en access_token sans exposer le secret client.
//
// Variables d'environnement requises :
// - CLIENT_ID      : ID client OAuth GitHub
// - CLIENT_SECRET  : Secret client OAuth GitHub (CONFIDENTIEL)
// - ALLOWED_ORIGIN : URL complète autorisée (ex: https://owner.github.io)

export default {
  async fetch(request, env) {
    // Rejet des méthodes non autorisées
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env.ALLOWED_ORIGIN)
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { error: 'Seul GET est accepté' },
        405,
        env.ALLOWED_ORIGIN
      );
    }

    try {
      // Extraction du paramètre "code" depuis l'URL
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        return jsonResponse(
          { error: 'Paramètre "code" manquant' },
          400,
          env.ALLOWED_ORIGIN
        );
      }

      // Échange du code contre un token GitHub
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          code: code
        })
      });

      const tokenData = await tokenResponse.json();

      // Gestion des erreurs OAuth GitHub
      if (tokenData.error) {
        const errorMessage =
          tokenData.error_description ||
          'Erreur lors de l\'échange OAuth (code invalide ou expiré)';

        console.error('GitHub OAuth error:', {
          error: tokenData.error,
          description: tokenData.error_description
        });

        return jsonResponse(
          {
            error: tokenData.error,
            message: errorMessage
          },
          400,
          env.ALLOWED_ORIGIN
        );
      }

      // Validation du token reçu
      if (!tokenData.access_token) {
        return jsonResponse(
          { error: 'Token non reçu de GitHub' },
          500,
          env.ALLOWED_ORIGIN
        );
      }

      // Succès : retour du token
      return jsonResponse(
        {
          token: tokenData.access_token,
          token_type: tokenData.token_type || 'bearer',
          scope: tokenData.scope,
          state: state
        },
        200,
        env.ALLOWED_ORIGIN
      );
    } catch (error) {
      console.error('Erreur interne du worker:', error);
      return jsonResponse(
        {
          error: 'Erreur interne',
          message: error.message
        },
        500,
        env.ALLOWED_ORIGIN
      );
    }
  }
};

/**
 * Constructeur de réponse JSON avec CORS.
 * @param {Object} payload - Données à retourner en JSON
 * @param {number} status - Code HTTP (200, 400, 500...)
 * @param {string} allowedOrigin - Origine autorisée pour CORS
 * @returns {Response}
 */
function jsonResponse(payload, status = 200, allowedOrigin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(allowedOrigin)
    }
  });
}

/**
 * Headers CORS pour restreindre l'accès à l'origine GitHub Pages.
 * @param {string} allowedOrigin - Origine autorisée (ex: https://owner.github.io)
 * @returns {Object} Headers CORS
 */
function corsHeaders(allowedOrigin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}
