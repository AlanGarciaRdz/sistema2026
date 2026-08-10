import rklogo from '../images/rklogo';
import {
  TERMINOS_IMPORTANTE,
  NOTA_RESERVA_COTIZACION,
  getTerminosCotizacion
} from './pdfTerminos';
import {
  serviceItemDisplayLabel,
  parseServiceItemAmount
} from './quoteServiceUtils';

function formatMoney(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$0';
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ensureSpace(doc, y, needed, marginTop = 40) {
  const pageH = doc.internal.pageSize.height;
  if (y + needed > pageH - 30) {
    doc.addPage();
    return marginTop;
  }
  return y;
}

function drawTerminosSection(doc, startY, colors) {
  let y = startY;

  y = ensureSpace(doc, y, 30);
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(1);
  const importanteLines = doc.splitTextToSize(TERMINOS_IMPORTANTE, 520);
  const importanteH = Math.max(28, importanteLines.length * 8 + 14);
  doc.roundedRect(15, y, 550, importanteH, 5, 5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.setFont('helvetica', 'bold');
  doc.text(importanteLines, 25, y + 12);
  doc.setFont('helvetica', 'normal');
  y += importanteH + 12;

  y = ensureSpace(doc, y, 24);
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, y, 550, 8, 0, 0, 'F');
  doc.setTextColor(...colors.primary);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(290, y + 1, 'TÉRMINOS Y CONDICIONES', 'center');
  doc.setFont('helvetica', 'normal');
  y += 10;

  doc.setFontSize(6.5);
  doc.setTextColor(...colors.dark);

  getTerminosCotizacion().forEach((termino) => {
    const lines = doc.splitTextToSize(termino, 530);
    const blockH = lines.length * 7 + 6;
    y = ensureSpace(doc, y, blockH);
    doc.text(lines, 25, y);
    y += blockH;
  });

  y = ensureSpace(doc, y, 36);
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, y, 550, 32, 5, 5, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  const aceptacion = doc.splitTextToSize(
    'He leído y acepto los términos y condiciones del servicio de transporte.',
    520
  );
  doc.text(aceptacion, 25, y + 12);
  y += 40;

  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1);
  doc.line(40, y, 200, y);
  doc.setFontSize(6);
  doc.setTextColor(...colors.gray);
  doc.text(40, y + 8, 'Firma del cliente');

  return y;
}

