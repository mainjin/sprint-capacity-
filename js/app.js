// Single Page Application pour Sprint Capacity
// Navigation et gestion des vues

const appEl = document.getElementById('app');
const navBtns = document.querySelectorAll('.nav-btn');
const formModal = document.getElementById('formModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');
const spinner = document.getElementById('spinner');

let currentView = 'dashboard';
let confirmCallback = null;

// ============= Utilitaires =============

function showSpinner() {
  spinner.style.display = 'flex';
}

function hideSpinner() {
  spinner.style.display = 'none';
}

function showError(message) {
  alert(`Erreur : ${message}`);
  console.error(message);
}

function handleApiError(error) {
  const message = error.message || 'Une erreur est survenue';
  
  // Si c'est une erreur 401, afficher le formulaire de token
  if (message.includes('401') || message.includes('Bad credentials')) {
    showError('Token GitHub invalide ou expiré. Veuillez configurer un nouveau token.');
    window.Auth.clearToken();
    renderTokenForm();
  } else {
    showError(message);
  }
}

function closeModal() {
  formModal.close();
}

function closeConfirm() {
  confirmModal.close();
  confirmCallback = null;
}

async function confirm(title, message, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = callback;
  confirmModal.showModal();
}

// ============= Vues =============

async function renderDashboardView() {
  showSpinner();
  try {
    const sprints = await window.Sprints.getAll();

    let html = '<div class="grid">';

    if (sprints.length === 0) {
      html += `
        <div class="card">
          <p style="text-align: center; color: var(--muted);">Aucun sprint disponible. Créez un sprint pour commencer.</p>
        </div>
      `;
    } else {
      html += `
        <div class="card card-wide">
          <h2>Vue récapitulative</h2>
          <div id="summaryContainer"></div>
        </div>

        <div class="card card-wide">
          <h2>Détail par sprint</h2>
          <label>
            Sprint :
            <select id="sprintSelector" style="margin-left: 0.5rem;">
              <option value="">-- Sélectionnez un sprint --</option>
              ${sprints.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </label>
          <div id="detailContainer" style="margin-top: 1rem;"></div>
        </div>
      `;
    }

    html += '</div>';
    appEl.innerHTML = html;

    if (sprints.length > 0) {
      await window.Dashboard.renderSummary('summaryContainer');
      document.getElementById('sprintSelector').addEventListener('change', async (e) => {
        const sprintId = e.target.value;
        if (sprintId) {
          const detailContainer = document.getElementById('detailContainer');
          await window.Dashboard.renderTable(sprintId, 'detailContainer');
        } else {
          document.getElementById('detailContainer').innerHTML = '';
        }
      });
    }
  } catch (error) {
    showError(error.message);
  } finally {
    hideSpinner();
  }
}

async function renderMembersView() {
  try {
    // Afficher immédiatement depuis le cache (pas de spinner)
    let members = window.Members.getAllFromCache();

    let html = `
      <div class="card card-wide">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">Membres (${members.length})</h2>
          <button id="addMemberBtn" class="btn">+ Ajouter</button>
        </div>
      </div>

      <div class="card card-wide">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Prénom</th>
              <th>Nom</th>
              <th>Rôle</th>
              <th>Taux</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${members
              .map(
                (m) => `
              <tr>
                <td>${m.firstname}</td>
                <td>${m.lastname}</td>
                <td>${m.role}</td>
                <td>${(m.occupancy_rate * 100).toFixed(0)}%</td>
                <td style="text-align: right;">
                  <button class="btn" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" data-member-edit="${m.id}">Modifier</button>
                  <button class="btn danger" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" data-member-delete="${m.id}">Supprimer</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    appEl.innerHTML = html;

    // Event listeners
    document.getElementById('addMemberBtn').addEventListener('click', () => {
      showMemberForm();
    });

    members.forEach((m) => {
      document.querySelector(`[data-member-edit="${m.id}"]`).addEventListener('click', () => {
        showMemberForm(m);
      });
      document.querySelector(`[data-member-delete="${m.id}"]`).addEventListener('click', () => {
        confirm('Supprimer ce membre ?', `Êtes-vous sûr de vouloir supprimer ${m.firstname} ${m.lastname} ?`, async () => {
          try {
            showSpinner();
            await window.Members.delete(m.id);
            closeConfirm();
            renderMembersView();
          } catch (error) {
            hideSpinner();
            handleApiError(error);
          }
        });
      });
    });

    // Recharger en arrière-plan
    window.Members.getAll().catch(err => {
      console.error('[App] Erreur lors du refresh des membres:', err);
      handleApiError(err);
    });
  } catch (error) {
    handleApiError(error);
  }
}

