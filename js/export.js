/**
 * Exportación a Excel con SheetJS
 * ───────────────────────────────
 */

class ExcelExporter {
  constructor() {
    this.sheetJSLoaded = false;
  }

  // ─── CARGAR SHEETJS ───────────────────────────────────────────
  async ensureSheetJS() {
    if (window.XLSX) {
      this.sheetJSLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      Utils.loadExternalScript(
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        () => {
          this.sheetJSLoaded = true;
          resolve();
        },
        (err) => reject(err)
      );
    });
  }

  // ─── EXPORTAR TABLA A EXCEL ────────────────────────────────────
  async exportToExcel(filename, data, sheetName = 'Data') {
    try {
      await this.ensureSheetJS();

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Ajustar ancho de columnas
      const colWidths = this.calculateColumnWidths(data);
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (err) {
      console.error('Error en exportación Excel', err);
      throw err;
    }
  }

  // ─── CALCULAR ANCHO DE COLUMNAS ────────────────────────────────
  calculateColumnWidths(data) {
    if (!data || data.length === 0) return [];

    const headers = Object.keys(data[0]);
    return headers.map((header) => {
      let maxWidth = header.length;
      data.forEach((row) => {
        const cellValue = String(row[header] || '');
        maxWidth = Math.max(maxWidth, cellValue.length);
      });
      return { wch: Math.min(maxWidth + 2, 40) };
    });
  }

  // ─── EXPORTAR REPORTE CXP COMPLETO ──────────────────────────────
  async exportVendorsReport() {
    const vendors = window.DashboardData.getVendors();
    const filename = `CXP_Proveedores_${new Date().toISOString().split('T')[0]}`;

    const data = vendors.map((v) => ({
      Sociedad: v.soc.code,
      Proveedor: v.name,
      Documento: v.doc,
      TipoDoc: v.docType,
      FechaDoc: v.docDate,
      FechaVencimiento: v.dueDate,
      MonedaDoc: v.docCur,
      ImporteDoc: v.docAmount,
      MonedaLC: v.lcCur,
      ImporteLC: v.lcAmt,
      Pagado: v.lcPaid,
      Saldo: window.DashboardData.calculateBalance(v),
      Dias: v.aging,
      Estado: v.status,
      CuentaGL: v.glAcc,
      Alertas: v.alerts.join(', '),
    }));

    await this.exportToExcel(filename, data, 'CXP');
  }

  // ─── EXPORTAR REPORTE CXC COMPLETO ──────────────────────────────
  async exportCustomersReport() {
    const customers = window.DashboardData.getCustomers();
    const filename = `CXC_Clientes_${new Date().toISOString().split('T')[0]}`;

    const data = customers.map((c) => ({
      Sociedad: c.soc.code,
      Cliente: c.name,
      Documento: c.doc,
      TipoDoc: c.docType,
      FechaDoc: c.docDate,
      FechaVencimiento: c.dueDate,
      MonedaDoc: c.docCur,
      ImporteDoc: c.docAmount,
      MonedaLC: c.lcCur,
      ImporteLC: c.lcAmt,
      Pagado: c.lcPaid,
      Saldo: window.DashboardData.calculateBalance(c),
      Dias: c.aging,
      Estado: c.status,
      CuentaGL: c.glAcc,
      Alertas: c.alerts.join(', '),
    }));

    await this.exportToExcel(filename, data, 'CXC');
  }

  // ─── EXPORTAR ALERTAS ──────────────────────────────────────────
  async exportAlerts() {
    const allData = window.DashboardData.getAllData();
    const alerts = allData.filter((r) => r.alerts && r.alerts.length > 0);
    const filename = `Alertas_${new Date().toISOString().split('T')[0]}`;

    const data = alerts.map((a) => ({
      Tipo: a.soc.code.startsWith('MX') ? (a.docType.startsWith('K') ? 'CXP' : 'CXC') : 'CXP',
      Sociedad: a.soc.code,
      PartidaID: a.name,
      Documento: a.doc,
      Moneda: a.docCur,
      Importe: a.docAmount,
      Saldo: window.DashboardData.calculateBalance(a),
      Dias: a.aging,
      Alertas: a.alerts.join(', '),
      Detalles: this.getAlertDetails(a),
    }));

    await this.exportToExcel(filename, data, 'Alertas');
  }

  // ─── OBTENER DETALLES DE ALERTAS ───────────────────────────────
  getAlertDetails(row) {
    const details = [];
    if (row.alerts.includes('overdue')) details.push('Vencida +90 días');
    if (row.alerts.includes('reversa')) details.push('KR/RE positivo - posible reversión');
    if (row.alerts.includes('signo')) details.push('DR negativo - signo inusual');
    if (row.alerts.includes('gl')) details.push('Divergencia GL detectada');
    return details.join('; ');
  }
}

window.ExcelExporter = new ExcelExporter();
