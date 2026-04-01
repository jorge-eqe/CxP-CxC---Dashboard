/**
 * CXP/CXC Dashboard · Sistema central de datos y lógica
 * ─────────────────────────────────────────────────────
 * Gestor de estado global, enriquecimiento de datos, conversiones multi-moneda
 */

class DashboardDataManager {
  constructor() {
    this.SOCS = {
      MX01: { code: 'MX01', name: 'Corporativo México SA de CV', cur: 'MXN', curLabel: 'Peso mexicano' },
      MX02: { code: 'MX02', name: 'Manufactura Norte SA de CV', cur: 'MXN', curLabel: 'Peso mexicano' },
      US01: { code: 'US01', name: 'International Trading LLC', cur: 'USD', curLabel: 'Dólar americano' },
    };

    this.FX = { MXN: 1, USD: 17.15, EUR: 18.60 };

    this.DT = {
      KR: { label: 'KR', desc: 'Factura proveedor', module: 'AP', ns: -1 },
      KG: { label: 'KG', desc: 'Nota crédito prov.', module: 'AP', ns: +1 },
      RE: { label: 'RE', desc: 'Factura de compras', module: 'AP', ns: -1 },
      KZ: { label: 'KZ', desc: 'Pago proveedor', module: 'AP', ns: 0 },
      ZP: { label: 'ZP', desc: 'Pago automático', module: 'AP', ns: 0 },
      ZA: { label: 'ZA', desc: 'Pago ext./transferencia', module: 'AP', ns: 0 },
      SA: { label: 'SA', desc: 'Asiento manual GL', module: 'AP', ns: 0 },
      DR: { label: 'DR', desc: 'Factura cliente', module: 'AR', ns: +1 },
      DG: { label: 'DG', desc: 'Nota crédito cliente', module: 'AR', ns: -1 },
      DZ: { label: 'DZ', desc: 'Cobro cliente', module: 'AR', ns: 0 },
    };

    this.GLA = {
      '5100000': { desc: 'Costo de ventas' },
      '5200000': { desc: 'Gastos de operación' },
      '6100000': { desc: 'Servicios profesionales' },
      '6200000': { desc: 'Transportes y fletes' },
      '6300000': { desc: 'Arrendamientos' },
      '6400000': { desc: 'Materiales y suministros' },
      '1510000': { desc: 'Activos fijos en uso' },
      '1520000': { desc: 'Activos intangibles' },
      '1130000': { desc: 'Pagos anticipados' },
      '4100000': { desc: 'Ingresos por ventas' },
    };

    this.state = {
      currentSoc: 'ALL',
      currentPage: 'cxp',
      dataSource: 'mock', // 'mock' | 'api' | 'file'
      fileSourceLabel: '',
      vendors: [],
      customers: [],
      syncMode: 'nightly',
    };

    this._cache = new Map();
    this._enrichedCache = new Map();
  }

  // ─── CONVERSIÓN DE MONEDA ─────────────────────────────────────
  toLc(amt, docCur, socCode) {
    const soc = this.SOCS[socCode];
    if (!soc) return amt * (this.FX[docCur] || 1);
    const mxn = amt * (this.FX[docCur] || 1);
    return soc.cur === 'USD' ? mxn / this.FX['USD'] : mxn;
  }

  // ─── DETECCIÓN Y REGISTRO DINÁMICO DE SOCIEDADES ───────────────
  registerSoc(code, name) {
    if (!code || this.SOCS[code]) return;
    const nameU = (name || '').toUpperCase();
    const isUSD = /LLC|INC\b|CORP|USA|USD/.test(nameU);
    this.SOCS[code] = {
      code,
      name: name || code,
      cur: isUSD ? 'USD' : 'MXN',
      curLabel: isUSD ? 'Dólar americano' : 'Peso mexicano',
    };
  }

