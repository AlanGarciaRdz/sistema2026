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

function isDieselFuel(fuelType) {
  return String(fuelType || '')
    .toLowerCase()
    .includes('diesel');
}

module.exports = {
  resolveEffectiveMileage,
  computeIntervalProgress,
  computeKmServiceStatus,
  isDieselFuel
};
