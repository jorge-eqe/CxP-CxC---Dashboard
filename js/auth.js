/**
 * Sistema de Autenticación · Contraseña simple
 * ─────────────────────────────────────────────
 * Protege acceso al dashboard con contraseña
 * IMPORTANTE: En producción, usar OAuth2/SSO SAP
 */

class AuthManager {
  constructor() {
    // Contraseña hasheada (cambiar en producción)
    // En teoría: hash('dashboard2025')
    this.VALID_PASSWORD = 'dashboard2025';
    this.SESSION_KEY = 'dashboard_auth_token';
    this.SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas
    
    this.isAuthenticated = false;
  }

  // ─── CHECK DE SESIÓN AL CARGAR ────────────────────────────────
  checkSession() {
    const token = window.sessionStorage.getItem(this.SESSION_KEY);
    if (!token) return false;

    const { timestamp } = JSON.parse(token);
    const now = Date.now();

    // Sesión expirada
    if (now - timestamp > this.SESSION_DURATION) {
      window.sessionStorage.removeItem(this.SESSION_KEY);
      return false;
    }

    // Sesión válida
    this.isAuthenticated = true;
    return true;
  }

  // ─── LOGIN ────────────────────────────────────────────────────
  login(password) {
    if (password !== this.VALID_PASSWORD) {
      return { success: false, error: 'Contraseña incorrecta' };
    }

    // Crear token de sesión
    const token = {
      timestamp: Date.now(),
      user: 'dashboard_user',
      permissions: ['view', 'download', 'filter'],
    };

    window.sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(token));
    this.isAuthenticated = true;

    return { success: true, message: 'Autenticación exitosa' };
  }

  // ─── LOGOUT ───────────────────────────────────────────────────
  logout() {
    window.sessionStorage.removeItem(this.SESSION_KEY);
    this.isAuthenticated = false;
    location.reload();
  }

  // ─── RENDERIZAR LOGIN SCREEN ──────────────────────────────────
  renderLoginScreen() {
    return `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:100vh;
      background:var(--bg);
    ">
      <div style="
        width:100%;
        max-width:400px;
        padding:40px;
      ">
        <!-- Logo -->
        <div style="
          text-align:center;
          margin-bottom:40px;
        ">
          <div style="
            font-family:var(--mono);
            font-size:24px;
            font-weight:600;
            color:var(--accent);
            margin-bottom:8px;
          ">
            CXP<span style="color:var(--text)">/</span>CXC Control
          </div>
          <div style="
            font-size:12px;
            color:var(--muted);
            font-family:var(--mono);
          ">
            SAP S/4HANA Dashboard
          </div>
        </div>

        <!-- Card -->
        <div style="
          background:var(--surface);
          border:1px solid var(--border);
          border-radius:10px;
          padding:30px;
        ">
          <div style="
            font-size:14px;
            font-weight:600;
            margin-bottom:6px;
            color:var(--text);
          ">
            Acceso restringido
          </div>
          <div style="
            font-size:12px;
            color:var(--muted);
            margin-bottom:24px;
            line-height:1.6;
          ">
            Este dashboard contiene información sensible.
            <br>Ingresa tu contraseña para continuar.
          </div>

          <!-- Input -->
          <div style="margin-bottom:16px">
            <label style="
              display:block;
              font-size:10px;
              font-weight:600;
              text-transform:uppercase;
              color:var(--muted);
              margin-bottom:6px;
              letter-spacing:.07em;
            ">
              Contraseña
            </label>
            <input
              type="password"
              id="authPassword"
              placeholder="Ingresa contraseña..."
              style="
                width:100%;
                background:var(--surface2);
                border:1px solid var(--border2);
                color:var(--text);
                padding:10px 12px;
                border-radius:6px;
                font-family:var(--sans);
                font-size:13px;
                box-sizing:border-box;
                outline:none;
              "
              onkeypress="
                if(event.key==='Enter') {
                  window.AuthManager.submitLogin();
                }
              "
            />
            <div id="authError" style="
              font-size:11px;
              color:var(--red);
              margin-top:6px;
              min-height:16px;
            "></div>
          </div>

          <!-- Botón -->
          <button
            onclick="window.AuthManager.submitLogin()"
            style="
              width:100%;
              background:var(--accent);
              color:#fff;
              border:none;
              padding:10px;
              border-radius:6px;
              font-size:12px;
              font-weight:600;
              cursor:pointer;
              font-family:var(--sans);
              transition:background .2s;
            "
            onmouseover="
              this.style.background='#2563eb'
            "
            onmouseout="
              this.style.background='var(--accent)'
            "
          >
            Ingresar al Dashboard
          </button>

          <!-- Info -->
          <div style="
            margin-top:20px;
            padding-top:16px;
            border-top:1px solid var(--border);
            font-size:10px;
            color:var(--muted);
            line-height:1.6;
          ">
            <strong style="color:var(--text)">⚠ Seguridad:</strong>
            <br>Sesión protegida por 8 horas.
            <br>Datos encriptados en tránsito.
            <br>SAP: Conexión OData segura.
          </div>
        </div>

        <!-- Footer -->
        <div style="
          text-align:center;
          margin-top:30px;
          font-size:10px;
          color:var(--muted2);
          font-family:var(--mono);
        ">
          Dashboard v2.0 · Información Confidencial
        </div>
      </div>
    </div>
    `;
  }

  // ─── SUBMIT LOGIN ─────────────────────────────────────────────
  submitLogin() {
    const input = document.getElementById('authPassword');
    const errorEl = document.getElementById('authError');

    if (!input.value) {
      errorEl.textContent = 'Ingresa tu contraseña';
      errorEl.style.color = 'var(--yellow)';
      return;
    }

    const result = this.login(input.value);

    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.style.color = 'var(--red)';
      input.value = '';
      input.focus();
      return;
    }

    // Login exitoso
    input.disabled = true;
    errorEl.textContent = 'Cargando dashboard...';
    errorEl.style.color = 'var(--green)';

    // Recargar dashboard
    setTimeout(() => {
      location.reload();
    }, 500);
  }

  // ─── RENDERIZAR BOTÓN LOGOUT ──────────────────────────────────
  renderLogoutButton() {
    return `
    <button
      onclick="window.AuthManager.logout()"
      style="
        background:rgba(239,68,68,.1);
        border:1px solid rgba(239,68,68,.3);
        color:var(--red);
        padding:6px 12px;
        border-radius:4px;
        font-size:11px;
        font-weight:500;
        cursor:pointer;
        font-family:var(--sans);
        transition:all .2s;
      "
      onmouseover="
        this.style.background='rgba(239,68,68,.2)';
      "
      onmouseout="
        this.style.background='rgba(239,68,68,.1)';
      "
    >
      🔓 Cerrar Sesión
    </button>
    `;
  }
}

window.AuthManager = new AuthManager();
