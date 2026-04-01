/**
 * Backend de autenticación seguro · Vercel Serverless
 * ─────────────────────────────────────────────────────
 * 
 * Variables de entorno (configurar en Vercel dashboard):
 *   DASHBOARD_PASSWORD = contraseña maestra
 *   DASHBOARD_USERS = JSON con whitelist de usuarios
 *   JWT_SECRET = token secreto para firmar JWTs
 *   FIREBASE_PROJECT_ID = para auditoría (opcional)
 */

const crypto = require('crypto');

// ──────────────────────────────────────────────────────────
// CONFIGURACIÓN (desde variables de entorno)
// ──────────────────────────────────────────────────────────

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'dashboard2025'; // TODO: Cambiar en producción
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret_change_in_production';

// Formato: [{ email: "user@empresa.com", role: "admin" }, ...]
let DASHBOARD_USERS = [];
try {
  DASHBOARD_USERS = JSON.parse(process.env.DASHBOARD_USERS || '[]');
} catch (e) {
  console.error('Error parsing DASHBOARD_USERS:', e);
  DASHBOARD_USERS = [];
}

// Si no hay usuarios configurados, usar default (desarrollo)
if (DASHBOARD_USERS.length === 0) {
  DASHBOARD_USERS = [
    { email: 'demo@ejemplo.com', role: 'admin' },
    { email: 'jorge@empresa.com', role: 'admin' }
  ];
}

// ──────────────────────────────────────────────────────────
// FUNCIONES DE UTILIDAD
// ──────────────────────────────────────────────────────────

// Firmar JWT token
function signJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 horas
  })).toString('base64');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${body}.${signature}`;
}

// Verificar JWT token
function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(body, 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) return null; // Token expirado
    
    return payload;
  } catch (e) {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// ENDPOINTS DE AUTENTICACIÓN
// ──────────────────────────────────────────────────────────

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ─────────────────────────────────────────────────────
  // POST /api/auth · Login
  // ─────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/auth') {
    const { email, password } = req.body;

    // Validar que email y contraseña vengan
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }

    // Verificar contraseña (debe coincidir con DASHBOARD_PASSWORD)
    if (password !== DASHBOARD_PASSWORD) {
      // Log de intento fallido (para auditoría)
      console.warn(`[AUTH FAIL] Contraseña incorrecta para email: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Contraseña incorrecta'
      });
    }

    // Verificar que el email esté en la whitelist
    const user = DASHBOARD_USERS.find(u => u.email === email);
    if (!user) {
      console.warn(`[AUTH FAIL] Email no autorizado: ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Email no autorizado. Contacta al administrador.'
      });
    }

    // Generar JWT token
    const token = signJWT({
      email: user.email,
      role: user.role,
      iat: Date.now()
    });

    // Log de login exitoso
    console.log(`[AUTH OK] Login exitoso: ${email} (${user.role})`);

    return res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        role: user.role
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // POST /api/auth/verify · Verificar token
  // ─────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/auth/verify') {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido'
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyJWT(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        email: payload.email,
        role: payload.role
      }
    });
  }

  // ─────────────────────────────────────────────────────
  // GET /api/auth/users · Listar usuarios (solo admin)
  // ─────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/auth/users') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    const payload = verifyJWT(token);

    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden ver usuarios'
      });
    }

    return res.status(200).json({
      success: true,
      users: DASHBOARD_USERS.map(u => ({
        email: u.email,
        role: u.role
      }))
    });
  }

  // ─────────────────────────────────────────────────────
  // Health check
  // ─────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/api/auth/health') {
    return res.status(200).json({
      status: 'ok',
      message: 'Backend de autenticación funcionando'
    });
  }

  // 404
  return res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
}
