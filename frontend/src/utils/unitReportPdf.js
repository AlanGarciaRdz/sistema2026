import { jsPDF } from 'jspdf';
import { formatDateLocal } from './formatDateLocal';

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAGE_BOTTOM = 287;
const LINE = 5.5;

const formatCurrency = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

const fmtDate = (d) => {
  const f = formatDateLocal(d);
  return f && f !== '-' ? f : '—';
};

const truncate = (text, max = 42) => {
  const s = String(text ?? '').trim();
  if (s.length <= max) return s || '—';
  return `${s.slice(0, max - 1)}…`;
};

/** Texto seguro para jsPDF (sin flechas unicode que desbordan). */
const pdfSafe = (text) =>
  String(text ?? '')
    .replace(/\u2192/g, '>')
    .replace(/\s+/g, ' ')
    .trim() || '—';

function ensurePage(doc, y, reserve = 18) {
  if (y + reserve > PAGE_BOTTOM) {
    doc.addPage();
    return MARGIN + 8;
  }
  return y;
}

function colPositions(colWidths) {
  const positions = [];
  let x = MARGIN;
  for (const w of colWidths) {
    positions.push(x);
    x += w;
  }
  return positions;
}

function cellLines(doc, text, maxWidth) {
  return doc.splitTextToSize(pdfSafe(text), Math.max(6, maxWidth - 2));
}

function drawCellText(doc, text, x, y, width, align = 'left') {
  const pad = 1.5;
  const innerW = Math.max(6, width - pad * 2);
  const lines = cellLines(doc, text, innerW);
  const line = lines[0] || '—';
  if (align === 'right') {
    doc.text(line, x + width - pad, y, { maxWidth: innerW, align: 'right' });
  } else {
    doc.text(line, x + pad, y, { maxWidth: innerW });
  }
  return lines.length;
}

function drawSimpleTable(doc, y, headers, rows, colWidths, colAlign = []) {
  if (!rows.length) {
    y = ensurePage(doc, y, LINE + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Sin registros en este periodo.', MARGIN, y);
    return y + LINE + 4;
  }

  const xs = colPositions(colWidths);
  const baseRowH = 6.5;

  y = ensurePage(doc, y, baseRowH + 6);
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y - 3.5, CONTENT_W, baseRowH, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  headers.forEach((h, i) => {
    drawCellText(doc, h, xs[i], y, colWidths[i], colAlign[i] || 'left');
  });
  y += baseRowH;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.8);

  for (const row of rows) {
    const lineCounts = row.map((cell, i) => {
      const innerW = Math.max(6, colWidths[i] - 3);
      return cellLines(doc, cell, innerW).length;
    });
    const rowLines = Math.min(2, Math.max(1, ...lineCounts));
    const rowH = baseRowH + (rowLines - 1) * (LINE - 0.5);

    y = ensurePage(doc, y, rowH + 2);
    const rowY = y;

    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const pad = 1.5;
      const innerW = Math.max(6, colWidths[i] - pad * 2);
      const lines = cellLines(doc, cell, innerW).slice(0, rowLines);
      const align = colAlign[i] || 'left';
      for (let li = 0; li < lines.length; li++) {
        const ly = rowY + li * (LINE - 0.5);
        const line = lines[li];
        if (align === 'right') {
          doc.text(line, xs[i] + colWidths[i] - pad, ly, { maxWidth: innerW, align: 'right' });
        } else {
          doc.text(line, xs[i] + pad, ly, { maxWidth: innerW });
        }
      }
    }
    y += rowH;
  }

  return y + 3;
}

function drawSectionTitle(doc, y, title) {
  y = ensurePage(doc, y, 14);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
  return y + LINE + 2;
}