async function renderSprintsView() {
  try {
    // Afficher immédiatement depuis le cache
    const sprints = window.Sprints.getAllFromCache();

    let html = `
      <div class="card card-wide">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">Sprints (${sprints.length})</h2>
          <button id="addSprintBtn" class="btn">+ Ajouter</button>
        </div>
      </div>

      <div class="card card-wide">
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Début</th>
              <th>Fin</th>
              <th>STA</th>
              <th>MEP</th>
              <th>J. ouvrés</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sprints
              .map(
                (s) => `
              <tr>
                <td><strong>${s.name}</strong></td>
                <td>${s.start_date}</td>
                <td>${s.end_date}</td>
                <td>${s.sta_date}</td>
                <td>${s.mep_date}</td>
                <td style="text-align: center;">${s.working_days}</td>
                <td style="text-align: right;">
                  <button class="btn danger" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" data-sprint-delete="${s.id}">Supprimer</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    appEl.innerHTML = html;

    document.getElementById('addSprintBtn').addEventListener('click', () => {
      showSprintForm();
    });

    sprints.forEach((s) => {
      document.querySelector(`[data-sprint-delete="${s.id}"]`).addEventListener('click', () => {
        confirm('Supprimer ce sprint ?', `Êtes-vous sûr de vouloir supprimer ${s.name} ?`, async () => {
          try {
            showSpinner();
            await window.Sprints.delete(s.id);
            closeConfirm();
            renderSprintsView();
          } catch (error) {
            showError(error.message);
          } finally {
            hideSpinner();
          }
        });
      });
    });

    // Recharger en arrière-plan
    window.Sprints.getAll().catch(err => console.error('[App] Erreur lors du refresh des sprints:', err));
  } catch (error) {
    showError(error.message);
  }
}

