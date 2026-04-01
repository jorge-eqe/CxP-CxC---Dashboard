/**
 * Sistema de renderizado UI · Componentes y tablas
 * ────────────────────────────────────────────────
 */

class UIRenderer {
  constructor() {
    this.mainContentEl = null;
  }

  init(mainSelector = '#mainContent') {
    this.mainContentEl = document.querySelector(mainSelector);
  }

  // ─── SELECTOR DE SOCIEDAD ─────────────────────────────────────
  updateSocietySelector() {
    const sel = document.getElementById('socFilter');
    if (!sel) return;

    const current = sel.value;
    sel.innerHTML = '<option value="ALL">Todas las sociedades</option>';

    Object.values(window.DashboardData.SOCS).forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = `${s.code} · ${s.name}`;
      if (s.code === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ─── ACTUALIZAR BADGE DE ALERTAS ──────────────────────────────
  updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (!badge) return;

    const allData = window.DashboardData.getAllData();
    const totalAlerts = allData.filter((r) => r.alerts && r.alerts.length > 0).length;

    badge.textContent = totalAlerts;
  }

  // ─── ACTUALIZAR INDICADOR DE FUENTE ────────────────────────────
  updateSourceIndicator() {
    const pill = document.querySelector('.pill-y');
    if (!pill) return;

    const { dataSource, fileSourceLabel } = window.DashboardData.state;

    if (dataSource === 'api') {
      pill.className = 'pill pill-g';
      pill.textContent = '● API conectada';
    } else if (dataSource === 'file') {
      pill.className = 'pill pill-f';
      pill.textContent = `● ${fileSourceLabel || 'Archivo cargado'}`;
    } else {
      pill.className = 'pill pill-y';
      pill.textContent = '● Datos mock';
    }
  }

  // ─── COMPONENTE KPI CARD ──────────────────────────────────────
  kpiCard(label, value, subtitle = '', color = 'var(--accent)', isCurrency = false) {
    const currency = window.DashboardData.state.currentSoc === 'ALL' ? 'MXN' : window.DashboardData.SOCS[window.DashboardData.state.currentSoc]?.cur || 'MXN';
    const prefix = isCurrency ? `<span class="kpi-cur">${currency}</span>` : '';

    return `
    <div class="kpi-card" style="--kc:${color}">
      <div class="kpi-lbl">${Utils.escapeHtml(label)}</div>
      <div class="kpi-val" style="color:${color}">${prefix}${typeof value === 'number' ? Utils.format(value) : value}</div>
      ${subtitle ? `<div class="kpi-sub">${Utils.escapeHtml(subtitle)}</div>` : ''}
    </div>
    `;
  }

  // ─── TABLA GENÉRICA SEGURA ────────────────────────────────────
  createTable(columns, rows, renderRow) {
    const headerHtml = columns.map((col) => `<th${col.align ? ` class="r"` : ''}>${Utils.escapeHtml(col.label)}</th>`).join('');

    const bodyHtml = rows.length === 0 
      ? `<tr><td colspan="${columns.length}" class="empty">Sin registros para los filtros seleccionados.</td></tr>`
      : rows.map((r) => renderRow(r)).join('');

    return `
    <div class="tw">
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>
    `;
  }

  // ─── RENDERIZADO DE FILAS CON ESCAPE HTML ─────────────────────
  createTableRow(r, columnMappers) {
    const cells = columnMappers.map((mapper) => `<td${mapper.align ? ' class="tr"' : ''}>${mapper.render(r)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }

  // ─── FILTROS GENÉRICOS ────────────────────────────────────────
  createFilters(filters) {
    return `
    <div class="filters">
      ${filters.map((f) => {
        if (f.type === 'search') {
          return `<input class="fi fi-w" id="${f.id}" placeholder="${Utils.escapeHtml(f.placeholder)}" value="${f.value || ''}" oninput="${f.onchange}"/>`;
        }
        if (f.type === 'select') {
          const options = f.options.map((opt) => `<option value="${opt.value}">${Utils.escapeHtml(opt.label)}</option>`).join('');
          return `<select class="fi" id="${f.id}" onchange="${f.onchange}"><option value="">Todos</option>${options}</select>`;
        }
        return '';
      }).join('')}
      ${filters.find((f) => f.recordCount) ? `<span class="fcnt">${filters.find((f) => f.recordCount).recordCount} registros</span>` : ''}
    </div>
    `;
  }

  // ─── PANEL DE ALERTAS ──────────────────────────────────────────
  createAlertPanel(title, alerts, color = 'danger') {
    if (alerts.length === 0) return '';

    const ac = color === 'danger' ? 'ac-r' : 'ac-y';
    return `
    <div class="al-card ${color}">
      <div class="al-title">${Utils.escapeHtml(title)} <span class="ac ${ac}">${alerts.length}</span></div>
      ${alerts
        .map(
          (a) => `
        <div class="al-item">
          <div>
            <div class="al-nm">${Utils.escapeHtml(a.name)}</div>
            <div class="al-dc">${Utils.escapeHtml(a.details)}</div>
          </div>
          <div class="al-rt">
            ${a.rightTop ? `<div>${a.rightTop}</div>` : ''}
            ${a.rightBottom ? `<div class="al-lbl">${a.rightBottom}</div>` : ''}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `;
  }

  // ─── SECCIÓN CON TÍTULO ────────────────────────────────────────
  createSection(title, subtitle = '') {
    return `
    <div class="sec-hdr" style="margin-bottom:20px">
      <div>
        <div class="sec-title">${Utils.escapeHtml(title)}</div>
        ${subtitle ? `<div class="sec-sub">${Utils.escapeHtml(subtitle)}</div>` : ''}
      </div>
    </div>
    `;
  }

  // ─── GRÁFICO DE BARRAS HORIZONTAL ─────────────────────────────
  createHorizontalBars(title, items) {
    const totalValue = items.reduce((a, i) => a + i.value, 0);

    return `
    <div class="bar-card">
      <div class="bar-card-title">${Utils.escapeHtml(title)}</div>
      ${items
        .map(
          (item) => `
        <div class="bar-row">
          <div class="bar-lbl">${Utils.escapeHtml(item.label)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${totalValue ? ((item.value / totalValue) * 100).toFixed(1) : 0}%; background:${item.color}"></div>
          </div>
          <div class="bar-amt">${item.displayValue || Utils.format(item.value)}</div>
          <div class="bar-pct">${totalValue ? ((item.value / totalValue) * 100).toFixed(0) : 0}%</div>
        </div>
      `
        )
        .join('')}
    </div>
    `;
  }

  // ─── INFO BOX ──────────────────────────────────────────────────
  createInfoBox(html) {
    return `<div class="info-box">${html}</div>`;
  }

  // ─── LIMPIAR Y RENDERIZAR ─────────────────────────────────────
  render(html) {
    if (this.mainContentEl) {
      this.mainContentEl.innerHTML = html;
    }
  }

  // ─── MOSTRAR LOADING ──────────────────────────────────────────
  showLoading() {
    this.render(`
      <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
        <div style="text-align:center">
          <div style="font-size:24px;margin-bottom:16px;animation:spin 1s linear infinite">⏳</div>
          <div style="color:var(--muted)">Cargando datos...</div>
        </div>
      </div>
    `);
  }

  // ─── MOSTRAR ERROR ────────────────────────────────────────────
  showError(message) {
    this.render(`
      <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:24px;text-align:center">
        <div style="font-size:14px;color:var(--red);margin-bottom:8px">⚠ Error</div>
        <div style="color:var(--muted)">${Utils.escapeHtml(message)}</div>
      </div>
    `);
  }
}

// ─── ANIMACIÓN DE CARGA ─────────────────────────────────────────
const styles = document.createElement('style');
styles.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styles);

window.UIRenderer = new UIRenderer();
