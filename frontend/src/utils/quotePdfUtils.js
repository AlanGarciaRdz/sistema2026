import { jsPDF } from 'jspdf';
import CotizacionPDF from './CotizacionPDF';

function formatDateOnly(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

export function generateQuoteFolio() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `C${y}${m}${d}${h}${min}`;
}

function formatFechasServicio(trip) {
  if (!trip?.dateStart) return 'Por definir';
  const start = formatDateOnly(trip.dateStart);
  if (!trip.roundTrip || !trip.dateEnd || trip.dateEnd === trip.dateStart) {
    return start;
  }
  return `${start} — ${formatDateOnly(trip.dateEnd)}`;
}

function addDaysToToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Arma info para CotizacionPDF desde el estado de QuoteCalculator.
 */
export function buildQuotePdfInfo({
  clientName,
  trip,
  selectedQuote,
  agreedAmount,
  folio,
  editingQuote
}) {
  const precioCalculado = parseFloat(selectedQuote?.costs?.total) || 0;
  const acordado = parseFloat(agreedAmount);
  const precio = Number.isFinite(acordado) && acordado > 0 ? acordado : precioCalculado;
  const anticipo20 = Math.round(precio * 0.2 * 100) / 100;
  const saldo80 = Math.round((precio - anticipo20) * 100) / 100;

  const folioFinal =
    String(folio || editingQuote?.quote_number || '').trim() || generateQuoteFolio();

  return {
    folio: folioFinal,
    fechaCotizacion: formatDateOnly(new Date().toISOString().slice(0, 10)),
    clientName: clientName || 'Por definir',
    origin: trip?.origin?.trim() || '—',
    destination: trip?.destination?.trim() || '—',
    fechasServicio: formatFechasServicio(trip),
    unitType: selectedQuote?.vehicleType || '',
    capacity: selectedQuote?.capacity ?? '',
    precio,
    anticipo20,
    saldo80,
    vigencia: addDaysToToday(15)
  };
}

export function generateQuotePdf(info) {
  const doc = new jsPDF('p', 'pt', 'letter');
  CotizacionPDF.Cotizacion(doc, info);
  const safeName = String(info.folio || 'cotizacion').replace(/[^\w.-]+/g, '_');
  doc.save(`${safeName}.pdf`);
}