function drawKeyValue(doc, y, label, value, boldValue = false) {
  y = ensurePage(doc, y, LINE + 2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(label, MARGIN, y);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', boldValue ? 'bold' : 'normal');
  doc.text(String(value), MARGIN + 52, y);
  return y + LINE;
}

const CONTRACT_COL_WIDTHS = [17, 24, 28, 68, 45];
const CONTRACT_COL_ALIGN = ['left', 'left', 'left', 'left', 'right'];

function formatRoute(origin, destination) {
  const o = pdfSafe(origin);
  const d = pdfSafe(destination);
  if (o === '—' && d === '—') return '—';
  if (o === '—') return d;
  if (d === '—') return o;
  return `${o} > ${d}`;
}

/**
 * Genera y descarga PDF del reporte por unidad.
 * @param {object} report — respuesta de GET /reports/unit
 */
export function generateUnitReportPdf(report) {
  if (!report?.vehicle || !report?.summary) {
    throw new Error('No hay datos de reporte para exportar');
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const { vehicle, period, summary } = report;
  const label = vehicle.label || vehicle.vehicle_code || `Unidad ${vehicle.id}`;

  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Reporte por unidad', MARGIN, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Recorriendo Kilómetros · Sistema RK', MARGIN, y + 6);
  y += 14;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(label, MARGIN, y);
  y += LINE;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const periodText = `${fmtDate(period.start)} — ${fmtDate(period.end)}`;
  doc.text(`Periodo: ${periodText}`, MARGIN, y);
  if (vehicle.license_plate) {
    doc.text(`Placas: ${vehicle.license_plate}`, MARGIN + 70, y);
  }
  y += LINE + 4;

  const profitOk = summary.has_profit;
  doc.setFillColor(profitOk ? 236 : 254, profitOk ? 253 : 242, profitOk ? 245 : 242);
  doc.setDrawColor(profitOk ? 167 : 252, profitOk ? 243 : 165, profitOk ? 208 : 165);
  doc.roundedRect(MARGIN, y - 3, CONTENT_W, 16, 2, 2, 'FD');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(profitOk ? 6 : 185, profitOk ? 95 : 28, profitOk ? 70 : 28);
  doc.text(
    profitOk ? 'El periodo tuvo utilidad' : 'El periodo tuvo pérdida',
    MARGIN + 4,
    y + 4
  );
  doc.setFontSize(11);
  doc.text(`Utilidad proyectada: ${formatCurrency(summary.profit_projected)}`, MARGIN + 4, y + 10);
  y += 20;

  y = drawSectionTitle(doc, y, 'Resumen financiero');
  y = drawKeyValue(doc, y, 'Viajes', summary.contracts_count);
  y = drawKeyValue(doc, y, 'Clientes', summary.clients?.length ?? 0);
  if (summary.clients?.length) {
    const clientLine = truncate(summary.clients.join(', '), 75);
    y = drawKeyValue(doc, y, 'Lista clientes', clientLine);
  }
  y = drawKeyValue(doc, y, 'Monto cotizado', formatCurrency(summary.total_quoted), true);
  y = drawKeyValue(doc, y, 'Ingresos cobrados', formatCurrency(summary.total_income_collected), true);
  y = drawKeyValue(doc, y, 'Egresos viajes', formatCurrency(summary.total_contract_expenses));
  y = drawKeyValue(doc, y, 'Mantenimiento', formatCurrency(summary.total_maintenance_cost));
  y = drawKeyValue(doc, y, 'Pagos crédito', formatCurrency(summary.total_credit_expenses ?? 0));
  if ((summary.total_other_unit_expenses ?? 0) > 0) {
    y = drawKeyValue(doc, y, 'Otros egresos unidad', formatCurrency(summary.total_other_unit_expenses));
  }
  y = drawKeyValue(doc, y, 'Total egresos', formatCurrency(summary.total_expenses), true);
  y = drawKeyValue(doc, y, 'Utilidad (cobrado)', formatCurrency(summary.profit_collected), true);
  y += 4;

  y = drawSectionTitle(doc, y, `Contratos realizados (${report.contracts?.length ?? 0})`);
  y = drawSimpleTable(
    doc,
    y,
    ['Fecha', 'Contrato', 'Cliente', 'Ruta', 'Cotizado'],
    (report.contracts || []).map((c) => [
      fmtDate(c.start_date),
      c.contract_number || '—',
      truncate(c.client_name, 18),
      formatRoute(c.origin, c.destination),
      formatCurrency(c.quoted_amount)
    ]),
    CONTRACT_COL_WIDTHS,
    CONTRACT_COL_ALIGN
  );

  y = drawSectionTitle(doc, y, `Mantenimientos (${report.maintenance?.length ?? 0})`);
  y = drawSimpleTable(
    doc,
    y,
    ['Fecha', 'Tipo', 'Km', 'Costo', 'Notas'],
    (report.maintenance || []).map((m) => [
      fmtDate(m.maintenance_date),
      truncate(m.maintenance_type, 20),
      m.mileage != null && m.mileage !== '' ? Number(m.mileage).toLocaleString('es-MX') : '—',
      formatCurrency(m.cost),
      truncate(m.notes, 24)
    ]),
    [18, 36, 16, 28, 84],
    ['left', 'left', 'right', 'right', 'left']
  );

  y = drawSectionTitle(doc, y, `Pagos de crédito (${report.credit_expenses?.length ?? 0})`);
  y = drawSimpleTable(
    doc,
    y,
    ['Fecha', 'Monto', 'Cuenta', 'Unidad neg.', 'Notas'],
    (report.credit_expenses || []).map((e) => [
      fmtDate(e.expense_date),
      formatCurrency(e.amount),
      truncate(e.account_name, 18),
      truncate(e.business_unit, 14),
      truncate(e.notes, 22)
    ]),
    [18, 26, 38, 28, 72],
    ['left', 'right', 'left', 'left', 'left']
  );

  if ((report.other_unit_expenses?.length ?? 0) > 0) {
    y = drawSectionTitle(doc, y, `Otros egresos de unidad (${report.other_unit_expenses.length})`);
    y = drawSimpleTable(
      doc,
      y,
      ['Fecha', 'Tipo', 'Monto', 'Cuenta', 'Notas'],
      report.other_unit_expenses.map((e) => [
        fmtDate(e.expense_date),
        truncate(e.expense_type, 14),
        formatCurrency(e.amount),
        truncate(e.account_name, 18),
        truncate(e.notes, 22)
      ]),
      [18, 22, 26, 34, 82],
      ['left', 'left', 'right', 'left', 'left']
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generado ${new Date().toLocaleString('es-MX')} · Página ${p} de ${pageCount}`,
      PAGE_W / 2,
      292,
      { align: 'center' }
    );
  }

  const safeLabel = String(label).replace(/[^\w-]+/g, '_').slice(0, 40);
  const fileName = `reporte_${safeLabel}_${period.start}_${period.end}.pdf`;
  doc.save(fileName);
}
