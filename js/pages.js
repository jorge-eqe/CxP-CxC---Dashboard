/**
 * Módulos de páginas · CXP, CXC, Alertas, etc.
 * ────────────────────────────────────────────
 */

class PageModules {
  // ─── PÁGINA CXP (PROVEEDORES) ──────────────────────────────────
  static renderCXP() {
    const vendors = window.DashboardData.getVendors();
    const buckets = window.DashboardData.getAgingBuckets(vendors);
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);

    const kpiCards = [
      {
        label: 'Saldo total',
        value: total,
        subtitle: `${vendors.filter((r) => r.status !== 'pagado').length} partidas abiertas`,
        color: 'var(--red)',
        isCurrency: true,
      },
      {
        label: 'Vencido +90d',
        value: buckets.d,
        subtitle: `${((buckets.d / total) * 100).toFixed(1)}% · ${vendors.filter((r) => r.aging > 90).length} docs`,
        color: 'var(--red)',
        isCurrency: true,
      },
      {
        label: 'Pagado',
        value: vendors.filter((r) => r.status === 'pagado').length,
        subtitle: `${Utils.format(vendors.reduce((a, r) => a + Math.abs(r.lcPaid), 0))}`,
        color: 'var(--green)',
      },
    ];

    const kpisHtml = kpiCards.map((k) => window.UIRenderer.kpiCard(k.label, k.value, k.subtitle, k.color, k.isCurrency)).join('');

    let html = window.UIRenderer.createSection('CXP — Proveedores', 'Facturas pendientes y pagadas · Aging de vencimiento');
    html += `<div class="kpi-grid">${kpisHtml}</div>`;

    // Tabla de proveedores
    const columns = [
      { label: 'Proveedor', align: false },
      { label: 'Documento', align: false },
      { label: 'Moneda', align: false },
      { label: 'Importe', align: true },
      { label: 'Saldo', align: true },
      { label: 'Días', align: false },
      { label: 'Estado', align: false },
    ];

    const rowRenderer = (r) => {
      const balance = window.DashboardData.calculateBalance(r);
      return `<tr>
        <td><strong>${Utils.escapeHtml(r.name.substring(0, 30))}</strong></td>
        <td>${Utils.escapeHtml(r.doc)}</td>
        <td>${Utils.currencyTag(r.docCur)}</td>
        <td class="tr">${Utils.format(r.lcAmt)}</td>
        <td class="tr" style="color:${balance > 0 ? 'var(--red)' : 'var(--green)'}">${Utils.format(balance)}</td>
        <td>${Utils.agingBucket(r.aging)}</td>
        <td>${Utils.statusTag(r.status)}</td>
      </tr>`;
    };

    html += window.UIRenderer.createTable(columns, vendors.slice(0, 50), rowRenderer);

