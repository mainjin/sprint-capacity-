// Module de calcul et affichage de la capacité par sprint.
// Pattern : IIFE exposée sur window.Dashboard
// Formule : capacité = (working_days - jours_congés) × occupancy_rate

(function () {
  /**
   * Arrondit à 1 décimale.
   * @param {number} value
   * @returns {number}
   */
  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  /**
   * Calcule la capacité totale d'un sprint.
   * @param {string} sprintId - ID du sprint
   * @returns {Promise<object>} Objet avec capacités par membre et par rôle
   */
  async function computeSprintCapacity(sprintId) {
    try {
      console.log(`[Dashboard] Calcul de capacité pour sprint: ${sprintId}`);

      // Récupération du sprint (doit charger d'abord)
      const sprints = await window.Sprints.getAll();
      const sprint = sprints.find(s => s.id === sprintId);
      if (!sprint) {
        throw new Error(`Sprint non trouvé : ${sprintId}`);
      }

      // Récupération des membres
      const members = await window.Members.getAll();
      if (!members || members.length === 0) {
        console.warn('[Dashboard] Aucun membre trouvé');
        return {
          sprint,
          total_capacity: 0,
          by_member: [],
          by_role: {}
        };
      }

      // Calcul de la capacité par membre
      const by_member = [];
      let total_capacity = 0;
      const by_role = {};

      for (const member of members) {
        // Récupération des jours de congés sur ce sprint
        const leave_days = await window.Leaves.getBySprintAndMember(sprintId, member.id);

        // Calcul des jours disponibles et de la capacité
        const available_days = sprint.working_days - leave_days;
        const capacity = round1(available_days * member.occupancy_rate);

        by_member.push({
          member,
          leave_days,
          available_days: round1(available_days),
          capacity
        });

        total_capacity += capacity;

        // Agrégation par rôle
        if (!by_role[member.role]) {
          by_role[member.role] = { capacity: 0, members_count: 0 };
        }
        by_role[member.role].capacity += capacity;
        by_role[member.role].members_count += 1;
      }

      // Arrondir le total
      total_capacity = round1(total_capacity);

      // Arrondir les capacités par rôle
      Object.keys(by_role).forEach((role) => {
        by_role[role].capacity = round1(by_role[role].capacity);
      });

      console.log(`[Dashboard] Capacité totale: ${total_capacity}j`);

      return {
        sprint,
        total_capacity,
        by_member,
        by_role
      };
    } catch (error) {
      console.error('[Dashboard] Erreur lors du calcul de capacité:', error);
      throw error;
    }
  }

  /**
   * Génère et affiche un tableau de capacité pour un sprint.
   * @param {string} sprintId - ID du sprint
   * @param {string} containerId - ID du conteneur cible
   * @returns {Promise<void>}
   */
  async function renderTable(sprintId, containerId) {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Conteneur non trouvé : ${containerId}`);
      }

      const data = await computeSprintCapacity(sprintId);

      // Entête du tableau
      let html = `
        <div style="margin-bottom: 1rem;">
          <h3>${data.sprint.name}</h3>
          <small>${data.sprint.start_date} → ${data.sprint.end_date} (${data.sprint.working_days} j ouvrés)</small>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <thead>
            <tr style="border-bottom: 2px solid #3b82f6; background: #1f2937;">
              <th style="text-align: left; padding: 0.5rem;">Membre</th>
              <th style="text-align: center; padding: 0.5rem;">Rôle</th>
              <th style="text-align: center; padding: 0.5rem;">Taux %</th>
              <th style="text-align: center; padding: 0.5rem;">Congés</th>
              <th style="text-align: center; padding: 0.5rem;">Capacité (j)</th>
            </tr>
          </thead>
          <tbody>
      `;

      // Lignes des membres
      data.by_member.forEach((row) => {
        const member = row.member;
        const occupancyPercent = Math.round(member.occupancy_rate * 100);
        html += `
          <tr style="border-bottom: 1px solid #374151;">
            <td style="padding: 0.5rem;">${member.firstname} ${member.lastname}</td>
            <td style="text-align: center; padding: 0.5rem;">${member.role}</td>
            <td style="text-align: center; padding: 0.5rem;">${occupancyPercent}%</td>
            <td style="text-align: center; padding: 0.5rem;">${row.leave_days}j</td>
            <td style="text-align: center; padding: 0.5rem; font-weight: bold; color: #60a5fa;">${row.capacity}j</td>
          </tr>
        `;
      });

      // Ligne de total
      html += `
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #3b82f6; background: #0b1220; font-weight: bold;">
              <td colspan="4" style="text-align: right; padding: 0.5rem;">TOTAL</td>
              <td style="text-align: center; padding: 0.5rem; color: #34d399;">${data.total_capacity}j</td>
            </tr>
          </tfoot>
        </table>
      `;

      // Résumé par rôle
      if (Object.keys(data.by_role).length > 0) {
        html += `
          <div style="margin-top: 1rem;">
            <h4>Par rôle</h4>
            <ul style="list-style: none; padding: 0; font-size: 0.9rem;">
        `;

        Object.entries(data.by_role).forEach(([role, info]) => {
          html += `
            <li style="padding: 0.25rem 0;">
              <strong>${role}</strong> : ${info.capacity}j (${info.members_count} membre${info.members_count > 1 ? 's' : ''})
            </li>
          `;
        });

        html += `
            </ul>
          </div>
        `;
      }

      container.innerHTML = html;
      console.log(`[Dashboard] Tableau rendu pour sprint: ${sprintId}`);
    } catch (error) {
      console.error('[Dashboard] Erreur lors du rendu du tableau:', error);
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `<small style="color: #ef4444;">Erreur : ${error.message}</small>`;
      }
    }
  }

  /**
   * Génère et affiche un résumé récapitulatif de tous les sprints en colonnes.
   * @param {string} containerId - ID du conteneur cible
   * @returns {Promise<void>}
   */
  async function renderSummary(containerId) {
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Conteneur non trouvé : ${containerId}`);
      }

      // Récupération des données
      const sprints = await window.Sprints.getAll();
      const members = await window.Members.getAll();

      if (!sprints.length || !members.length) {
        container.innerHTML = '<small>Pas de données disponibles.</small>';
        return;
      }

      // Entête du tableau
      let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="border-bottom: 2px solid #3b82f6; background: #1f2937;">
              <th style="text-align: left; padding: 0.5rem; min-width: 150px;">Membre</th>
      `;

      // Colonnes des sprints
      sprints.forEach((sprint) => {
        html += `<th style="text-align: center; padding: 0.5rem; min-width: 100px;">${sprint.name}</th>`;
      });

      html += `
            </tr>
          </thead>
          <tbody>
      `;

      // Ligne par membre
      let totalsPerSprint = {};
      sprints.forEach((s) => {
        totalsPerSprint[s.id] = 0;
      });

      for (const member of members) {
        html += `
          <tr style="border-bottom: 1px solid #374151;">
            <td style="padding: 0.5rem;"><strong>${member.firstname} ${member.lastname}</strong></td>
        `;

        for (const sprint of sprints) {
          const leave_days = await window.Leaves.getBySprintAndMember(sprint.id, member.id);
          const available_days = sprint.working_days - leave_days;
          const capacity = round1(available_days * member.occupancy_rate);
          totalsPerSprint[sprint.id] += capacity;

          html += `<td style="text-align: center; padding: 0.5rem;">${capacity}j</td>`;
        }

        html += `</tr>`;
      }

      // Ligne de total
      html += `
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #3b82f6; background: #0b1220; font-weight: bold;">
              <td style="padding: 0.5rem;">TOTAL</td>
      `;

      sprints.forEach((sprint) => {
        const total = round1(totalsPerSprint[sprint.id]);
        html += `
          <td style="text-align: center; padding: 0.5rem; color: #34d399;">${total}j</td>
        `;
      });

      html += `
            </tr>
          </tfoot>
        </table>
      `;

      container.innerHTML = html;
      console.log('[Dashboard] Résumé rendu');
    } catch (error) {
      console.error('[Dashboard] Erreur lors du rendu du résumé:', error);
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `<small style="color: #ef4444;">Erreur : ${error.message}</small>`;
      }
    }
  }

  // Exposition sur window.Dashboard
  window.Dashboard = {
    computeSprintCapacity,
    renderTable,
    renderSummary
  };

  console.log('Dashboard module loaded');
})();