async function renderLeavesView() {
  try {
    // Afficher immédiatement depuis le cache
    const members = window.Members.getAllFromCache();
    const leaves = window.Leaves.getAllFromCache();

    let html = `
      <div class="card card-wide">
        <h2 style="margin-top: 0;">Ajouter des congés</h2>
        <form id="leaveAddForm" class="stack" style="max-width: 500px;">
          <label>
            Membre :
            <select name="member_id" required style="width: 100%; margin-top: 0.25rem;">
              <option value="">-- Sélectionnez un membre --</option>
              ${members.map((m) => `<option value="${m.id}">${m.firstname} ${m.lastname}</option>`).join('')}
            </select>
          </label>
          <label>
            Date début :
            <input name="start_date" type="date" required style="width: 100%; margin-top: 0.25rem;" />
          </label>
          <label>
            Date fin :
            <input name="end_date" type="date" required style="width: 100%; margin-top: 0.25rem;" />
          </label>
          <label>
            Type :
            <select name="type" required style="width: 100%; margin-top: 0.25rem;">
              <option value="">-- Sélectionnez un type --</option>
              <option value="CP">CP</option>
              <option value="RTT">RTT</option>
              <option value="Maladie">Maladie</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <button type="submit" class="btn">Ajouter la plage</button>
        </form>
      </div>

      <div class="card card-wide">
        <h2 style="margin-top: 0;">Congés (${leaves.length} entrées)</h2>
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Date</th>
              <th>Type</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${leaves
              .map(
                (l) => `
              <tr>
                <td>${l.member_id}</td>
                <td>${l.date}</td>
                <td>${l.type}</td>
                <td style="text-align: right;">
                  <button class="btn danger" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;" data-leave-delete="${l.id}">Supprimer</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    appEl.innerHTML = html;

    // Form submission
    document.getElementById('leaveAddForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        showSpinner();
        const fd = new FormData(e.target);
        const added = await window.Leaves.addRange(
          fd.get('member_id'),
          fd.get('start_date'),
          fd.get('end_date'),
          fd.get('type')
        );
        alert(`${added} jour(s) de congé(s) ajouté(s)`);
        closeModal();
        setTimeout(() => renderLeavesView(), 100);
      } catch (error) {
        showError(error.message);
        hideSpinner();
      }
    });

    // Delete buttons
    leaves.forEach((l) => {
      const btn = document.querySelector(`[data-leave-delete="${l.id}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          confirm('Supprimer ce congé ?', `Supprimer le congé du ${l.date} ?`, async () => {
            try {
              showSpinner();
              await window.Leaves.delete(l.id);
              closeConfirm();
              renderLeavesView();
            } catch (error) {
              showError(error.message);
            } finally {
              hideSpinner();
            }
          });
        });
      }
    });

    // Recharger en arrière-plan
    Promise.all([
      window.Members.getAll().catch(err => console.error('[App] Erreur lors du refresh des membres:', err)),
      window.Leaves.getAll().catch(err => console.error('[App] Erreur lors du refresh des congés:', err))
    ]).catch(() => {});
  } catch (error) {
    showError(error.message);
  }
}

// ============= Formulaires Modals =============

function showMemberForm(member = null) {
  const isEdit = !!member;
  document.getElementById('modalTitle').textContent = isEdit ? 'Modifier le membre' : 'Ajouter un membre';

  let formHtml = `
    <input name="firstname" type="text" placeholder="Prénom" required value="${member?.firstname || ''}" />
    <input name="lastname" type="text" placeholder="Nom" required value="${member?.lastname || ''}" />
    <input name="role" type="text" placeholder="Rôle" required value="${member?.role || ''}" />
    <input name="occupancy_rate" type="number" min="0.1" max="1.0" step="0.1" placeholder="Taux (0.1-1.0)" required value="${member?.occupancy_rate || ''}" />
    <div style="display: flex; gap: 0.5rem;">
      <button type="submit" class="btn" style="flex: 1;">Enregistrer</button>
      <button type="button" class="btn secondary" style="flex: 1;">Annuler</button>
    </div>
  `;

  document.getElementById('dynamicForm').innerHTML = formHtml;
  document.getElementById('dynamicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSpinner();
      const fd = new FormData(e.target);
      if (isEdit) {
        await window.Members.update(member.id, {
          firstname: fd.get('firstname'),
          lastname: fd.get('lastname'),
          role: fd.get('role'),
          occupancy_rate: Number(fd.get('occupancy_rate'))
        });
      } else {
        await window.Members.add({
          firstname: fd.get('firstname'),
          lastname: fd.get('lastname'),
          role: fd.get('role'),
          occupancy_rate: Number(fd.get('occupancy_rate'))
        });
      }
      closeModal();
      // Afficher immédiatement avec le cache
      setTimeout(() => renderMembersView(), 100);
    } catch (error) {
      showError(error.message);
      hideSpinner();
    }
  });

  document.getElementById('dynamicForm').querySelector('button[type="button"]').addEventListener('click', closeModal);
  formModal.showModal();
}

function showSprintForm(sprint = null) {
  const isEdit = !!sprint;
  document.getElementById('modalTitle').textContent = isEdit ? 'Modifier le sprint' : 'Ajouter un sprint';

  let formHtml = `
    <input name="name" type="text" placeholder="Nom du sprint" required value="${sprint?.name || ''}" />
    <input name="start_date" type="date" required value="${sprint?.start_date || ''}" />
    <input name="end_date" type="date" required value="${sprint?.end_date || ''}" />
    <input name="sta_date" type="date" required value="${sprint?.sta_date || ''}" />
    <input name="mep_date" type="date" required value="${sprint?.mep_date || ''}" />
    <div style="display: flex; gap: 0.5rem;">
      <button type="submit" class="btn" style="flex: 1;">Enregistrer</button>
      <button type="button" class="btn secondary" style="flex: 1;">Annuler</button>
    </div>
  `;

  document.getElementById('dynamicForm').innerHTML = formHtml;
  document.getElementById('dynamicForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showSpinner();
      const fd = new FormData(e.target);
      if (isEdit) {
        await window.Sprints.update(sprint.id, {
          name: fd.get('name'),
          start_date: fd.get('start_date'),
          end_date: fd.get('end_date'),
          sta_date: fd.get('sta_date'),
          mep_date: fd.get('mep_date')
        });
      } else {
        await window.Sprints.add({
          name: fd.get('name'),
          start_date: fd.get('start_date'),
          end_date: fd.get('end_date'),
          sta_date: fd.get('sta_date'),
          mep_date: fd.get('mep_date')
        });
      }
      closeModal();
      // Afficher immédiatement avec le cache
      setTimeout(() => renderSprintsView(), 100);
    } catch (error) {
      showError(error.message);
      hideSpinner();
    }
  });

  document.getElementById('dynamicForm').querySelector('button[type="button"]').addEventListener('click', closeModal);
  formModal.showModal();
}

// ============= Navigation =============

function setActiveNav(viewName) {
  navBtns.forEach((btn) => {
    if (btn.dataset.view === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

async function changeView(viewName) {
  currentView = viewName;
  setActiveNav(viewName);

  switch (viewName) {
    case 'dashboard':
      await renderDashboardView();
      break;
    case 'members':
      await renderMembersView();
      break;
    case 'sprints':
      await renderSprintsView();
      break;
    case 'leaves':
      await renderLeavesView();
      break;
    default:
      await renderDashboardView();
  }
}

// ============= Événements =============

navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    changeView(btn.dataset.view);
  });
});

closeModalBtn.addEventListener('click', closeModal);
confirmCancel.addEventListener('click', closeConfirm);
confirmOk.addEventListener('click', async () => {
  if (confirmCallback) {
    await confirmCallback();
  }
  closeConfirm();
});

// ============= Initialisation =============

async function renderTokenForm() {
  const html = `
    <div class="card" style="max-width: 600px; margin: 3rem auto;">
      <h2>Configuration - Token GitHub</h2>
      <p>Pour utiliser cette application, vous devez fournir un token GitHub personnel.</p>
      
      <div style="background: #1f2937; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.85rem;">
        <strong>Comment obtenir un token :</strong>
        <ol style="margin: 0.5rem 0; padding-left: 1.5rem;">
          <li>Allez sur <a href="https://github.com/settings/tokens" target="_blank" style="color: #3b82f6;">GitHub Settings → Tokens (classic)</a></li>
          <li>Cliquez "Generate new token (classic)"</li>
          <li>Donner un nom (ex: "sprint-capacity")</li>
          <li>Sélectionnez le scope <strong>repo</strong> (accès complet aux dépôts)</li>
          <li>Cliquez "Generate token"</li>
          <li>Copiez le token <strong>(vous ne pourrez pas le revoir après)</strong></li>
        </ol>
      </div>

      <form id="tokenForm" class="stack">
        <label>
          Token GitHub :
          <input 
            name="token" 
            type="password" 
            placeholder="ghp_..." 
            required 
            style="width: 100%; margin-top: 0.25rem; font-family: monospace;" 
            autocomplete="off"
          />
        </label>
        <small style="color: var(--muted);">
          ✓ Le token est stocké <strong>localement</strong> en localStorage.<br/>
          ✓ Jamais envoyé à un serveur (sauf à api.github.com).<br/>
          ✓ Vous pouvez le révoquer à tout moment sur GitHub.
        </small>
        <button type="submit" class="btn" style="width: 100%;">Valider le token</button>
      </form>
    </div>
  `;
  
  appEl.innerHTML = html;
  document.querySelector('nav').style.display = 'none';
  
  document.getElementById('tokenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = document.querySelector('input[name="token"]').value.trim();
    
    if (!token) {
      showError('Le token ne peut pas être vide');
      return;
    }

    try {
      showSpinner();

      // Vérifier le token en essayant de récupérer le profil utilisateur
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Token invalide ou expiré');
      }

      const user = await response.json();
      console.log(`[Auth] Token valide pour l'utilisateur: ${user.login}`);

      // Stocker le token
      window.Auth.setToken(token);

      // Afficher l'interface
      hideSpinner();
      document.querySelector('nav').style.display = 'flex';
      await changeView('dashboard');
    } catch (error) {
      hideSpinner();
      showError(error.message);
    }
  });
}

async function bootstrap() {
  try {
    showSpinner();

    // Attendre que Auth soit disponible
    let attempts = 0;
    while (!window.Auth && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.Auth) {
      throw new Error('Module Auth non chargé');
    }

    // Vérifier si un token est présent
    if (!window.Auth.hasToken()) {
      hideSpinner();
      const nav = document.querySelector('nav');
      if (nav) nav.style.display = 'none';
      await renderTokenForm();
      return;
    }

    // Token présent : afficher l'interface
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'flex';
    await changeView('dashboard');
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    showError('Erreur lors du chargement de l\'application');
  } finally {
    hideSpinner();
  }
}

// Lancer l'app
bootstrap();
