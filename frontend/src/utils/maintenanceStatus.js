export const STATUS_LABELS = {
  ok: 'En tiempo',
  warning: 'Próximo',
  critical: 'Urgente',
  overdue: 'Vencido',
  unknown: 'Sin km'
};

export const STATUS_STYLES = {
  ok: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    ring: 'ring-emerald-200'
  },
  warning: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-900',
    ring: 'ring-amber-200'
  },
  critical: {
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-900',
    ring: 'ring-orange-200'
  },
  overdue: {
    bar: 'bg-red-600',
    badge: 'bg-red-100 text-red-800',
    ring: 'ring-red-200'
  },
  unknown: {
    bar: 'bg-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    ring: 'ring-gray-200'
  }
};

export function formatKm(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-MX');
}

/** Barra según intervalo: km recorridos desde último servicio hasta el próximo. */
export function intervalBarPercent(item) {
  if (item.interval_progress_pct != null && Number.isFinite(item.interval_progress_pct)) {
    return item.interval_progress_pct;
  }
  return alertProgress(item.km_remaining, item.warn_before_km, item.critical_before_km);
}

/** Porcentaje de la ventana de alerta consumida (0 = verde, 100 = rojo). */
export function alertProgress(kmRemaining, warnBeforeKm = 5000, criticalBeforeKm = 2000) {
  if (kmRemaining == null || !Number.isFinite(kmRemaining)) return 0;
  if (kmRemaining <= 0) return 100;
  const warn = Number(warnBeforeKm) || 5000;
  const critical = Number(criticalBeforeKm) || 2000;
  if (kmRemaining <= critical) {
    return 85 + (1 - kmRemaining / critical) * 15;
  }
  if (kmRemaining <= warn) {
    return 50 + ((warn - kmRemaining) / (warn - critical || 1)) * 35;
  }
  return Math.max(0, 15 - (kmRemaining / warn) * 15);
}

export const ITEM_KIND_PRESETS = {
  oil: { title: 'Cambio de aceite', interval_km: 10000, warn_before_km: 5000, critical_before_km: 2000 },
  brakes: { title: 'Frenos (balatas/discos)', interval_km: 30000, warn_before_km: 5000, critical_before_km: 2000 },
  tires: { title: 'Llantas', interval_km: 40000, warn_before_km: 5000, critical_before_km: 2000 },
  custom: { title: '', interval_km: null, warn_before_km: 5000, critical_before_km: 2000 }
};
