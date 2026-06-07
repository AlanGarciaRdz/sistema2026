import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import ContratoPDF from './ContratoPDF';
import { getPaymentsByContractNumber } from '../services/api';

/** Format YYYY-MM-DD to D/M/YYYY (es-MX) without timezone shift */
function formatDateOnly(dateStr) {
  if (!dateStr) return 'N/A';
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

/**
 * Mapeo ContractService → ContratoPDF (info)
 * ContractService          → ContratoPDF key
 * -------------------------|---------------------------
 * folio                    → nombreContrato
 * contactName              → contactName
 * contactPhone             → contactPhone
 * origin                   → origin
 * destination              → destination
 * itineraryText + notes    → detalles (itineraryText, notes)
 * unitType                 → unitType
 * capacity                 → capacity
 * total                    → total
 * departure / serviceDate  → fechaContrato, fechaSalida
 * departureTime / serviceTime → horaSalida
 * returnDate               → fechaRegreso
 * returnTime               → horaRegreso
 *
 * NO EXISTEN en ContractService (se usan defaults):
 * - contactEncargado, contactEncargadoTel
 * - presentarse
 * - referencias
 * - anticipo, pendiente (desde pagos; si no hay pagos: anticipo=0, pendiente=total)
 * - ACC_unidad, sanitarios_unidad, tvdvd_unidad, microfono_unidad, estereo_unidad
 */
const IVA_RATE = 0.16;

/** Montos de IVA: el precio capturado es subtotal; IVA = 16% del subtotal. */
export function calcIvaAmounts(subtotal, includeIva) {
  const base = Math.round((parseFloat(subtotal) || 0) * 100) / 100;
  if (!includeIva) {
    return { includeIva: false, subtotal: base, iva: 0, grandTotal: base };
  }
  const iva = Math.round(base * IVA_RATE * 100) / 100;
  const grandTotal = Math.round((base + iva) * 100) / 100;
  return { includeIva: true, subtotal: base, iva, grandTotal };
}

/** Montos de cobro para listados (Contratos, resúmenes) según notes.includeIva. */
export function getContractBillingAmounts(row) {
  let notesData = {};
  try {
    notesData = row?.notes ? JSON.parse(row.notes) : {};
  } catch {
    notesData = {};
  }
  const includeIva = Boolean(notesData.includeIva);
  const subtotal = parseFloat(row?.total_amount) || 0;
  return calcIvaAmounts(subtotal, includeIva);
}

/** Total a cobrar al cliente (con IVA si aplica). */
export function getContractAmountDue(row) {
  return getContractBillingAmounts(row).grandTotal;
}

/** Total capturado ya incluye IVA → subtotal = total / 1.16 */
export function splitSubtotalFromGrossTotal(grossTotal) {
  const gross = Math.round((parseFloat(grossTotal) || 0) * 100) / 100;
  if (gross <= 0) {
    return { subtotal: 0, iva: 0, grandTotal: 0 };
  }
  const subtotal = Math.round((gross / (1 + IVA_RATE)) * 100) / 100;
  const iva = Math.round((gross - subtotal) * 100) / 100;
  return { subtotal, iva, grandTotal: gross };
}

function calcAnticipoPendienteFromPayments(payments, amountDue) {
  const due = Math.round((parseFloat(amountDue) || 0) * 100) / 100;
  const forContract = payments || [];
  if (forContract.length === 0) {
    return { anticipo: 0, pendiente: due, saldo: due };
  }
  const totalPagado = forContract.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const anticipo = Math.round(totalPagado * 100) / 100;
  const saldo = Math.max(0, Math.round((due - anticipo) * 100) / 100);
  return { anticipo, pendiente: saldo, saldo };
}

function buildPaymentFields(subtotal, includeIva, payments) {
  const ivaCalc = calcIvaAmounts(subtotal, includeIva);
  const due = ivaCalc.grandTotal;
  const pay = calcAnticipoPendienteFromPayments(payments, due);
  const pendienteBase = ivaCalc.includeIva
    ? Math.max(0, Math.round((ivaCalc.subtotal - pay.anticipo) * 100) / 100)
    : pay.pendiente;

  return {
    includeIva: ivaCalc.includeIva,
    subtotal: ivaCalc.subtotal,
    iva: ivaCalc.iva,
    grandTotal: ivaCalc.grandTotal,
    total: ivaCalc.subtotal,
    anticipo: pay.anticipo,
    pendiente: pendienteBase,
    saldo: pay.saldo
  };
}

export async function buildPdfInfoFromForm(formState) {
  const isContrato = formState.mode === 'contrato';
  const fechaSalida = isContrato ? formState.departure : formState.serviceDate;
  const horaSalida = isContrato ? formState.departureTime : formState.serviceTime;
  const includeIva = Boolean(formState.includeIva);
  const subtotalVal = parseFloat(formState.total) || 0;

  let payments = [];
  const contractNumber = formState.folio;
  if (contractNumber) {
    try {
      const res = await getPaymentsByContractNumber(contractNumber);
      payments = res?.data?.data || [];
    } catch (_) {}
  }
  const payFields = buildPaymentFields(subtotalVal, includeIva, payments);

  return {
    nombreContrato: formState.folio,
    fechaContrato: formatDateOnly(fechaSalida),
    contactName: formState.contactName || '',
    contactPhone: formState.contactPhone || '',
    contactEncargado: formState.selectedClient?.name || 'N/A',
    contactEncargadoTel: formState.selectedClient?.phone || 'N/A',
    origin: formState.origin || '',
    origin_maps: formState.originMaps || '',
    referencias: formState.referencias || 'N/A',
    destination: formState.destination || '',
    destination_maps: formState.destinationMaps || '',
    itineraryText: formState.itineraryText || '',
    notes: formState.notes || '',
    unitType: formState.unitType || '',
    capacity: formState.capacity || '',
    ...payFields,
    fechaSalida: formatDateOnly(fechaSalida),
    horaSalida: horaSalida || 'N/A',
    fechaRegreso: formatDateOnly(formState.returnDate),
    horaRegreso: formState.returnTime || 'N/A',
    presentarse: horaSalida || 'N/A'
  };
}

/**
 * Mapeo row (tabla contratos) → info para ContratoPDF
 */
export async function buildPdfInfoFromRow(row) {
  let notesData = {};
  try {
    notesData = row.notes ? JSON.parse(row.notes) : {};
  } catch {}

  const startStr = row.start_date ? String(row.start_date).slice(0, 10) : '';
  const endStr = row.end_date ? String(row.end_date).slice(0, 10) : '';
  const includeIva = Boolean(notesData.includeIva);
  const subtotalVal = parseFloat(row.total_amount) || 0;

  let payments = [];
  const contractNumber = row.contract_number;
  if (contractNumber) {
    try {
      const res = await getPaymentsByContractNumber(contractNumber);
      payments = res?.data?.data || [];
    } catch (_) {}
  }
  const payFields = buildPaymentFields(subtotalVal, includeIva, payments);

  return {
    nombreContrato: row.contract_number,
    fechaContrato: formatDateOnly(startStr),
    contactName: notesData.contactName || row.client_name || '',
    contactPhone: notesData.contactPhone || row.client_phone || '',
    contactEncargado: row.client_name || 'N/A',
    contactEncargadoTel: notesData.contactPhone || row.client_phone || 'N/A',
    origin: row.origin || '',
    origin_maps: row.origin_maps || '',
    destination: row.destination || '',
    destination_maps: row.destination_maps || '',
    itineraryText: row.itinerary || '',
    notes: notesData.notes || '',
    unitType: notesData.unitType || '',
    capacity: row.passenger_count ?? '',
    ...payFields,
    fechaSalida: formatDateOnly(startStr),
    horaSalida: notesData.departureTime || notesData.serviceTime || 'N/A',
    fechaRegreso: formatDateOnly(endStr),
    horaRegreso: notesData.returnTime || 'N/A',
    presentarse: notesData.departureTime || notesData.serviceTime || 'N/A',
    referencias: notesData.referencias || 'N/A'
  };
}

export async function generateContractPdf(info) {
  const qrUrl = `https://recorriendokilometros.com.mx/${info.nombreContrato}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

  const doc = new jsPDF('p', 'pt', 'letter');
  ContratoPDF.Contrato(doc, info, qrDataUrl, info.nombreContrato);
  doc.save(`${info.nombreContrato}.pdf`);
}
