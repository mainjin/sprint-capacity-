// Module de gestion des sprints avec calcul automatique des jours ouvrés.
// Pattern : IIFE exposée sur window.Sprints
// Modèle : { id, name, start_date, end_date, sta_date, mep_date, working_days, created_at }

(function () {
  const TYPE = 'sprints';
  let cache = null;
  let cacheSha = null;

  /**
   * Génère un ID unique pour un sprint.
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
   * Compte les jours ouvrés (lun-ven) entre deux dates (inclusives).
   * Les deux dates doivent être au format YYYY-MM-DD.
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @returns {number} Nombre de jours ouvrés
   */
  function countWorkingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new Error('La date de début doit être <= à la date de fin');
    }

    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = dimanche, 1 = lundi, ..., 5 = samedi, 6 = dimanche
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Formate une date JavaScript en YYYY-MM-DD.
   * @param {Date} date - Objet Date
   * @returns {string}
   */
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Valide les données d'un sprint.
   * @param {object} data - Données à valider
   * @throws {Error} Si validation échoue
   */
  function validate(data) {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Le nom du sprint est obligatoire');
    }

    if (!data.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
      errors.push('La date de début doit être au format YYYY-MM-DD');
    }

    if (!data.end_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.end_date)) {
      errors.push('La date de fin doit être au format YYYY-MM-DD');
    }

    if (!data.sta_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.sta_date)) {
      errors.push('La date STA doit être au format YYYY-MM-DD');
    }

    if (!data.mep_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.mep_date)) {
      errors.push('La date MEP doit être au format YYYY-MM-DD');
    }

    // Vérifications logiques si les dates sont valides
    if (data.start_date && data.end_date && data.start_date >= data.end_date) {
      errors.push('La date de fin doit être strictement après la date de début');
    }

    if (data.end_date && data.sta_date && data.sta_date < data.end_date) {
      errors.push('La date STA doit être >= à la date de fin');
    }

    if (data.sta_date && data.mep_date && data.mep_date < data.sta_date) {
      errors.push('La date MEP doit être >= à la date STA');
    }

    if (errors.length > 0) {
      throw new Error(`Validation échouée : ${errors.join(', ')}`);
    }
  }

  /**
   * Récupère tous les sprints triés par start_date (avec cache).
   * @returns {Promise<Array>}
   */
  async function getAll() {
    try {
      const result = await window.GitHubAPI.readFile(TYPE);
      const sprints = result.data || [];
      cacheSha = result.sha;

      // Tri par start_date ASC
      cache = sprints.sort((a, b) => a.start_date.localeCompare(b.start_date));

      console.log(`[Sprints] getAll: ${cache.length} sprints en cache (triés)`);
      return cache;
    } catch (error) {
      console.error('[Sprints] Erreur lors de la lecture:', error);
      throw error;
    }
  }

  /**
   * Ajoute un nouveau sprint.
   * Calcule automatiquement working_days.
   * @param {object} sprintData - { name, start_date, end_date, sta_date, mep_date }
   * @returns {Promise<object>} Le sprint créé
   */
  async function add(sprintData) {
    try {
      console.log('[Sprints] Ajout d\'un nouveau sprint');

      // Validation
      validate(sprintData);

      // Calcul des jours ouvrés
      const workingDays = countWorkingDays(sprintData.start_date, sprintData.end_date);

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const sprints = result.data || [];
      const sha = result.sha;

      // Création du nouveau sprint
      const sprint = {
        id: generateId(),
        name: sprintData.name.trim(),
        start_date: sprintData.start_date,
        end_date: sprintData.end_date,
        sta_date: sprintData.sta_date,
        mep_date: sprintData.mep_date,
        working_days: workingDays,
        created_at: now()
      };

      // Ajout et sauvegarde
      sprints.push(sprint);
      await window.GitHubAPI.writeFile(TYPE, sprints, sha);

      // Mise à jour du cache
      cache = sprints.sort((a, b) => a.start_date.localeCompare(b.start_date));
      cacheSha = sha;

      console.log(`[Sprints] Sprint créé: ${sprint.id} (${workingDays} jours ouvrés)`);
      return sprint;
    } catch (error) {
      console.error('[Sprints] Erreur lors de l\'ajout:', error);
      throw error;
    }
  }

  /**
   * Récupère un sprint par ID.
   * @param {string} id - ID du sprint
   * @returns {object|null}
   */
  function getById(id) {
    if (!cache) return null;
    return cache.find((s) => s.id === id) || null;
  }

  /**
   * Met à jour un sprint existant.
   * Recalcule working_days si les dates changent.
   * @param {string} id - ID du sprint
   * @param {object} sprintData - Données à fusionner
   * @returns {Promise<object>} Le sprint mis à jour
   */
  async function update(id, sprintData) {
    try {
      console.log(`[Sprints] Mise à jour du sprint: ${id}`);

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const sprints = result.data || [];
      const sha = result.sha;

      // Recherche du sprint
      const sprintIndex = sprints.findIndex((s) => s.id === id);
      if (sprintIndex === -1) {
        throw new Error(`Sprint non trouvé : ${id}`);
      }

      const original = sprints[sprintIndex];

      // Fusion des données avec les valeurs actuelles
      const merged = {
        name: sprintData.name !== undefined ? sprintData.name : original.name,
        start_date: sprintData.start_date !== undefined ? sprintData.start_date : original.start_date,
        end_date: sprintData.end_date !== undefined ? sprintData.end_date : original.end_date,
        sta_date: sprintData.sta_date !== undefined ? sprintData.sta_date : original.sta_date,
        mep_date: sprintData.mep_date !== undefined ? sprintData.mep_date : original.mep_date
      };

      // Validation des données fusionnées
      validate(merged);

      // Recalcul des jours ouvrés
      const workingDays = countWorkingDays(merged.start_date, merged.end_date);

      // Construction de l'objet mis à jour
      const updated = Object.assign({}, original, merged, {
        id,
        working_days: workingDays,
        created_at: original.created_at
      });

      sprints[sprintIndex] = updated;

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, sprints, sha);

      // Mise à jour du cache
      cache = sprints.sort((a, b) => a.start_date.localeCompare(b.start_date));
      cacheSha = sha;

      console.log(`[Sprints] Sprint mis à jour: ${id} (${workingDays} jours ouvrés)`);
      return updated;
    } catch (error) {
      console.error('[Sprints] Erreur lors de la mise à jour:', error);
      throw error;
    }
  }

  /**
   * Supprime un sprint.
   * Vérifie d'abord qu'aucun congé n'est associé à ce sprint.
   * @param {string} id - ID du sprint
   * @returns {Promise<void>}
   */
  async function delete_(id) {
    try {
      console.log(`[Sprints] Suppression du sprint: ${id}`);

      // Vérification des congés associés
      if (window.Leaves && window.Leaves.getAll) {
        const leaves = await window.Leaves.getAll();
        const sprintLeaves = leaves.filter(
          (l) => l.date >= sprint.start_date && l.date <= sprint.end_date
        );
        if (sprintLeaves.length > 0) {
          throw new Error(
            `Impossible de supprimer ce sprint : ${sprintLeaves.length} congé(s) associé(s). ` +
            `Supprimez d'abord les congés.`
          );
        }
      }

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const sprints = result.data || [];
      const sha = result.sha;

      // Filtrage
      const filtered = sprints.filter((s) => s.id !== id);
      if (filtered.length === sprints.length) {
        throw new Error(`Sprint non trouvé : ${id}`);
      }

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, filtered, sha);

      // Mise à jour du cache
      cache = filtered.sort((a, b) => a.start_date.localeCompare(b.start_date));
      cacheSha = sha;

      console.log(`[Sprints] Sprint supprimé: ${id}`);
    } catch (error) {
      console.error('[Sprints] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Exposition sur window.Sprints
  window.Sprints = {
    getAll,
    add,
    update,
    delete: delete_,
    getById,
    countWorkingDays
  };

  console.log('Sprints module loaded');
})();
