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
  showSpinner();
  try {
    const members = await window.Members.getAll();

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
            showError(error.message);
          } finally {
            hideSpinner();
          }
        });
      });
    });
  } catch (error) {
    showError(error.message);
  } finally {
    hideSpinner();
  }
}

async function renderSprintsView() {
  showSpinner();
  try {
    const sprints = await window.Sprints.getAll();

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
  } catch (error) {
    showError(error.message);
  } finally {
    hideSpinner();
  }
}

async function renderLeavesView() {
  showSpinner();
  try {
    const members = await window.Members.getAll();
    const leaves = await window.Leaves.getAll();

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
        renderLeavesView();
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
  } catch (error) {
    showError(error.message);
  } finally {
    hideSpinner();
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
      renderMembersView();
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
      renderSprintsView();
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

async function bootstrap() {
  try {
    showSpinner();

    // Afficher l'interface directement
    document.querySelector('nav').style.display = 'flex';
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
