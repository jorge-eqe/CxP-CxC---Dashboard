/**
 * Módulo de carga de archivos SAP CSV/Excel
 * ╔════════════════════════════════════════════════════════════════╗
 * ║ Parser robusto con mapeo automático de columnas SAP Fiori      ║
 * ║ Soporta: BSIK, BSAK, BSID, BSAD, FBL1N, FBL5N, ALV exports    ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

class FileUploadManager {
  constructor() {
    this.SAP_COLS = {
      soc: ['company code', 'bukrs', 'sociedad', 'soc', 'companycode'],
      socName: ['company name', 'nombre sociedad', 'company'],
      supplierId: ['supplier', 'kunnr', 'lifnr', 'vendor', 'cliente', 'proveedor id', 'bp'],
      name: ['supplier name', 'customer name', 'nombre', 'proveedor', 'cliente', 'vendor name', 'name1', 'name'],
      doc: ['journal entry', 'belnr', 'documento', 'document', 'no. doc', 'journal entry number', 'asiento'],
      docType: ['journal entry type', 'blart', 'tipo doc', 'doc type', 'tipo'],
      docDate: ['posting date', 'bldat', 'fecha contab', 'fecha doc', 'posting'],
      journalDate: ['journal entry date', 'budat', 'fecha asiento'],
      clearingDoc: ['clearing journal entry', 'augbl', 'doc compensación', 'clearing doc'],
      clearingDate: ['clearing date', 'augdt', 'fecha compensación'],
      reference: ['reference', 'xblnr', 'referencia', 'ref'],
      itemText: ['item text', 'sgtxt', 'texto partida', 'text'],
      docAmount: ['amount (tran cur.)', 'wrbtr', 'amount (transaction currency)', 'importe transacción', 'monto', 'amount'],
      lcAmount: ['amount (cocode crcy)', 'dmbtr', 'amount (company code currency)', 'importe moneda sociedad', 'importe lc'],
      docCur: ['transaction currency', 'waers', 'currency', 'moneda', 'tran cur', 'transaction cur'],
      lcCur: ['company code currency', 'hauswaehrung', 'moneda sociedad', 'cocode crcy', 'local currency'],
      exchRate: ['effect. exch. rate', 'kursf', 'tipo cambio', 'exchange rate', 'exch rate'],
      debitCredit: ['debit/credit', 'shkzg', 'debe/haber', 'd/c', 'debit credit'],
      aging: ['days in arrears', 'daysinarrears', 'días atraso', 'dias atraso', 'aging', 'días', 'age'],
      clearStatus: ['clearing status', 'augst', 'estado compensación', 'status', 'estado'],
      glAcc: ['recon. account', 'recon account', 'hkont', 'cuenta gl', 'gl account', 'reconciliation account'],
      taxCode: ['tax code', 'mwskz', 'código impuesto', 'tax'],
    };

    this.uploadedData = { AP: null, AR: null };
  }

  // ─── PARSE CSV ROBUSTO ─────────────────────────────────────────
  parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    const sep = Utils.detectSeparator(lines[0]);

    const splitLine = (line) => {
      const result = [];
      let cur = '',
        inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && !inQ) {
          inQ = true;
          continue;
        }
        if (ch === '"' && inQ) {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = false;
          continue;
        }
        if (ch === sep && !inQ) {
          result.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      result.push(cur.trim());
      return result;
    };

    const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, '').trim());
    const rows = lines
      .slice(1)
      .map((line) => {
        const cells = splitLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (cells[i] || '').trim()));
        return obj;
      })
      .filter((r) => Object.values(r).some((v) => v));

    return { headers, rows };
  }

  // ─── COINCIDENCIA DE COLUMNAS SAP ──────────────────────────────
  matchColumn(headers, candidates) {
    const hn = headers.map((h) => Utils.normalizeString(h));
    for (const c of candidates) {
      const cn = Utils.normalizeString(c);
      const exact = hn.findIndex((h) => h === cn);
      if (exact >= 0) return exact;
      const partial = hn.findIndex((h) => h.includes(cn) || cn.includes(h));
      if (partial >= 0) return partial;
    }
    return -1;
  }

  // ─── MAPEO DE FILAS AL MODELO INTERNO ──────────────────────────
  mapRows(parsedRows, headers, module) {
    const colIdx = {};
    for (const [key, candidates] of Object.entries(this.SAP_COLS)) {
      colIdx[key] = this.matchColumn(headers, candidates);
    }

    const getCell = (row, key) => {
      const i = colIdx[key];
      if (i < 0) return '';
      const vals = Object.values(row);
      return (vals[i] || '').toString().trim();
    };

    return parsedRows
      .map((row, i) => {
        const rawAmt = Utils.parseNumber(getCell(row, 'docAmount'));
        const rawLCAmt = Utils.parseNumber(getCell(row, 'lcAmount'));
        const rawAging = Math.abs(parseInt(getCell(row, 'aging')) || 0);
        const clearSt = getCell(row, 'clearStatus');
        const dc = getCell(row, 'debitCredit').toUpperCase();

        const useAmt = rawAmt !== 0 ? rawAmt : rawLCAmt;
        let finalAmt = useAmt;
        if (dc === 'H' && module === 'AP') finalAmt = -Math.abs(useAmt);
        if (dc === 'S' && module === 'AP') finalAmt = Math.abs(useAmt);
        if (dc === 'S' && module === 'AR') finalAmt = Math.abs(useAmt);
        if (dc === 'H' && module === 'AR') finalAmt = -Math.abs(useAmt);

        const docType = getCell(row, 'docType').toUpperCase() || 
                        (module === 'AP' ? (dc === 'H' ? 'KR' : 'KZ') : (dc === 'S' ? 'DR' : 'DG'));
        const rawCurCell = getCell(row, 'docCur').replace(/[^A-Z]/g, '').slice(0, 3);
        const lcCurCell = getCell(row, 'lcCur').replace(/[^A-Z]/g, '').slice(0, 3);
        const socRaw = getCell(row, 'soc');

        const socCode = socRaw 
          ? socRaw.replace(/\s/g, '').toUpperCase().slice(0, 4)
          : Object.keys(window.DashboardData.SOCS)[0] || 'EXT';

        const docCur = rawCurCell || lcCurCell || 'MXN';
        const resolvedLcCur = lcCurCell || (window.DashboardData.SOCS[socCode]?.cur) || 'MXN';
        const suppId = getCell(row, 'supplierId');
        const name = Utils.escapeHtml(getCell(row, 'name') || `${module === 'AP' ? 'Proveedor' : 'Cliente'} ${i + 1}`);
        const glAcc = getCell(row, 'glAcc') || '6100000';
        const docNum = Utils.sanitizeAttr(getCell(row, 'doc') || `DOC${String(i + 1).padStart(6, '0')}`);
        const docDate = getCell(row, 'docDate') || getCell(row, 'journalDate') || '';
        const dueDate = getCell(row, 'clearingDate') || '';
        const isClear = clearSt.toString().trim() === '1';
        const paid = isClear ? Math.abs(finalAmt) : 0;

        const status = isClear
          ? 'pagado'
          : rawAging > 90
          ? 'vencido'
          : rawAging > 0
          ? 'pendiente'
          : 'pendiente';

        return {
          id: suppId || `F${String(i + 1).padStart(3, '0')}`,
          soc: socCode,
          name,
          doc: docNum,
          docType,
          docDate,
          dueDate,
          docCur,
          lcCur: resolvedLcCur,
          docAmount: finalAmt,
          paid: paid ? -Math.abs(finalAmt) : 0,
          aging: rawAging,
          status,
          glAcc,
          _socName: getCell(row, 'socName') || '',
        };
      })
      .filter((r) => r.name && r.doc);
  }

  // ─── CARGA DE ARCHIVO ──────────────────────────────────────────
  async processFile(file, module) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (!['csv', 'xlsx', 'xls', 'txt'].includes(ext)) {
      throw new Error('Formato no soportado. Usa CSV o Excel.');
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Archivo demasiado grande (máx 20 MB)');
    }

    let parsedData;

    if (ext === 'xlsx' || ext === 'xls') {
      parsedData = await this.processExcel(file);
    } else {
      parsedData = await this.processText(file);
    }

    const mapped = this.mapRows(parsedData.rows, parsedData.headers, module);

    if (mapped.length === 0) {
      throw new Error(
        `Se leyeron ${parsedData.headers.length} columnas pero no se pudo mapear ninguna fila. Revisa los encabezados.`
      );
    }

    this.uploadedData[module] = { rows: mapped, headers: parsedData.headers, filename: file.name };
    return { rows: mapped, headers: parsedData.headers };
  }

  // ─── PROCESAR EXCEL CON SHEETJS ────────────────────────────────
  async processExcel(file) {
    return new Promise((resolve, reject) => {
      Utils.loadExternalScript(
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        () => {
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
              const wsName = wb.SheetNames[0];
              const ws = wb.Sheets[wsName];
              const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

              if (!aoa || aoa.length < 2) throw new Error('Excel vacío o sin datos');

              const headers = aoa[0].map((h) => (h || '').toString().trim());
              const rows = aoa
                .slice(1)
                .filter((r) => r.some((c) => c !== ''))
                .map((r) => {
                  const obj = {};
                  headers.forEach((h, i) => (obj[h] = (r[i] === null || r[i] === undefined ? '' : String(r[i]).trim())));
                  return obj;
                });

              resolve({ headers, rows });
            };
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsArrayBuffer(file);
          } catch (err) {
            reject(err);
          }
        },
        (err) => reject(err)
      );
    });
  }

  // ─── PROCESAR TEXTO (CSV) ──────────────────────────────────────
  async processText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const { headers, rows } = this.parseCSV(text);
          resolve({ headers, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // ─── APLICAR DATOS CARGADOS AL DASHBOARD ───────────────────────
  applyData(module) {
    if (!this.uploadedData[module]) throw new Error('No hay datos para cargar');

    const { rows } = this.uploadedData[module];

    if (module === 'AP') {
      window.DashboardData.setVendors(rows);
    } else {
      window.DashboardData.setCustomers(rows);
    }

    window.DashboardData.state.dataSource = 'file';
    window.DashboardData.state.fileSourceLabel = this.uploadedData[module].filename;
    window.DashboardData.persistState();

    return { success: true, rowsLoaded: rows.length };
  }
}

window.FileUploadManager = new FileUploadManager();
