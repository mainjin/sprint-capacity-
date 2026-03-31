// Module de gestion des congés journaliers.
// Pattern : IIFE exposée sur window.Leaves
// Modèle : { id, member_id, date, type, created_at }
// Note : 1 entrée par jour, pas par plage

(function () {
  const TYPE = 'leaves';
  const LEAVE_TYPES = ['CP', 'RTT', 'Maladie', 'Autre'];
  let cache = null;
  let cacheSha = null;

  /**
   * Génère un ID unique pour un congé.
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
   * Ajoute un jour à une date (YYYY-MM-DD).
   * @param {string} dateStr - Date au format YYYY-MM-DD
   * @returns {string} Jour suivant au format YYYY-MM-DD
   */
  function addDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return formatDate(date);
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
   * Vérifie si une date est un jour ouvré (lun-ven).
   * @param {string} dateStr - Date au format YYYY-MM-DD
   * @returns {boolean}
   */
  function isWorkingDay(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // 0=dim, 6=sam
  }

  /**
   * Valide les données d'un congé.
   * @param {object} data - Données à valider
   * @throws {Error} Si validation échoue
   */
  function validate(data) {
    const errors = [];

    if (!data.member_id || typeof data.member_id !== 'string' || !data.member_id.trim()) {
      errors.push('L\'ID du membre est obligatoire');
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push('La date doit être au format YYYY-MM-DD');
    }

    if (!data.type || !LEAVE_TYPES.includes(data.type)) {
      errors.push(`Le type doit être l'un de : ${LEAVE_TYPES.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Validation échouée : ${errors.join(', ')}`);
    }
  }

  /**
   * Récupère tous les congés (avec cache).
   * @returns {Promise<Array>}
   */
  async function getAll() {
    try {
      const result = await window.GitHubAPI.readFile(TYPE);
      cache = result.data || [];
      cacheSha = result.sha;
      console.log(`[Leaves] getAll: ${cache.length} entrées de congés en cache`);
      return cache;
    } catch (error) {
      console.error('[Leaves] Erreur lors de la lecture:', error);
      throw error;
    }
  }

  /**
   * Ajoute une plage de congés (une entrée par jour ouvré).
   * @param {string} memberId - ID du membre
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @param {string} type - Type de congé (CP, RTT, Maladie, Autre)
   * @returns {Promise<number>} Nombre de jours ajoutés
   */
  async function addRange(memberId, startDate, endDate, type) {
    try {
      console.log(`[Leaves] Ajout d'une plage : ${memberId} du ${startDate} au ${endDate}`);

      // Validation
      if (!memberId || typeof memberId !== 'string' || !memberId.trim()) {
        throw new Error('L\'ID du membre est obligatoire');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        throw new Error('La date de début doit être au format YYYY-MM-DD');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        throw new Error('La date de fin doit être au format YYYY-MM-DD');
      }
      if (!LEAVE_TYPES.includes(type)) {
        throw new Error(`Le type doit être l'un de : ${LEAVE_TYPES.join(', ')}`);
      }

      if (startDate > endDate) {
        throw new Error('La date de début doit être <= à la date de fin');
      }

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const leaves = result.data || [];
      const sha = result.sha;

      // Génération des entrées par jour ouvré
      const newLeaves = [];
      let current = startDate;
      let addedCount = 0;

      while (current <= endDate) {
        if (isWorkingDay(current)) {
          // Vérification de doublon
          const exists = leaves.some(
            (l) => l.member_id === memberId && l.date === current
          );

          if (!exists) {
            newLeaves.push({
              id: generateId(),
              member_id: memberId.trim(),
              date: current,
              type,
              created_at: now()
            });
            addedCount++;
          } else {
            console.warn(`[Leaves] Doublon détecté : ${memberId} le ${current}`);
          }
        }
        current = addDay(current);
      }

      // Sauvegarde
      if (addedCount > 0) {
        const updated = [...leaves, ...newLeaves];
        await window.GitHubAPI.writeFile(TYPE, updated, sha);

        // Mise à jour du cache
        cache = updated;
        cacheSha = sha;

        console.log(`[Leaves] ${addedCount} jour(s) de congés ajouté(s)`);
      } else {
        console.warn('[Leaves] Aucun jour ouvré à ajouter ou tous doublons');
      }

      return addedCount;
    } catch (error) {
      console.error('[Leaves] Erreur lors de l\'ajout de plage:', error);
      throw error;
    }
  }

  /**
   * Récupère un congé par ID.
   * @param {string} id - ID du congé
   * @returns {object|null}
   */
  function getById(id) {
    if (!cache) return null;
    return cache.find((l) => l.id === id) || null;
  }

  /**
   * Récupère tous les congés d'un membre.
   * @param {string} memberId - ID du membre
   * @returns {Promise<Array>}
   */
  async function getByMember(memberId) {
    await getAll();
    return cache.filter((l) => l.member_id === memberId);
  }

  /**
   * Compte les jours de congés d'un membre qui tombent dans la plage d'un sprint.
   * @param {string} sprintId - ID du sprint
   * @param {string} memberId - ID du membre
   * @returns {Promise<number>} Nombre de jours de congés dans le sprint
   */
  async function getBySprintAndMember(sprintId, memberId) {
    try {
      const sprint = window.Sprints?.getById(sprintId);
      if (!sprint) {
        console.warn(`[Leaves] Sprint non trouvé : ${sprintId}`);
        return 0;
      }

      await getAll();

      const leaves = cache.filter(
        (l) =>
          l.member_id === memberId &&
          l.date >= sprint.start_date &&
          l.date <= sprint.end_date
      );

      return leaves.length;
    } catch (error) {
      console.error('[Leaves] Erreur lors du comptage des congés par sprint:', error);
      return 0;
    }
  }

  /**
   * Supprime un congé par ID.
   * @param {string} id - ID du congé
   * @returns {Promise<void>}
   */
  async function delete_(id) {
    try {
      console.log(`[Leaves] Suppression du congé: ${id}`);

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const leaves = result.data || [];
      const sha = result.sha;

      // Filtrage
      const filtered = leaves.filter((l) => l.id !== id);
      if (filtered.length === leaves.length) {
        throw new Error(`Congé non trouvé : ${id}`);
      }

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, filtered, sha);

      // Mise à jour du cache
      cache = filtered;
      cacheSha = sha;

      console.log(`[Leaves] Congé supprimé: ${id}`);
    } catch (error) {
      console.error('[Leaves] Erreur lors de la suppression:', error);
      throw error;
    }
  }

  /**
   * Supprime tous les congés d'un membre pour une date donnée.
   * @param {string} memberId - ID du membre
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<void>}
   */
  async function deleteByMemberAndDate(memberId, date) {
    try {
      console.log(`[Leaves] Suppression du congé : ${memberId} le ${date}`);

      // Récupération de l'état actuel
      const result = await window.GitHubAPI.readFile(TYPE);
      const leaves = result.data || [];
      const sha = result.sha;

      // Filtrage
      const filtered = leaves.filter(
        (l) => !(l.member_id === memberId && l.date === date)
      );

      if (filtered.length === leaves.length) {
        throw new Error(`Aucun congé trouvé pour ce membre et cette date`);
      }

      // Sauvegarde
      await window.GitHubAPI.writeFile(TYPE, filtered, sha);

      // Mise à jour du cache
      cache = filtered;
      cacheSha = sha;

      console.log(`[Leaves] Congé(s) supprimé(s) : ${memberId} le ${date}`);
    } catch (error) {
      console.error('[Leaves] Erreur lors de la suppression par membre et date:', error);
      throw error;
    }
  }

  // Exposition sur window.Leaves
  window.Leaves = {
    getAll,
    addRange,
    delete: delete_,
    deleteByMemberAndDate,
    getById,
    getByMember,
    getBySprintAndMember,
    LEAVE_TYPES
  };

  console.log('Leaves module loaded');
})();
