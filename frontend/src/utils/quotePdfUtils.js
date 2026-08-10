import { jsPDF } from 'jspdf';
import CotizacionPDF from './CotizacionPDF';
import { tripSummaryFromConcepts } from './quoteServiceUtils';

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

function buildOpcionPrecio(quote, precioOverride) {
  const precio =
    precioOverride != null && Number.isFinite(precioOverride) && precioOverride > 0
      ? precioOverride
      : parseFloat(quote?.costs?.total) || 0;
  const anticipo20 = Math.round(precio * 0.2 * 100) / 100;
  const saldo80 = Math.round((precio - anticipo20) * 100) / 100;
  return {
    vehicleType: quote?.vehicleType || '',
    capacity: quote?.capacity ?? '',
    precio,
    anticipo20,
    saldo80
  };
}

function parseAgreedOverrideFromMap(agreedAmounts, quoteKey, legacyAmount) {
  if (agreedAmounts && quoteKey && agreedAmounts[quoteKey] != null) {
    const raw = agreedAmounts[quoteKey];
    if (String(raw).trim() !== '') {
      const n = parseFloat(String(raw).replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  if (legacyAmount != null && String(legacyAmount).trim() !== '') {
    const n = parseFloat(String(legacyAmount).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Arma info para CotizacionPDF desde el estado de QuoteCalculator o cotización guardada.
 */
export function buildQuotePdfInfo({
  clientName,
  trip,
  quotations,
  selectedQuote,
  selectedVehicleIndex,
  agreedAmount,
  agreedAmounts,
  pdfNote,
  folio,
  editingQuote,
  quoteMode,
  serviceItems
}) {
  const folioFinal =
    String(folio || editingQuote?.quote_number || '').trim() || generateQuoteFolio();

  const legacyKey =
    quotations?.[selectedVehicleIndex ?? 0]?.quoteKey ||
    selectedQuote?.quoteKey;

  let opciones = (quotations || [])
    .filter((q) => q && (q.costs?.total != null || q.vehicleType))
    .map((q) => {
      const override = parseAgreedOverrideFromMap(
        agreedAmounts,
        q.quoteKey,
        q.quoteKey === legacyKey ? agreedAmount : null
      );
      return buildOpcionPrecio(q, override);
    });

  if (!opciones.length && selectedQuote) {
    const override = parseAgreedOverrideFromMap(
      agreedAmounts,
      selectedQuote.quoteKey,
      agreedAmount
    );
    opciones = [buildOpcionPrecio(selectedQuote, override)];
  }

  const primary = opciones[0] || buildOpcionPrecio(selectedQuote);

  const mode =
    quoteMode === 'concepts' || quoteMode === 'calculated'
      ? quoteMode
      : selectedQuote?.costs?.conceptsMode || quotations?.some((q) => q?.costs?.conceptsMode)
        ? 'concepts'
        : 'calculated';
  const items = Array.isArray(serviceItems) ? serviceItems : [];
  const summary =
    mode === 'concepts'
      ? tripSummaryFromConcepts(trip, items)
      : {
          origin: trip?.origin?.trim() || '—',
          destination: trip?.destination?.trim() || '—'
        };

  return {
    folio: folioFinal,
    fechaCotizacion: formatDateOnly(new Date().toISOString().slice(0, 10)),
    clientName: clientName || 'Por definir',
    origin: summary.origin || '—',
    destination: summary.destination || '—',
    fechasServicio: formatFechasServicio(trip),
    quoteMode: mode,
    serviceItems: items,
    opciones,
    unitType: opciones.length === 1 ? primary.vehicleType : '',
    capacity: opciones.length === 1 ? primary.capacity : '',
    precio: primary.precio,
    anticipo20: primary.anticipo20,
    saldo80: primary.saldo80,
    pdfNote: String(pdfNote || '').trim(),
    vigencia: addDaysToToday(15)
  };
}

export function generateQuotePdf(info) {
  const doc = new jsPDF('p', 'pt', 'letter');
  CotizacionPDF.Cotizacion(doc, info);
  const safeName = String(info.folio || 'cotizacion').replace(/[^\w.-]+/g, '_');
  doc.save(`${safeName}.pdf`);
}
