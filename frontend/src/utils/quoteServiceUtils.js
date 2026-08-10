export function newServiceItem(kind = 'transfer') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label: '',
    from: '',
    to: '',
    days: '',
    amount: ''
  };
}

export function serviceItemDisplayLabel(item) {
  if (!item) return 'Concepto';
  if (String(item.label || '').trim()) return String(item.label).trim();
  if (item.kind === 'transfer') {
    const a = String(item.from || '').trim() || '—';
    const b = String(item.to || '').trim() || '—';
    return `${a} → ${b}`;
  }
  if (item.kind === 'daily') {
    const d = item.days != null && String(item.days).trim() !== '' ? item.days : '?';
    return `Servicio ${d} día(s)`;
  }
  return 'Servicio';
}

export function parseServiceItemAmount(item) {
  const n = parseFloat(String(item?.amount ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumServiceItems(items) {
  return (items || []).reduce((acc, it) => acc + parseServiceItemAmount(it), 0);
}

export function hasValidServiceItems(items) {
  return (items || []).some((it) => parseServiceItemAmount(it) > 0);
}

export function tripSummaryFromConcepts(trip, serviceItems) {
  const transfers = (serviceItems || []).filter((it) => it.kind === 'transfer');
  const origin =
    String(trip?.origin || '').trim() ||
    String(transfers[0]?.from || '').trim() ||
    'Varios puntos';
  const destination =
    String(trip?.destination || '').trim() ||
    String(transfers[transfers.length - 1]?.to || '').trim() ||
    'Varios destinos';
  return { origin, destination };
}