  // ─── CÁLCULO DE ALERTAS ───────────────────────────────────────
  calcAlerts(row) {
    const alerts = [];
    const dt = this.DT[row.docType];

    if (dt && dt.ns !== 0) {
      const expNeg = dt.ns < 0;
      const isNeg = row.docAmount < 0;
      if (expNeg !== isNeg) {
        alerts.push(row.docType === 'KR' || row.docType === 'RE' ? 'reversa' : 'signo');
      }
    }

    if (row.aging > 90) alerts.push('overdue');
    if (row.glFlag) alerts.push('gl');

    return alerts;
  }

  // ─── ENRIQUECIMIENTO DE DATOS ────────────────────────────────
  enrich(rows) {
    const cacheKey = JSON.stringify(rows);
    if (this._enrichedCache.has(cacheKey)) {
      return this._enrichedCache.get(cacheKey);
    }

    const enriched = rows.map((r) => {
      if (r.soc && !this.SOCS[r.soc]) this.registerSoc(r.soc, r._socName || '');
      const soc = this.SOCS[r.soc] || { code: r.soc || '??', name: r.soc || 'Desconocida', cur: 'MXN', curLabel: 'Peso mexicano' };
      const lcAmt = this.toLc(r.docAmount, r.docCur, r.soc);
      const lcPaid = this.toLc(r.paid || 0, r.docCur, r.soc);
      const alerts = this.calcAlerts(r);

      return { ...r, soc, lcAmt, lcPaid, lcCur: soc.cur, alerts };
    });

    this._enrichedCache.set(cacheKey, enriched);
    return enriched;
  }

  // ─── ACTUALIZAR DATOS ─────────────────────────────────────────
  setVendors(rows) {
    this.state.vendors = this.enrich(rows);
    this._cache.clear();
  }

  setCustomers(rows) {
    this.state.customers = this.enrich(rows);
    this._cache.clear();
  }

  // ─── GETTERS ──────────────────────────────────────────────────
  getVendors() {
    return this.state.currentSoc === 'ALL' 
      ? this.state.vendors 
      : this.state.vendors.filter(r => r.soc.code === this.state.currentSoc);
  }

  getCustomers() {
    return this.state.currentSoc === 'ALL' 
      ? this.state.customers 
      : this.state.customers.filter(r => r.soc.code === this.state.currentSoc);
  }

  getAllData() {
    return [...this.getVendors(), ...this.getCustomers()];
  }

  // ─── COMPUTACIÓN DE SALDOS Y AGING ────────────────────────────
  calculateBalance(row) {
    return Math.abs(row.lcAmt) - Math.abs(row.lcPaid);
  }

  getAgingBuckets(rows) {
    const buckets = { a: 0, b: 0, c: 0, d: 0 };
    rows.forEach((r) => {
      const bal = this.calculateBalance(r);
      if (r.aging > 90) buckets.d += bal;
      else if (r.aging > 60) buckets.c += bal;
      else if (r.aging > 30) buckets.b += bal;
      else buckets.a += bal;
    });
    return buckets;
  }

  // ─── PERSISTENCIA EN LOCALSTORAGE ─────────────────────────────
  persistState() {
    const state = {
      currentSoc: this.state.currentSoc,
      currentPage: this.state.currentPage,
      syncMode: this.state.syncMode,
      timestamp: Date.now(),
    };
    try {
      window.localStorage.setItem('dashboard_state', JSON.stringify(state));
    } catch (e) {
      console.warn('localStorage no disponible', e);
    }
  }

  restoreState() {
    try {
      const saved = window.localStorage.getItem('dashboard_state');
      if (saved) {
        const state = JSON.parse(saved);
        if (Date.now() - state.timestamp < 86400000) {
          this.state.currentSoc = state.currentSoc || 'ALL';
          this.state.currentPage = state.currentPage || 'cxp';
          this.state.syncMode = state.syncMode || 'nightly';
        }
      }
    } catch (e) {
      console.warn('Error al restaurar estado', e);
    }
  }
}

// Instancia global compartida
window.DashboardData = new DashboardDataManager();
