/** Convierte DD/MM/YYYY → YYYY-MM-DD */
function parseMovementDate(str) {
  const s = String(str || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  return `${m[3]}-${month}-${day}`;
}

function splitCsvLine(line) {
  return line.split(',').map((c) => c.trim());
}

/**
 * Parsea export IAVE / EasyTrip (movimientos_*.csv).
 * @returns {{ rows: Array, errors: string[], totalAmount: number }}
 */
export function parseCasetasCsv(text) {
  const errors = [];
  const raw = String(text || '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!raw) return { rows: [], errors: ['El archivo está vacío'], totalAmount: 0 };

  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ['No hay movimientos en el archivo'], totalAmount: 0 };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name) => header.findIndex((h) => h === name.toLowerCase());

  const iConcepto = col('Concepto');
  const iFecha = col('Fecha de Movimiento');
  const iHora = col('Hora de Movimiento');
  const iCarril = col('Carril');
  const iCaseta = col('Caseta');
  const iImporte = col('Importe');
  const iFolio = col('Folio');

  if (iImporte < 0) {
    return { rows: [], errors: ['No se encontró la columna Importe'], totalAmount: 0 };
  }

  const rows = [];

  for (let n = 1; n < lines.length; n++) {
    const parts = splitCsvLine(lines[n]);
    if (parts.length < 3) continue;

    const concepto = iConcepto >= 0 ? parts[iConcepto] : '';
    const importeRaw = parts[iImporte];
    const importeNum = parseFloat(String(importeRaw).replace(/,/g, ''));
    if (!Number.isFinite(importeNum) || importeNum === 0) continue;

    const isPeaje =
      String(concepto).toUpperCase() === 'PEAJE' || importeNum < 0;
    if (!isPeaje) continue;

    const amount = Math.abs(Math.round(importeNum * 100) / 100);
    const carril = iCarril >= 0 ? parts[iCarril] : '';
    const caseta = iCaseta >= 0 ? parts[iCaseta] : '';
    const hora = iHora >= 0 ? parts[iHora] : '';
    const folio = iFolio >= 0 ? parts[iFolio] : '';
    const expenseDate = iFecha >= 0 ? parseMovementDate(parts[iFecha]) : null;

    if (!expenseDate) {
      errors.push(`Línea ${n + 1}: fecha inválida`);
      continue;
    }

    const notes = [carril || caseta, hora].filter(Boolean).join(' ').trim() || caseta || 'Caseta';

    rows.push({
      expense_type: 'Casetas',
      amount,
      expense_date: expenseDate,
      notes,
      tag_folio: folio || null,
      caseta: caseta || null,
      carril: carril || null,
      hora: hora || null
    });
  }

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  if (!rows.length && !errors.length) {
    errors.push('No se encontraron cargos de peaje (PEAJE) en el archivo');
  }

  return { rows, errors, totalAmount };
}