function Cotizacion(doc, info) {
  const colors = {
    primary: [37, 99, 235],
    accent: [14, 165, 233],
    dark: [15, 23, 42],
    gray: [100, 116, 139],
    lightGray: [241, 245, 249],
    white: [255, 255, 255],
    success: [34, 197, 94]
  };

  const pageW = doc.internal.pageSize.width;

  doc.setFillColor(...colors.white);
  doc.rect(0, 0, pageW, 85, 'F');

  doc.setFillColor(...colors.accent);
  doc.rect(0, 75, pageW, 10, 'F');

  try {
    doc.addImage(rklogo, 'PNG', 20, 15, 110, 35);
  } catch {
    /* logo opcional */
  }

  doc.setTextColor(...colors.gray);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(145, 25, 'COTIZACIÓN DE TRANSPORTE');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(145, 35, 'RECORRIENDO KILOMETROS SA DE CV');
  doc.text(145, 42, 'RFC: RKI180820PJA');
  doc.text(145, 49, 'PERMISO: 1431RKI28092021041901000');

  doc.setFillColor(...colors.white);
  doc.roundedRect(380, 15, 185, 55, 5, 5, 'F');

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(390, 25, 'FECHA');
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(390, 35, info.fechaCotizacion || 'N/A');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(390, 50, 'FOLIO');
  doc.setFontSize(13);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(390, 62, info.folio || 'N/A');
  doc.setFont('helvetica', 'normal');

  let y = 100;

  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, y, 550, 38, 8, 8, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, y + 12, 'CLIENTE');
  doc.setFontSize(12);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(25, y + 26, info.clientName || 'Por definir');
  doc.setFont('helvetica', 'normal');

  y += 50;

  const conceptItems = (info.serviceItems || []).filter((item) => parseServiceItemAmount(item) > 0);
  const hasConcepts = info.quoteMode === 'concepts' && conceptItems.length > 0;
  const serviceBoxH = hasConcepts
    ? Math.max(120, 42 + conceptItems.length * 16 + 36)
    : 130;

  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.5);
  doc.setFillColor(...colors.white);
  doc.roundedRect(15, y, 550, serviceBoxH, 8, 8, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(25, y + 14, hasConcepts ? 'SERVICIO COTIZADO' : 'SERVICIO DE TRANSPORTE');
  doc.setFont('helvetica', 'normal');

  let dateY = y + 95;

  if (hasConcepts) {
    let rowY = y + 30;
    conceptItems.forEach((item) => {
      const label = serviceItemDisplayLabel(item);
      const labelLines = doc.splitTextToSize(label, 380);
      doc.setFontSize(8);
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'normal');
      doc.text(labelLines, 25, rowY);
      doc.setFont('helvetica', 'bold');
      doc.text(520, rowY, formatMoney(parseServiceItemAmount(item)), { align: 'right' });
      doc.setFont('helvetica', 'normal');
      rowY += Math.max(14, labelLines.length * 10);
    });

    dateY = Math.max(rowY + 8, y + serviceBoxH - 28);
    doc.setFontSize(7);
    doc.setTextColor(...colors.gray);
    doc.text(25, dateY, 'FECHA(S) DEL SERVICIO');
    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(25, dateY + 12, info.fechasServicio || 'Por definir');
    doc.setFont('helvetica', 'normal');

    if (info.unitType) {
      doc.setFontSize(7);
      doc.setTextColor(...colors.gray);
      doc.text(330, dateY, 'UNIDAD');
      doc.setFontSize(10);
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'bold');
      const unitLabel = info.capacity
        ? `${info.unitType} · ${info.capacity} pasajeros`
        : info.unitType;
      doc.text(330, dateY + 12, unitLabel);
      doc.setFont('helvetica', 'normal');
    }
  } else {
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, y + 30, 'ORIGEN');
  doc.setFontSize(16);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  const originLines = doc.splitTextToSize(info.origin || '—', 220);
  doc.text(originLines, 25, y + 48);

  doc.setFillColor(...colors.primary);
  doc.circle(285, y + 55, 14, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(14);
  doc.text(285, y + 59, '→', { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(330, y + 30, 'DESTINO');
  doc.setFontSize(16);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  const destLines = doc.splitTextToSize(info.destination || '—', 220);
  doc.text(destLines, 330, y + 48);
  doc.setFont('helvetica', 'normal');

  const routeBottom = y + 48 + Math.max(originLines.length, destLines.length) * 18;
  dateY = Math.max(routeBottom + 8, y + 95);

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, dateY, 'FECHA(S) DEL SERVICIO');
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(25, dateY + 12, info.fechasServicio || 'Por definir');
  doc.setFont('helvetica', 'normal');

  if (info.unitType) {
    doc.setFontSize(7);
    doc.setTextColor(...colors.gray);
    doc.text(330, dateY, 'UNIDAD');
    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    const unitLabel = info.capacity
      ? `${info.unitType} · ${info.capacity} pasajeros`
      : info.unitType;
    doc.text(330, dateY + 12, unitLabel);
    doc.setFont('helvetica', 'normal');
  }
  }

  y += serviceBoxH + 15;

  const opciones =
    info.opciones?.length > 0
      ? info.opciones
      : [
          {
            vehicleType: info.unitType,
            capacity: info.capacity,
            precio: info.precio,
            anticipo20: info.anticipo20,
            saldo80: info.saldo80
          }
        ];
  const multiPrecio = opciones.length > 1;
  const precioBoxH = multiPrecio ? 24 + opciones.length * 44 : 72;

  doc.setFillColor(...colors.primary);
  doc.roundedRect(15, y, 550, precioBoxH, 8, 8, 'F');

  doc.setTextColor(199, 210, 254);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(30, y + 16, multiPrecio ? 'PRECIOS DEL SERVICIO' : 'PRECIO DEL SERVICIO');

  if (multiPrecio) {
    let rowY = y + 30;
    opciones.forEach((op) => {
      const label = op.capacity
        ? `${op.vehicleType} · ${op.capacity} pax`
        : op.vehicleType || 'Unidad';
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(199, 210, 254);
      doc.text(30, rowY, label);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text(320, rowY, formatMoney(op.precio), { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(199, 210, 254);
      doc.text(
        320,
        rowY + 11,
        `Anticipo 20%: ${formatMoney(op.anticipo20)} · Saldo al salir: ${formatMoney(op.saldo80)}`,
        { align: 'right' }
      );
      rowY += 44;
    });
  } else {
    const op = opciones[0];
    doc.setTextColor(...colors.white);
    doc.setFontSize(28);
    doc.text(30, y + 48, formatMoney(op.precio));
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(199, 210, 254);
    doc.text(30, y + 62, 'MXN · precio total cotizado');
  }

  y += precioBoxH + 10;

  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(...colors.success);
  doc.setLineWidth(1);
  const reservaLines = doc.splitTextToSize(NOTA_RESERVA_COTIZACION, 520);
  const reservaH = Math.max(48, reservaLines.length * 9 + 28);
  doc.roundedRect(15, y, 550, reservaH, 5, 5, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(25, y + 12, 'POLÍTICA DE RESERVA Y PAGO');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colors.dark);
  doc.text(reservaLines, 25, y + 22);

  if (info.anticipo20 != null && info.saldo80 != null && !multiPrecio) {
    doc.setFont('helvetica', 'bold');
    doc.text(25, y + reservaH - 9, `Anticipo 20%: ${formatMoney(info.anticipo20)}`);
    doc.text(280, y + reservaH - 9, `Saldo al salir: ${formatMoney(info.saldo80)}`);
    doc.setFont('helvetica', 'normal');
  }

  y += reservaH + 10;

  const notaPersonal = String(info.pdfNote || '').trim();
  if (notaPersonal) {
    const notaLines = doc.splitTextToSize(notaPersonal, 520);
    const notaH = Math.max(36, notaLines.length * 9 + 22);
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, y, 550, notaH, 5, 5, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(180, 120, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(25, y + 12, 'NOTA');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colors.dark);
    doc.text(notaLines, 25, y + 22);
    y += notaH + 10;
  }

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(
    15,
    y,
    `Vigencia de la cotización: ${info.vigencia || '15 días'} · recorriendokilometros.com.mx`
  );
  doc.text(15, y + 10, 'Gracias por su preferencia. Para confirmar el servicio, contáctenos.');

  y += 28;
  drawTerminosSection(doc, y, colors);
}

const exportedObject = {
  Cotizacion
};

export default exportedObject;
