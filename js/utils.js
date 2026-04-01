/**
 * Utilidades · Formateo, seguridad, performance
 * ────────────────────────────────────────────────
 */

class Utils {
  // ─── FORMATEO NUMÉRICO ────────────────────────────────────────
  static format(n, decimals = 2) {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  static parseNumber(str) {
    if (!str || str === '-' || str === '') return 0;
    str = String(str).trim();

    const trailNeg = str.endsWith('-');
    str = str.replace(/-$/, '');

    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    let num;
    if (lastComma > lastDot) {
      num = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    } else {
      num = parseFloat(str.replace(/,/g, ''));
    }

    if (isNaN(num)) return 0;
    return trailNeg ? -num : num;
  }

  // ─── ESCAPE HTML (PREVENIR XSS) ────────────────────────────────
  static escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static sanitizeAttr(attr) {
    return (attr || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // ─── ETIQUETAS Y BADGES ───────────────────────────────────────
  static currencyTag(currency) {
    const classMap = {
      USD: 'c-usd',
      EUR: 'c-eur',
      MXN: 'c-mxn',
    };
    const cls = classMap[currency] || 'c-mxn';
    return `<span class="ctag ${cls}">${currency}</span>`;
  }

  static agingBucket(days) {
    const map = {
      b0: { cls: 'b0', label: '0-30d' },
      b30: { cls: 'b30', label: '31-60' },
      b60: { cls: 'b60', label: '61-90' },
      b90: { cls: 'b90', label: '+90d' },
    };
    const key = days > 90 ? 'b90' : days > 60 ? 'b60' : days > 30 ? 'b30' : 'b0';
    const { cls, label } = map[key];
    return `<span class="bkt ${cls}">${label}</span>`;
  }

  static statusTag(status) {
    const map = {
      pendiente: { cls: 's-p', label: 'Pendiente' },
      parcial: { cls: 's-pa', label: 'Parcial' },
      pagado: { cls: 's-ok', label: 'Pagado' },
      vencido: { cls: 's-v', label: 'Vencido' },
    };
    const { cls, label } = map[status] || { cls: 's-p', label: status };
    return `<span class="st ${cls}"><span class="sd"></span>${label}</span>`;
  }

  static alertTags(alerts) {
    const map = {
      reversa: '<span class="at at-r">REVERSA</span>',
      signo: '<span class="at at-s">SIGNO</span>',
      overdue: '<span class="at at-o">+90d</span>',
      gl: '<span class="at at-g">GL</span>',
    };
    return alerts.map((a) => map[a] || '').join(' ');
  }

  static docTypeTag(docType, alerts) {
    const dm = window.DashboardData.DT[docType] || { label: docType, desc: docType };
    const isBad = alerts.includes('reversa') || alerts.includes('signo');
    return `<span class="dt${isBad ? ' bad' : ''}" title="${this.escapeHtml(dm.desc)}">${dm.label}</span>`;
  }

  // ─── DEBOUNCING Y THROTTLING ──────────────────────────────────
  static debounce(fn, delayMs = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delayMs);
    };
  }

  static throttle(fn, delayMs = 300) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delayMs) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  // ─── LAZY LOADING DE SCRIPTS ──────────────────────────────────
  static loadExternalScript(src, onLoad, onError) {
    if (window[src.split('/').pop().split('.')[0]]) {
      onLoad();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = onLoad;
    script.onerror = () => onError && onError(new Error(`Falló cargar: ${src}`));
    document.head.appendChild(script);
  }

  // ─── DETECCIÓN DE SEPARADOR CSV ────────────────────────────────
  static detectSeparator(line) {
    const counts = { ';': 0, '\t': 0, ',': 0, '|': 0 };
    for (const c of line) if (c in counts) counts[c]++;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  // ─── NORMALIZACIÓN DE STRINGS ─────────────────────────────────
  static normalizeString(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ─── PERFORMANCE: GENERAR TABLA VIRTUAL ────────────────────────
  static createVirtualTable(rows, columns, containerSelector, renderRow, batchSize = 50) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let renderIndex = 0;

    const renderBatch = () => {
      const end = Math.min(renderIndex + batchSize, rows.length);
      const html = rows.slice(renderIndex, end).map((r) => renderRow(r)).join('');
      const tbody = container.querySelector('tbody');
      if (renderIndex === 0) tbody.innerHTML = html;
      else tbody.innerHTML += html;
      renderIndex = end;

      if (renderIndex < rows.length) {
        requestAnimationFrame(renderBatch);
      }
    };

    renderBatch();
  }
}

window.Utils = Utils;
