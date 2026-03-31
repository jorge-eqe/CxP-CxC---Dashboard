# CXP / CXC Control · SAP S/4HANA

Dashboard de control de cuentas por pagar y por cobrar con aging automático,
alertas de signo, conciliación y validación GL. Multi-sociedad y multi-moneda.

**Stack actual:** HTML estático · carga manual CSV/Excel desde SAP  
**Siguiente fase:** API OData SAP S/4HANA Cloud + backend Node.js + Supabase

---

## 🚀 Deploy en GitHub Pages — paso a paso

### Paso 1 · Crear el repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Clic en **+** (esquina superior derecha) → **New repository**
3. Configura:
   - **Repository name:** `cxp-cxc-dashboard`
   - **Visibility:** Private ✓ (recomendado — datos financieros)
   - **NO** marques "Initialize with README" (ya traemos uno)
4. Clic en **Create repository**

---

### Paso 2 · Subir los archivos

GitHub Pages funciona con el archivo `index.html` en la raíz del repo.

**Opción A — Desde el navegador (sin instalar nada):**

1. En tu repo recién creado, clic en **uploading an existing file**
2. Arrastra los archivos `index.html` y `README.md`
3. En "Commit changes" escribe: `feat: dashboard inicial CXP/CXC`
4. Clic en **Commit changes**

**Opción B — Con Git desde terminal:**

```bash
# En la carpeta donde descargaste los archivos:
git init
git add .
git commit -m "feat: dashboard inicial CXP/CXC"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cxp-cxc-dashboard.git
git push -u origin main
```

---

### Paso 3 · Activar GitHub Pages

1. En tu repo, ve a **Settings** (pestaña superior)
2. En el menú izquierdo, clic en **Pages**
3. En "Source" selecciona **Deploy from a branch**
4. Branch: **main** · Folder: **/ (root)**
5. Clic en **Save**
6. Espera ~60 segundos y recarga la página
7. Verás el link: `https://TU_USUARIO.github.io/cxp-cxc-dashboard`

---

### Paso 4 · Compartir con tu equipo

El link de GitHub Pages es público por URL pero no está indexado en buscadores.
Si quieres restringir el acceso a personas específicas de tu empresa,
tienes dos opciones gratuitas:

- **Cloudflare Access** (gratis hasta 50 usuarios): pone un login de Google/email
  delante de tu URL sin tocar el código
- **Netlify + contraseña básica** (gratis): drag & drop del `index.html`,
  configuras una contraseña en el dashboard de Netlify

---

## 📁 Estructura del repositorio

```
cxp-cxc-dashboard/
├── index.html          ← Dashboard completo (todo en un archivo)
├── README.md           ← Este archivo
└── plantillas/
    ├── plantilla_CXP.csv   ← Para exportar desde FBL1N y cargar en dashboard
    └── plantilla_CXC.csv   ← Para exportar desde FBL5N y cargar en dashboard
```

---

## 📤 Cómo actualizar los datos (flujo manual)

### Exportar desde SAP

**CXP — Proveedores (FBL1N):**
1. Transacción `FBL1N` → Partidas abiertas
2. Filtrar por sociedad y fecha
3. Menú: Lista → Exportar → Hoja de cálculo (CSV/Excel)
4. Guardar con el nombre `CXP_YYYYMMDD.csv`

**CXC — Clientes (FBL5N):**
1. Transacción `FBL5N` → Partidas abiertas
2. Mismo proceso
3. Guardar como `CXC_YYYYMMDD.csv`

### Cargar en el dashboard

1. Abre el dashboard en tu navegador
2. Ve a **Carga de archivos** en el sidebar
3. Arrastra el CSV de CXP en la zona izquierda
4. Arrastra el CSV de CXC en la zona derecha
5. Clic en **Cargar CXP** y **Cargar CXC**
6. Los datos se reemplazan en memoria — navega a cualquier módulo

> ⚠️ Los datos cargados viven en la sesión del navegador.
> Si cierras y vuelves a abrir el browser, debes volver a cargar el CSV.
> En la siguiente fase (backend + Supabase) esto se resuelve con persistencia real.

---

## 🗺️ Roadmap de fases

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 0** | ✅ Completa | Dashboard mock + carga manual CSV |
| **Fase 1** | ⬜ Siguiente | Backend Node.js + Supabase (PostgreSQL) |
| **Fase 2** | ⬜ Pendiente | Conexión API OData SAP S/4HANA Cloud |
| **Fase 3** | ⬜ Pendiente | Scheduler nightly + notificaciones email |
| **Fase 4** | ⬜ Pendiente | Roles, permisos, audit trail, go-live |

---

## 🔧 Para actualizar el dashboard

Cuando haya una nueva versión del `index.html`:

**Desde el navegador:**
1. GitHub → tu repo → clic en `index.html` → ícono de lápiz (Edit)
2. Pega el nuevo contenido → Commit

**Con Git:**
```bash
git add index.html
git commit -m "feat: nueva versión dashboard vX"
git push
```

GitHub Pages se actualiza automáticamente en ~60 segundos.

---

## 📋 Columnas esperadas en el CSV

El dashboard hace mapeo automático de nombres de columna.
Usa la plantilla descargable desde el módulo "Carga de archivos".

| Campo dashboard | Columnas SAP aceptadas |
|----------------|----------------------|
| Sociedad | BUKRS · Sociedad · Company Code |
| Proveedor/Cliente | NAME1 · Proveedor · Cliente |
| Documento | BELNR · No.Doc · Documento |
| Tipo Doc | BLART · Tipo · Doc Type |
| Fecha Doc | BLDAT · Fecha Doc |
| Vencimiento | ZFBDT · Vencimiento · Due Date |
| Moneda | WAERS · Moneda · Currency |
| Importe | WRBTR · Importe · Amount |
| Pagado | Pagado · Paid |
| Cuenta GL | HKONT · Cuenta GL |
| Aging | Aging · Dias · Days (opcional — se calcula si no viene) |
