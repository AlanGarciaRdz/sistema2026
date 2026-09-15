/** Odómetro efectivo: el mayor entre km guardado en unidad, últimos servicios y historial. */
function resolveEffectiveMileage(savedCurrentKm, serviceItems = [], recentMaintenance = []) {
  const candidates = [];
  const saved = parseInt(savedCurrentKm, 10);
  if (Number.isFinite(saved)) candidates.push({ km: saved, source: 'vehicle' });

  for (const row of serviceItems) {
    const last = parseInt(row.last_service_km, 10);
    if (Number.isFinite(last)) candidates.push({ km: last, source: 'last_service' });
  }
  for (const m of recentMaintenance) {
    const mk = parseInt(m.mileage, 10);
    if (Number.isFinite(mk)) candidates.push({ km: mk, source: 'maintenance' });
  }

  if (!candidates.length) {
    return { effectiveKm: null, savedKm: null, mileageStale: false, mileageSource: null };
  }

  const best = candidates.reduce((a, b) => (b.km > a.km ? b : a));
  return {
    effectiveKm: best.km,
    savedKm: Number.isFinite(saved) ? saved : null,
    mileageStale: Number.isFinite(saved) && saved < best.km,
    mileageSource: best.source
  };
}

/** Avance dentro del intervalo (último servicio → próximo). 0% = recién hecho, 100% = toca. */
function computeIntervalProgress(currentKm, lastServiceKm, nextDueKm, intervalKm) {
  const current = parseInt(currentKm, 10);
  const last = parseInt(lastServiceKm, 10);
  const next = parseInt(nextDueKm, 10);
  const interval = parseInt(intervalKm, 10);

  let totalKm = null;
  if (Number.isFinite(last) && Number.isFinite(next) && next > last) totalKm = next - last;
  else if (Number.isFinite(interval) && interval > 0) totalKm = interval;

  if (!Number.isFinite(totalKm) || totalKm <= 0) {
    return { percent: null, consumedKm: null, totalKm };
  }
  if (!Number.isFinite(current) || !Number.isFinite(last)) {
    return { percent: null, consumedKm: null, totalKm };
  }

  const consumedKm = Math.max(0, current - last);
  const percent = Math.min(100, Math.max(0, (consumedKm / totalKm) * 100));
  return { percent, consumedKm, totalKm };
}

/** Estado por km restantes hasta próximo servicio. */
function computeKmServiceStatus(currentKm, nextDueKm, warnBeforeKm = 5000, criticalBeforeKm = 2000) {
  const current = parseInt(currentKm, 10);
  const due = parseInt(nextDueKm, 10);
  if (!Number.isFinite(due)) return { status: 'unknown', kmRemaining: null, percentUsed: null };
  if (!Number.isFinite(current)) {
    return { status: 'unknown', kmRemaining: null, percentUsed: null };
  }
  const remaining = due - current;
  const warn = Number.isFinite(parseInt(warnBeforeKm, 10)) ? parseInt(warnBeforeKm, 10) : 5000;
  const critical = Number.isFinite(parseInt(criticalBeforeKm, 10))
    ? parseInt(criticalBeforeKm, 10)
    : 2000;

  let status = 'ok';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= critical) status = 'critical';
  else if (remaining <= warn) status = 'warning';

  const windowKm = warn + critical || 1;
  const percentUsed = Math.min(100, Math.max(0, ((warn - remaining) / windowKm) * 100));

  return { status, kmRemaining: remaining, percentUsed };
}

