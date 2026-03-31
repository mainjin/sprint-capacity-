// Module de gestion des membres de l'équipe.
// Pattern : IIFE exposée sur window.Members
// Modèle : { id, firstname, lastname, role, occupancy_rate, created_at }

(function () {
  const TYPE = 'data/members.json';
  let cache = null;
  let cacheSha = null;

  /**
   * Génère un ID unique pour un membre.
   * @returns {string}
   */
  function generateId() {
    return crypto.randomUUID();
  }

  /**
   * Retourne la date actuelle en format ISO.
   * @returns {string}
   */
  function now() {
    return new Date().toISOString();
  }

  /**
   * Valide les données d'un membre.
   * @param {object} data - Données à valider
   * @throws {Error} Si validation échoue
   */
  function validate(data) {
    const errors = [];

    if (!data.firstname || typeof data.firstname !== 'string' || !data.firstname.trim()) {
      errors.push('Le prénom est obligatoire');
    }

    if (!data.lastname || typeof data.lastname !== 'string' || !data.lastname.trim()) {
      errors.push('Le nom est obligatoire');
    }

    if (!data.role || typeof data.role !== 'string' || !data.role.trim()) {
      errors.push('Le rôle est obligatoire');
    }

    if (
      typeof data.occupancy_rate !== 'number' ||
      data.occupancy_rate < 0.1 ||
      data.occupancy_rate > 1.0
    ) {
      errors.push('Le taux d\'occupation doit être entre 0.1 et 1.0');
    }

    if (errors.length > 0) {
      throw new Error(`Validation échouée : ${errors.join(', ')}`);
    }
  }

  /**
   * Récupère tous les membres (avec cache).
   * @returns {Promise<Array>}
   */
  async function getAll() {
    try {
      const result = await window.GitHubAPI.readFile(TYPE);
      cache = result.data || [];
      cacheSha = result.sha;
      console.log(`[Members] getAll: ${cache.length} membres en cache`);
      return cache;
    } catch (error) {
      console.error('[Members] Erreur lors de la lecture:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau membre.
   * @param {object} memberData - { firstname, lastname, role, occupancy_rate }
   * @returns {Promise<object>} Le membre créé
   */
  async function add(memberData) {
    try {
      console.log('[Members] Ajout d\'un nouveau membre');

      // Validation
      validate(memberData);

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const members = result.data || [];
      const sha = result.sha;

      // Création du nouveau membre
      const member = {
        id: generateId(),
        firstname: memberData.firstname.trim(),
        lastname: memberData.lastname.trim(),
        role: memberData.role.trim(),
        occupancy_rate: memberData.occupancy_rate,
        created_at: now()
      };

      // Ajout et sauvegarde
      members.push(member);
      await window.GitHubAPI.writeFile(TYPE, members, sha);

      // Mise à jour du cache
      cache = members;
      cacheSha = sha;

      console.log(`[Members] Membre créé: ${member.id}`);
      return member;
    } catch (error) {
      console.error('[Members] Erreur lors de l\'ajout:', error);
      throw error;
    }
  }

  /**
   * Récupère un membre par ID.
   * @param {string} id - ID du membre
   * @returns {object|null}
   */
  function getById(id) {
    if (!cache) return null;
    return cache.find((m) => m.id === id) || null;
  }

  /**
   * Met à jour un membre existant.
   * @param {string} id - ID du membre
   * @param {object} memberData - Données à fusionner
   * @returns {Promise<object>} Le membre mis à jour
   */
  async function update(id, memberData) {
    try {
      console.log(`[Members] Mise à jour du membre: ${id}`);

      // Validation des champs fournis
      if (memberData.firstname || memberData.lastname || memberData.role || memberData.occupancy_rate) {
        validate({
          firstname: memberData.firstname || '',
          lastname: memberData.lastname || '',
          role: memberData.role || '',
          occupancy_rate: memberData.occupancy_rate !== undefined ? memberData.occupancy_rate : 0.5
        });
      }

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const members = result.data || [];
      const sha = result.sha;

      // Recherche du membre
      const memberIndex = members.findIndex((m) => m.id === id);
      if (memberIndex === -1) {
        throw new Error(`Membre non trouvé : ${id}`);
      }

      // Fusion des données (préserve les champs non fournis)
      const updated = Object.assign({}, members[memberIndex], memberData, { id, created_at: members[memberIndex].created_at });
      members[memberIndex] = updated;

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, members, sha);

      // Mise à jour du cache
      cache = members;
      cacheSha = sha;

      console.log(`[Members] Membre mis à jour: ${id}`);
      return updated;
    } catch (error) {
      console.error('[Members] Erreur lors de la mise à jour:', error);
      throw error;
    }
  }

  /**
   * Supprime un membre.
   * Vérifie d'abord qu'aucun congé n'est associé à ce membre.
   * @param {string} id - ID du membre
   * @returns {Promise<void>}
   */
  async function delete_(id) {
    try {
      console.log(`[Members] Suppression du membre: ${id}`);

      // Vérification des congés associés
      if (window.Leaves && window.Leaves.getByMember) {
        const leaves = await window.Leaves.getByMember(id);
        if (leaves.length > 0) {
          throw new Error(
            `Impossible de supprimer ce membre : ${leaves.length} congé(s) associé(s). ` +
            `Supprimez d'abord les congés.`
          );
        }
      }

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const members = result.data || [];
      const sha = result.sha;

      // Filtrage
      const filtered = members.filter((m) => m.id !== id);
      if (filtered.length === members.length) {
        throw new Error(`Membre non trouvé : ${id}`);
      }

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, filtered, sha);

      // Mise à jour du cache
      cache = filtered;
      cacheSha = sha;

      console.log(`[Members] Membre supprimé: ${id}`);
    } catch (error) {
      console.error('[Members] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Exposition sur window.Members
  window.Members = {
    getAll,
    add,
    update,
    delete: delete_,
    getById
  };

  console.log('Members module loaded');
})();
