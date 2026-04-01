/**
 * Sistema de Autenticación · Backend JWT
 * ─────────────────────────────────────────────
 * Auenticación segura con backend Vercel + JWT
 * - Email + Password validados en backend
 * - Whitelist de emails autorizados
 * - JWT tokens con 8-horas de expiración
 * - Roles: admin, viewer (control granular)
 */

class AuthManager {
  constructor() {
    this.SESSION_KEY = 'dashboard_jwt_token';
    this.USER_KEY = 'dashboard_user_info';
    this.API_BASE = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : ''; // En producción use ruta relativa /api/auth
    
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  // ─── CHECK DE SESIÓN AL CARGAR ────────────────────────────────
  async checkSession() {
    const token = window.sessionStorage.getItem(this.SESSION_KEY);
    if (!token) return false;

    try {
      // Verificar token en backend
      const response = await fetch(`${this.API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        window.sessionStorage.removeItem(this.SESSION_KEY);
        window.sessionStorage.removeItem(this.USER_KEY);
        return false;
      }

      const data = await response.json();
      this.isAuthenticated = true;
      this.currentUser = data.user;
      return true;
    } catch (error) {
      console.error('[AUTH] Error verificando sesión:', error);
      return false;
    }
  }

  // ─── LOGIN (ASYNC - BACKEND) ──────────────────────────────────
  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error || 'Error en autenticación'
        };
      }

      // Almacenar JWT y datos de usuario
      window.sessionStorage.setItem(this.SESSION_KEY, data.token);
      window.sessionStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

      this.isAuthenticated = true;
      this.currentUser = data.user;

      console.log(`[AUTH] Login exitoso: ${email} (${data.user.role})`);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('[AUTH] Error en login:', error);
      return { 
        success: false, 
        error: 'Error de conexión con servidor'
      };
    }
  }

  // ─── LOGOUT ───────────────────────────────────────────────────
  logout() {
    const user = this.currentUser?.email || 'unknown';
    console.log(`[AUTH] Logout: ${user}`);
    
    window.sessionStorage.removeItem(this.SESSION_KEY);
    window.sessionStorage.removeItem(this.USER_KEY);
    this.isAuthenticated = false;
    this.currentUser = null;
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
            <br>Autentica con tu email para continuar.
          </div>

          <!-- Email Input -->
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
              Email
            </label>
            <input
              type="email"
              id="authEmail"
              placeholder="tu@email.com"
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
            />
          </div>

          <!-- Password Input -->
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
              placeholder="Contraseña..."
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
            id="authSubmitBtn"
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
            <strong style="color:var(--text)">🔐 Seguridad:</strong>
            <br>✓ Autenticación JWT (backend)
            <br>✓ Email whitelist (acceso controlado)
            <br>✓ Sesión 8 horas (HTTPS)
            <br>✓ Roles: Admin • Viewer
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
          Dashboard v2.1 · Información Confidencial
        </div>
      </div>
    </div>
    `;
  }

  // ─── SUBMIT LOGIN (ASYNC) ─────────────────────────────────────
  async submitLogin() {
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    // Validar inputs
    if (!emailInput.value || !passwordInput.value) {
      errorEl.textContent = 'Por favor ingresa email y contraseña';
      errorEl.style.color = 'var(--yellow)';
      return;
    }

    // Deshabilitar botón
    submitBtn.disabled = true;
    submitBtn.textContent = 'Autenticando...';

    // Llamar login async
    const result = await this.login(emailInput.value, passwordInput.value);

    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.style.color = 'var(--red)';
      passwordInput.value = '';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar al Dashboard';
      return;
    }

    // Login exitoso
    errorEl.textContent = '✓ Autenticación exitosa. Cargando...';
    errorEl.style.color = 'var(--green)';

    // Recargar dashboard
    setTimeout(() => {
      location.reload();
    }, 800);
  }

  // ─── RENDERIZAR BOTÓN LOGOUT ──────────────────────────────────
  renderLogoutButton() {
    const email = this.currentUser?.email || 'Usuario';
    const role = this.currentUser?.role === 'admin' ? '👤 Admin' : '👁️ Viewer';
    
    return `
    <div style="display:flex; gap:12px; align-items:center;">
      <span style="
        font-size:10px;
        color:var(--muted);
        font-family:var(--mono);
      ">
        ${role} • ${email}
      </span>
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
        🔓 Cerrar
      </button>
    </div>
    `;
  }
}

window.AuthManager = new AuthManager();