function addDays(dateStr, days) {
  const raw = toDateOnly(dateStr);
  const n = parseInt(days, 10);
  if (!raw || !Number.isFinite(n)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function todayLocal(fromDate = new Date()) {
  const yy = fromDate.getFullYear();
  const mm = String(fromDate.getMonth() + 1).padStart(2, '0');
  const dd = String(fromDate.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Normaliza DATE de Postgres (Date) o string a YYYY-MM-DD. */
function toDateOnly(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yy = value.getUTCFullYear();
    const mm = String(value.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(value.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const yy = parsed.getUTCFullYear();
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  return null;
}

function daysUntil(dateStr, fromDate = new Date()) {
  const raw = toDateOnly(dateStr);
  if (!raw) return null;
  const [y, m, d] = raw.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const start =
    fromDate instanceof Date
      ? new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
      : (() => {
          const f = toDateOnly(fromDate);
          if (!f) return null;
          const [fy, fm, fd] = f.split('-').map(Number);
          return new Date(fy, fm - 1, fd);
        })();
  if (!start) return null;
  return Math.round((due - start) / 86400000);
}

function resolveNextDueDate({ last_service_date, interval_days, next_due_date }) {
  const explicit = toDateOnly(next_due_date);
  if (explicit) return explicit;
  const last = toDateOnly(last_service_date);
  const interval = parseInt(interval_days, 10);
  if (last && Number.isFinite(interval) && interval > 0) {
    return addDays(last, interval);
  }
  return null;
}

/** Avance por días (último servicio → próximo). */
function computeDaysIntervalProgress(lastServiceDate, nextDueDate, intervalDays) {
  const interval = parseInt(intervalDays, 10);
  let totalDays = Number.isFinite(interval) && interval > 0 ? interval : null;
  const last = toDateOnly(lastServiceDate);
  const next = toDateOnly(nextDueDate);
  if (!totalDays && last && next) {
    const span = daysUntil(next, last);
    if (Number.isFinite(span) && span > 0) totalDays = span;
  }
  if (!totalDays) return { percent: null, consumedDays: null, totalDays: null };
  if (!last) {
    return { percent: null, consumedDays: null, totalDays };
  }
  const elapsed = daysUntil(todayLocal(), last);
  const consumedDays = Math.max(0, elapsed == null ? 0 : elapsed);
  const percent = Math.min(100, Math.max(0, (consumedDays / totalDays) * 100));
  return { percent, consumedDays, totalDays };
}

/** Estado por días restantes hasta el próximo servicio. */
function computeDaysServiceStatus(nextDueDate, warnBeforeDays = 14, criticalBeforeDays = 7) {
  if (!nextDueDate) return { status: 'unknown', daysRemaining: null };
  const remaining = daysUntil(nextDueDate);
  if (remaining == null) return { status: 'unknown', daysRemaining: null };
  const warn = parseInt(warnBeforeDays, 10);
  const critical = parseInt(criticalBeforeDays, 10);
  const warnN = Number.isFinite(warn) && warn >= 0 ? warn : 14;
  const criticalN = Number.isFinite(critical) && critical >= 0 ? critical : 7;

  let status = 'ok';
  if (remaining <= 0) status = 'overdue';
  else if (remaining <= criticalN) status = 'critical';
  else if (remaining <= warnN) status = 'warning';

  return { status, daysRemaining: remaining };
}

/** Orden: overdue → critical → warning → ok → unknown; dentro del mismo estado, menos km/días restantes primero. */
function sortServiceItemsByPriority(items = []) {
  const statusRank = { overdue: 5, critical: 4, warning: 3, ok: 2, unknown: 1 };
  const remainingOf = (item) => {
    if (item.days_remaining != null && Number.isFinite(Number(item.days_remaining))) {
      return Number(item.days_remaining);
    }
    if (item.km_remaining != null && Number.isFinite(Number(item.km_remaining))) {
      return Number(item.km_remaining);
    }
    return Number.POSITIVE_INFINITY;
  };
  return [...items].sort((a, b) => {
    const ra = statusRank[a.status] || 0;
    const rb = statusRank[b.status] || 0;
    if (rb !== ra) return rb - ra;

    const remA = remainingOf(a);
    const remB = remainingOf(b);
    if (remA !== remB) return remA - remB;

    const pa = Number.isFinite(Number(a.interval_progress_pct))
      ? Number(a.interval_progress_pct)
      : -1;
    const pb = Number.isFinite(Number(b.interval_progress_pct))
      ? Number(b.interval_progress_pct)
      : -1;
    if (pb !== pa) return pb - pa;

    return String(a.title || '').localeCompare(String(b.title || ''), 'es');
  });
}

module.exports = {
  resolveEffectiveMileage,
  computeIntervalProgress,
  computeKmServiceStatus,
  addDays,
  daysUntil,
  todayLocal,
  toDateOnly,
  resolveNextDueDate,
  computeDaysIntervalProgress,
  computeDaysServiceStatus,
  sortServiceItemsByPriority
};
