/**
 * Devuelve true si el texto de búsqueda coincide con un monto (exacto, con tolerancia).
 * Acepta "500", "500.50", "$ 1,234.56", etc.
 */
export function matchesAmountSearch(query, amount) {
  const raw = String(query || '').trim();
  if (!raw) return false;

  const cleaned = raw.replace(/[$\s]/g, '').replace(/\u00a0/g, '');
  const normalized = cleaned.replace(/,/g, '');

  const qNum = parseFloat(normalized);
  if (Number.isNaN(qNum)) return false;

  const a = parseFloat(amount);
  if (Number.isNaN(a)) return false;

  return Math.abs(a - qNum) < 0.005;
}
