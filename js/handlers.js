/**
 * Manejadores de eventos · Upload, filtros, etc.
 * ────────────────────────────────────────────
 */

// ─── DRAG & DROP Y FILE UPLOAD ──────────────────────────────────
function dragOver(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.classList.add('drag-over');
}

function dragLeave(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('drag-over');
}

function dropFile(e, module) {
  e.preventDefault();
  dragLeave('drop' + module);
  const files = e.dataTransfer.files;
  if (files[0]) handleFile({ target: { files } }, module);
}

async function handleFile(e, module) {
  const file = e.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('status' + module);
  const fileInput = document.getElementById('file' + module);

  try {
    statusEl.className = 'up-status';
    statusEl.textContent = 'Procesando archivo...';

    const result = await window.FileUploadManager.processFile(file, module);

    statusEl.className = 'up-status ok';
    statusEl.textContent = `✓ ${result.rows.length} partidas leídas · ${result.headers.length} columnas`;

    // Habilitar botón de carga
    const loadBtn = document.querySelector(`button[onclick*="loadFile('${module}')"]`);
    if (loadBtn) loadBtn.disabled = false;
  } catch (err) {
    statusEl.className = 'up-status err';
    statusEl.textContent = `✗ ${err.message}`;
    console.error(err);
  }
}

async function loadFile(module) {
  const statusEl = document.getElementById('status' + module);

  try {
    const result = window.FileUploadManager.applyData(module);
    statusEl.className = 'up-status ok';
    statusEl.textContent = `✓ ${result.rowsLoaded} partidas cargadas · navega a ${module === 'AP' ? 'CXP' : 'CXC'}`;

    window.UIRenderer.updateSourceIndicator();
    window.UIRenderer.updateSocietySelector();
    window.UIRenderer.updateAlertBadge();

    setTimeout(() => setPage(module === 'AP' ? 'cxp' : 'cxc'), 500);
  } catch (err) {
    statusEl.className = 'up-status err';
    statusEl.textContent = `✗ ${err.message}`;
  }
}

// ─── INICIALIZACIÓN EN LOAD ────────────────────────────────────
function setupFileHandlers() {
  const dropAP = document.getElementById('dropAP');
  const dropAR = document.getElementById('dropAR');
  const fileAP = document.getElementById('fileAP');
  const fileAR = document.getElementById('fileAR');

  if (dropAP) {
    dropAP.addEventListener('click', () => fileAP?.click());
  }
  if (dropAR) {
    dropAR.addEventListener('click', () => fileAR?.click());
  }
}

// ─── INICIALIZACIÓN GLOBAL ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. VERIFICAR AUTENTICACIÓN (PRIMERO)
    const isAuthenticated = window.AuthManager.checkSession();
    
    if (!isAuthenticated) {
      // Mostrar login screen
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.innerHTML = window.AuthManager.renderLoginScreen();
      }
      console.log('Usuario no autenticado · mostrando login');
      return;
    }

    // 2. Usuario autenticado — inicializar dashboard
    // Inicializar UI
    window.UIRenderer.init('#mainContent');

    // Restaurar estado persistente
    window.DashboardData.restoreState();

    // Actualizar controles
    window.UIRenderer.updateSocietySelector();
    window.UIRenderer.updateSourceIndicator();
    window.UIRenderer.updateAlertBadge();

    // Navegar a página por defecto
    setPage(window.DashboardData.state.currentPage);

    // Configurar eventos globales
    document.getElementById('socFilter')?.addEventListener('change', (e) => {
      setSociedad(e.target.value);
    });

    // Agregar botón logout en topbar
    const tright = document.querySelector('.tright');
    if (tright) {
      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = '↗ Logout';
      logoutBtn.style.cssText = 'background:var(--surface2);color:var(--text);border:1px solid var(--border);padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-family:var(--sans);transition:all .15s';
      logoutBtn.addEventListener('mouseover', () => logoutBtn.style.borderColor = 'var(--accent)');
      logoutBtn.addEventListener('mouseout', () => logoutBtn.style.borderColor = 'var(--border)');
      logoutBtn.addEventListener('click', () => {
        window.AuthManager.logout();
        location.reload(true);
      });
      tright.appendChild(logoutBtn);
    }

    console.log('CXP/CXC Dashboard inicializado ✓ (Usuario autenticado)');
  } catch (err) {
    console.error('Error en inicialización', err);
    if (window.UIRenderer?.showError) {
      window.UIRenderer.showError('Error al inicializar el dashboard');
    }
  }
});

// Exportar en window para acceso global
window.dragOver = dragOver;
window.dragLeave = dragLeave;
window.dropFile = dropFile;
window.handleFile = handleFile;
window.loadFile = loadFile;
window.setupFileHandlers = setupFileHandlers;
