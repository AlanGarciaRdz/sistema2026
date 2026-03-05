import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import ContratoPDF from './ContratoPDF';
import { getPaymentsByContractNumber } from '../services/api';

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
function calcAnticipoPendienteFromPayments(payments, totalVal) {
  const forContract = payments || [];
  if (forContract.length === 0) {
    return { anticipo: 0, pendiente: totalVal };
  }
  const totalPagado = forContract.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const anticipo = totalPagado;
  const pendiente = Math.max(0, totalVal - totalPagado);
  return { anticipo, pendiente };
}

export async function buildPdfInfoFromForm(formState) {
  const isContrato = formState.mode === 'contrato';
  const fechaSalida = isContrato ? formState.departure : formState.serviceDate;
  const horaSalida = isContrato ? formState.departureTime : formState.serviceTime;
  const totalVal = parseFloat(formState.total) || 0;

  let anticipo = 0;
  let pendiente = totalVal;
  const contractNumber = formState.folio;
  if (contractNumber) {
    try {
      const res = await getPaymentsByContractNumber(contractNumber);
      const payments = res?.data?.data || [];
      const calc = calcAnticipoPendienteFromPayments(payments, totalVal);
      anticipo = calc.anticipo;
      pendiente = calc.pendiente;
    } catch (_) {}
  }

  return {
    nombreContrato: formState.folio,
    fechaContrato: fechaSalida ? new Date(fechaSalida).toLocaleDateString('es-MX') : 'N/A',
    contactName: formState.contactName || '',
    contactPhone: formState.contactPhone || '',
    contactEncargado: formState.selectedClient?.name || 'N/A',
    contactEncargadoTel: formState.selectedClient?.phone || 'N/A',
    origin: formState.origin || '',
    destination: formState.destination || '',
    itineraryText: formState.itineraryText || '',
    notes: formState.notes || '',
    unitType: formState.unitType || '',
    capacity: formState.capacity || '',
    total: totalVal,
    anticipo,
    pendiente,
    fechaSalida: fechaSalida ? new Date(fechaSalida).toLocaleDateString('es-MX') : 'N/A',
    horaSalida: horaSalida || 'N/A',
    fechaRegreso: formState.returnDate ? new Date(formState.returnDate).toLocaleDateString('es-MX') : 'N/A',
    horaRegreso: formState.returnTime || 'N/A',
    presentarse: horaSalida || 'N/A',
    referencias: 'N/A'
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
  const totalVal = parseFloat(row.total_amount) || 0;

  let anticipo = 0;
  let pendiente = totalVal;
  const contractNumber = row.contract_number;
  if (contractNumber) {
    try {
      const res = await getPaymentsByContractNumber(contractNumber);
      const payments = res?.data?.data || [];
      const calc = calcAnticipoPendienteFromPayments(payments, totalVal);
      anticipo = calc.anticipo;
      pendiente = calc.pendiente;
    } catch (_) {}
  }

  return {
    nombreContrato: row.contract_number,
    fechaContrato: startStr ? new Date(startStr).toLocaleDateString('es-MX') : 'N/A',
    contactName: notesData.contactName || row.client_name || '',
    contactPhone: notesData.contactPhone || '',
    contactEncargado: row.client_name || 'N/A',
    contactEncargadoTel: notesData.contactPhone || 'N/A',
    origin: row.origin || '',
    destination: row.destination || '',
    itineraryText: row.itinerary || '',
    notes: notesData.notes || '',
    unitType: notesData.unitType || '',
    capacity: row.passenger_count ?? '',
    total: totalVal,
    anticipo,
    pendiente,
    fechaSalida: startStr ? new Date(startStr).toLocaleDateString('es-MX') : 'N/A',
    horaSalida: notesData.departureTime || notesData.serviceTime || 'N/A',
    fechaRegreso: endStr ? new Date(endStr).toLocaleDateString('es-MX') : 'N/A',
    horaRegreso: notesData.returnTime || 'N/A',
    presentarse: notesData.departureTime || notesData.serviceTime || 'N/A',
    referencias: 'N/A'
  };
}

export async function generateContractPdf(info) {
  const qrUrl = `https://recorriendokilometros.com.mx/${info.nombreContrato}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

  const doc = new jsPDF('p', 'pt', 'letter');
  ContratoPDF.Contrato(doc, info, qrDataUrl, info.nombreContrato);
  doc.save(`${info.nombreContrato}.pdf`);
}