    window.UIRenderer.render(html);
  }

  // ─── PÁGINA CXC (CLIENTES) ─────────────────────────────────────
  static renderCXC() {
    const customers = window.DashboardData.getCustomers();
    const buckets = window.DashboardData.getAgingBuckets(customers);
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);

    const kpisHtml = [
      window.UIRenderer.kpiCard(
        'Saldo pendiente',
        total,
        `${customers.filter((r) => r.status !== 'pagado').length} facturas abiertas`,
        'var(--accent)',
        true
      ),
      window.UIRenderer.kpiCard(
        'Vencido +90d',
        buckets.d,
        `${((buckets.d / total) * 100).toFixed(1)}%`,
        'var(--red)',
        true
      ),
      window.UIRenderer.kpiCard(
        'Cobrado',
        customers.reduce((a, r) => a + Math.abs(r.lcPaid), 0),
        `${customers.filter((r) => r.status === 'pagado').length} completadas`,
        'var(--green)',
        true
      ),
    ].join('');

    let html = window.UIRenderer.createSection('CXC — Clientes', 'Facturación y cobranza');
    html += `<div class="kpi-grid">${kpisHtml}</div>`;

    const columns = [
      { label: 'Cliente', align: false },
      { label: 'Documento', align: false },
      { label: 'Moneda', align: false },
      { label: 'Importe', align: true },
      { label: 'Saldo', align: true },
      { label: 'Días', align: false },
      { label: 'Estado', align: false },
    ];

    const rowRenderer = (r) => {
      const balance = window.DashboardData.calculateBalance(r);
      return `<tr>
        <td><strong>${Utils.escapeHtml(r.name.substring(0, 30))}</strong></td>
        <td>${Utils.escapeHtml(r.doc)}</td>
        <td>${Utils.currencyTag(r.docCur)}</td>
        <td class="tr">${Utils.format(r.lcAmt)}</td>
        <td class="tr" style="color:${balance > 0 ? 'var(--accent)' : 'var(--green)'}">${Utils.format(balance)}</td>
        <td>${Utils.agingBucket(r.aging)}</td>
        <td>${Utils.statusTag(r.status)}</td>
      </tr>`;
    };

    html += window.UIRenderer.createTable(columns, customers.slice(0, 50), rowRenderer);

    window.UIRenderer.render(html);
  }

  // ─── PÁGINA DE ALERTAS ──────────────────────────────────────────
  static renderAlerts() {
    const allData = window.DashboardData.getAllData();

    const overdueCXP = allData.filter((r) => r.alerts.includes('overdue') && r.docType.startsWith('K'));
    const overdueCXC = allData.filter((r) => r.alerts.includes('overdue') && r.docType.startsWith('D'));
    const reversals = allData.filter((r) => r.alerts.includes('reversa'));
    const signIssues = allData.filter((r) => r.alerts.includes('signo'));

    let html = window.UIRenderer.createSection('Centro de alertas', `${allData.filter((r) => r.alerts.length > 0).length} alertas activas`);

    const overdueCXPAlerts = overdueCXP.map((r) => ({
      name: Utils.escapeHtml(r.name),
      details: `${r.soc.code} · ${Utils.escapeHtml(r.doc)} · ${r.dueDate}`,
      rightTop: `<div class="al-days">${r.aging} días</div>`,
      rightBottom: `${Utils.format(window.DashboardData.calculateBalance(r))} ${r.lcCur}`,
    }));

    const overdueCXCAlerts = overdueCXC.map((r) => ({
      name: Utils.escapeHtml(r.name),
      details: `${r.soc.code} · ${Utils.escapeHtml(r.doc)} · ${r.dueDate}`,
      rightTop: `<div class="al-days">${r.aging} días</div>`,
      rightBottom: `${Utils.format(window.DashboardData.calculateBalance(r))} ${r.lcCur}`,
    }));

    const reversalAlerts = reversals.map((r) => ({
      name: Utils.escapeHtml(r.name),
      details: `${r.soc.code} · ${Utils.escapeHtml(r.doc)} · Tipo ${r.docType}`,
      rightTop: `<div class="al-sign">+${Utils.format(Math.abs(r.docAmount))}</div>`,
      rightBottom: 'Positivo en AP',
    }));

    html += '<div class="al-grid">';
    html += window.UIRenderer.createAlertPanel('+90 días · CXP', overdueCXPAlerts, 'danger');
    html += window.UIRenderer.createAlertPanel('+90 días · CXC', overdueCXCAlerts, 'danger');
    html += window.UIRenderer.createAlertPanel('Reversales posibles', reversalAlerts, 'warn');
    html += '</div>';

    // Botón de exportación
    html += `
    <div style="margin-top:20px;display:flex;gap:10px">
      <button onclick="ExcelExporter.exportAlerts()" class="up-btn">📊 Exportar alertas a Excel</button>
    </div>
    `;

    window.UIRenderer.render(html);
  }

  // ─── PÁGINA DE UPLOAD ──────────────────────────────────────────
  static renderUpload() {
    let html = window.UIRenderer.createSection('Carga de datos', 'Exporta desde SAP (FBL1N/FBL5N) y sube aquí');

    html += `
    <div class="up-grid">
      <div class="up-card">
        <div class="up-card-title">🏢 CXP — Proveedores</div>
        <div class="drop-zone" id="dropAP" ondragover="dragOver(event,'dropAP')" ondragleave="dragLeave('dropAP')" ondrop="dropFile(event,'AP')">
          <div class="drop-icon">📂</div>
          <div class="drop-lbl"><strong>Arrastra archivo</strong><br>o haz clic</div>
        </div>
        <input type="file" class="drop-input" id="fileAP" accept=".csv,.xlsx,.xls,.txt" onchange="handleFile(event,'AP')"/>
        <button class="up-btn" onclick="loadFile('AP')" style="width:100%;margin-top:12px">Cargar CXP</button>
        <div class="up-status" id="statusAP" style="margin-top:8px">Esperando archivo…</div>
      </div>

      <div class="up-card">
        <div class="up-card-title">🤝 CXC — Clientes</div>
        <div class="drop-zone" id="dropAR" ondragover="dragOver(event,'dropAR')" ondragleave="dragLeave('dropAR')" ondrop="dropFile(event,'AR')">
          <div class="drop-icon">📂</div>
          <div class="drop-lbl"><strong>Arrastra archivo</strong><br>o haz clic</div>
        </div>
        <input type="file" class="drop-input" id="fileAR" accept=".csv,.xlsx,.xls,.txt" onchange="handleFile(event,'AR')"/>
        <button class="up-btn" onclick="loadFile('AR')" style="width:100%;margin-top:12px">Cargar CXC</button>
        <div class="up-status" id="statusAR" style="margin-top:8px">Esperando archivo…</div>
      </div>
    </div>

    <div class="info-box" style="margin-top:20px">
      <strong>Formatos soportados:</strong> CSV, Excel (.xlsx), TXT<br>
      <strong>Separadores detectados automáticamente:</strong> punto y coma (;), coma (,), tabulación<br>
      <strong>Columnas:</strong> El parser detecta automáticamente encabezados SAP Fiori (BSIK, BSID, FBL1N, FBL5N)<br>
      <strong>Máximo:</strong> 20 MB por archivo
    </div>
    
    <button onclick="ExcelExporter.exportVendorsReport()" class="up-btn" style="margin-top:12px">📊 Exportar CXP a Excel</button>
    <button onclick="ExcelExporter.exportCustomersReport()" class="up-btn" style="margin-top:12px">📊 Exportar CXC a Excel</button>
    `;

    window.UIRenderer.render(html);
    setupFileHandlers();
  }

  // ─── PÁGINA KPIs ────────────────────────────────────────────────
  static renderKPIs() {
    const vendors = window.DashboardData.getVendors();
    const customers = window.DashboardData.getCustomers();

    const kpisHtml = [
      window.UIRenderer.kpiCard('DSO · Días cartera', '42', '↑ 3d vs mes anterior', 'var(--accent)'),
      window.UIRenderer.kpiCard('DPO · Días proveedores', '38', '↓ 2d vs mes anterior', 'var(--teal)'),
      window.UIRenderer.kpiCard(
        'CXP pendiente',
        vendors.reduce((a, r) => a + window.DashboardData.calculateBalance(r), 0),
        `${vendors.filter((r) => r.status !== 'pagado').length} facturas`,
        'var(--red)',
        true
      ),
      window.UIRenderer.kpiCard(
        'CXC pendiente',
        customers.reduce((a, r) => a + window.DashboardData.calculateBalance(r), 0),
        `${customers.filter((r) => r.status !== 'pagado').length} facturas`,
        'var(--green)',
        true
      ),
    ].join('');

    let html = window.UIRenderer.createSection('KPIs Financieros', 'Indicadores de gestión');
    html += `<div class="kpi-grid">${kpisHtml}</div>`;

    window.UIRenderer.render(html);
  }

  // ─── PÁGINA CONFIGURACIÓN ──────────────────────────────────────
  static renderConfig() {
    const { SOCS } = window.DashboardData;

    let html = window.UIRenderer.createSection('Configuración', 'Sociedades, monedas, cuentas');

    html += '<div class="cfg-grid">';
    Object.values(SOCS).forEach((s) => {
      const vendorCount = window.DashboardData.state.vendors.filter((r) => r.soc === s.code).length;
      const customerCount = window.DashboardData.state.customers.filter((r) => r.soc === s.code).length;

      html += `
      <div class="cfg-card">
        <div class="cfg-title">${Utils.escapeHtml(s.code)} · ${Utils.escapeHtml(s.name)}</div>
        <div class="cfg-row"><span class="cfg-k">Moneda LC</span><span class="cfg-v">${s.cur}</span></div>
        <div class="cfg-row"><span class="cfg-k">Cuenta AP</span><span class="cfg-v">2100000</span></div>
        <div class="cfg-row"><span class="cfg-k">Cuenta AR</span><span class="cfg-v">1200000</span></div>
        <div class="cfg-row"><span class="cfg-k">CXP</span><span class="cfg-v">${vendorCount}</span></div>
        <div class="cfg-row"><span class="cfg-k">CXC</span><span class="cfg-v">${customerCount}</span></div>
      </div>
      `;
    });
    html += '</div>';

    window.UIRenderer.render(html);
  }
}

