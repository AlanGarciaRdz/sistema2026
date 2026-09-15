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
  return doc.splitTextToSize(String(text ?? '—'), Math.max(6, maxWidth - 2));
}

function drawSimpleTable(doc, y, headers, rows, colWidths, colAlign = []) {
  if (!rows.length) {
    y = ensurePage(doc, y, LINE + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Sin registros.', MARGIN, y);
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
    const pad = 1.5;
    const innerW = Math.max(6, colWidths[i] - pad * 2);
    const align = colAlign[i] || 'left';
    if (align === 'right') {
      doc.text(h, xs[i] + colWidths[i] - pad, y, { maxWidth: innerW, align: 'right' });
    } else {
      doc.text(h, xs[i] + pad, y, { maxWidth: innerW });
    }
  });
  y += baseRowH;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6.8);

  for (const row of rows) {
    y = ensurePage(doc, y, baseRowH + 2);
    const rowY = y;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const pad = 1.5;
      const innerW = Math.max(6, colWidths[i] - pad * 2);
      const lines = cellLines(doc, cell, innerW);
      const align = colAlign[i] || 'left';
      const text = lines[0] || '—';
      if (align === 'right') {
        doc.text(text, xs[i] + colWidths[i] - pad, rowY, { maxWidth: innerW, align: 'right' });
      } else {
        doc.text(text, xs[i] + pad, rowY, { maxWidth: innerW });
      }
    }
    y += baseRowH;
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
  doc.text(String(value), MARGIN + 58, y);
  return y + LINE;
}

export function generateCompanyReportPdf(report) {
  if (!report?.summary) throw new Error('No hay datos de reporte empresa');

  const doc = new jsPDF('p', 'mm', 'a4');
  const { period, summary } = report;
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte mensual — Empresa', MARGIN, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Recorriendo Kilómetros · Sistema RK', MARGIN, y + 6);
  y += 14;

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periodo: ${fmtDate(period.start)} — ${fmtDate(period.end)}`, MARGIN, y);
  y += LINE + 4;

  const profitOk = summary.has_profit;
  doc.setFillColor(profitOk ? 236 : 254, profitOk ? 253 : 242, profitOk ? 245 : 242);
  doc.roundedRect(MARGIN, y - 3, CONTENT_W, 14, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(profitOk ? 6 : 185, profitOk ? 95 : 28, profitOk ? 70 : 28);
  doc.text(
    `${profitOk ? 'Flujo positivo' : 'Flujo negativo'}: ${formatCurrency(summary.net_flow)}`,
    MARGIN + 4,
    y + 5
  );
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Ingresos ${formatCurrency(summary.total_income)} − Egresos ${formatCurrency(summary.total_expenses)}`,
    MARGIN + 4,
    y + 10
  );
  y += 18;

  y = drawSectionTitle(doc, y, 'Resumen general');
  y = drawKeyValue(doc, y, 'Total viajes', summary.total_trips);
  y = drawKeyValue(doc, y, 'Valor contratado', formatCurrency(summary.contracts_quoted_value));
  y = drawKeyValue(doc, y, 'Ingresos cobrados', formatCurrency(summary.total_income), true);
  y = drawKeyValue(doc, y, 'Egresos totales', formatCurrency(summary.total_expenses), true);
  y = drawKeyValue(doc, y, 'Impuestos / IMSS', formatCurrency(summary.total_taxes));
  y = drawKeyValue(
    doc,
    y,
    'Por cobrar (actual)',
    `${formatCurrency(summary.por_cobrar_total)} (${summary.por_cobrar_count} contratos)`
  );
  y = drawKeyValue(
    doc,
    y,
    'Saldo neto cuentas',
    formatCurrency(summary.accounts_net_balance),
    true
  );
  y += 4;

  y = drawSectionTitle(doc, y, 'Resumen por unidad de negocio');
  y = drawSimpleTable(
    doc,
    y,
    ['Unidad', 'Viajes', 'Ingresos', 'Egresos', 'Impuestos', 'Por cobrar', 'Utilidad'],
    (report.by_unit || []).map((u) => [
      u.label || u.business_unit,
      String(u.trips),
      formatCurrency(u.income),
      formatCurrency(u.expenses),
      formatCurrency(u.taxes),
      formatCurrency(u.por_cobrar),
      formatCurrency(u.profit)
    ]),
    [32, 14, 26, 26, 22, 26, 26],
    ['left', 'right', 'right', 'right', 'right', 'right', 'right']
  );

  y = drawSectionTitle(doc, y, 'Cuentas por tipo (periodo)');
  y = drawSimpleTable(
    doc,
    y,
    ['Tipo', 'Cuentas', 'Ingresos', 'Egresos', 'Saldo neto'],
    (report.accounts_by_type || []).map((t) => [
      t.account_type,
      String(t.count),
      formatCurrency(t.income),
      formatCurrency(t.expenses),
      formatCurrency(t.total_balance)
    ]),
    [28, 16, 34, 34, 34],
    ['left', 'right', 'right', 'right', 'right']
  );

  y = drawSectionTitle(doc, y, 'Cuentas por banco');
  y = drawSimpleTable(
    doc,
    y,
    ['Banco', 'Cuentas', 'Saldo neto periodo'],
    (report.accounts_by_bank || []).map((b) => [
      b.bank_name,
      String(b.count),
      formatCurrency(b.total_balance)
    ]),
    [70, 22, 50],
    ['left', 'right', 'right']
  );

  y = drawSectionTitle(doc, y, 'Detalle de cuentas');
  y = drawSimpleTable(
    doc,
    y,
    ['Cuenta', 'Tipo', 'Ingresos', 'Egresos', 'Saldo'],
    (report.accounts || [])
      .filter((a) => a.income || a.expenses || a.balance)
      .map((a) => [
        a.account_name,
        a.account_type,
        formatCurrency(a.income),
        formatCurrency(a.expenses),
        formatCurrency(a.balance)
      ]),
    [52, 22, 30, 30, 30],
    ['left', 'left', 'right', 'right', 'right']
  );

  y = drawSectionTitle(doc, y, 'Egresos por tipo');
  y = drawSimpleTable(
    doc,
    y,
    ['Tipo', 'Registros', 'Total'],
    (report.expenses_by_type || []).slice(0, 20).map((e) => [
      e.expense_type,
      String(e.count),
      formatCurrency(e.total)
    ]),
    [90, 22, 42],
    ['left', 'right', 'right']
  );

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

  doc.save(`reporte_empresa_${period.start}_${period.end}.pdf`);
}
