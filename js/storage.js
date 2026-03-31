// Couche de stockage pour la gestion des collections de données.
// Utilise GitHubAPI pour la persistance et le cache local pour la performance.

/**
 * Récupère une collection (lit depuis GitHub via cache local si possible).
 * @param {string} type - Type de collection (members, sprints, leaves)
 * @returns {Promise<Array>}
 */
export async function getCollection(type) {
  try {
    const result = await window.GitHubAPI.readFile(type);
    return result.data || [];
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${type}:`, error);
    throw error;
  }
}

/**
 * Sauvegarde une collection sur GitHub.
 * @param {string} type - Type de collection
 * @param {Array} data - Données à sauvegarder
 * @param {string} sha - SHA actuel du fichier
 * @returns {Promise<Array>}
 */
export async function saveCollection(type, data, sha) {
  try {
    await window.GitHubAPI.writeFile(type, data, sha);
    return data;
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde de ${type}:`, error);
    throw error;
  }
}

/**
 * Génère un ID unique pour une entité.
 * @param {string} prefix - Préfixe de l'ID (m, s, l)
 * @returns {string}
 */
export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