// ─── FUNCIONES GLOBALES DE NAVEGACIÓN ───────────────────────────
function setPage(page) {
  window.DashboardData.state.currentPage = page;
  window.DashboardData.persistState();

  const pageMap = {
    cxp: () => PageModules.renderCXP(),
    cxc: () => PageModules.renderCXC(),
    alertas: () => PageModules.renderAlerts(),
    upload: () => PageModules.renderUpload(),
    kpis: () => PageModules.renderKPIs(),
    sociedades: () => PageModules.renderConfig(),
  };

  (pageMap[page] || pageMap.cxp)();
  updateActiveNavItem(page);
}

function updateActiveNavItem(page) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  const label = {
    cxp: 'CXP — Proveedores',
    cxc: 'CXC — Clientes',
    alertas: 'Alertas',
    upload: 'Carga de archivos',
    kpis: 'KPIs & tendencia',
    sociedades: 'Sociedades & monedas',
  }[page];

  const navItem = Array.from(document.querySelectorAll('.nav-item')).find((item) => item.textContent.includes(label));
  if (navItem) navItem.classList.add('active');
}

function setSociedad(code) {
  window.DashboardData.state.currentSoc = code;
  window.DashboardData.persistState();
  window.UIRenderer.updateSocietySelector();
  setPage(window.DashboardData.state.currentPage);
}

window.setPage = setPage;
window.setSociedad = setSociedad;
