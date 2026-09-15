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
  oil: {
    title: 'Cambio de aceite',
    schedule_basis: 'km',
    interval_km: 10000,
    warn_before_km: 5000,
    critical_before_km: 2000
  },
  brakes: {
    title: 'Frenos (balatas/discos)',
    schedule_basis: 'km',
    interval_km: 30000,
    warn_before_km: 5000,
    critical_before_km: 2000
  },
  adblue: {
    title: 'AdBlue (urea)',
    schedule_basis: 'km',
    interval_km: 15000,
    warn_before_km: 3000,
    critical_before_km: 1500
  },
  tires_front: {
    title: 'Llantas delanteras',
    schedule_basis: 'km',
    interval_km: 40000,
    warn_before_km: 5000,
    critical_before_km: 2000
  },
  tires_rear: {
    title: 'Llantas traseras',
    schedule_basis: 'km',
    interval_km: 40000,
    warn_before_km: 5000,
    critical_before_km: 2000
  },
  /** @deprecated usar tires_front / tires_rear */
  tires: {
    title: 'Llantas',
    schedule_basis: 'km',
    interval_km: 40000,
    warn_before_km: 5000,
    critical_before_km: 2000
  },
  fumigation: {
    title: 'Fumigación',
    schedule_basis: 'days',
    interval_days: 60,
    warn_before_days: 14,
    critical_before_days: 7
  },
  custom: {
    title: '',
    schedule_basis: 'km',
    interval_km: null,
    warn_before_km: 5000,
    critical_before_km: 2000
  }
};

export const SERVICE_KIND_OPTIONS = [
  { value: 'oil', label: 'Cambio de aceite' },
  { value: 'brakes', label: 'Frenos' },
  { value: 'adblue', label: 'AdBlue (urea)' },
  { value: 'tires_front', label: 'Llantas delanteras' },
  { value: 'tires_rear', label: 'Llantas traseras' },
  { value: 'fumigation', label: 'Fumigación (por días)' },
  { value: 'custom', label: 'Otro' }
];

export const SCHEDULE_BASIS_OPTIONS = [
  { value: 'km', label: 'Por kilometraje' },
  { value: 'days', label: 'Por tiempo (días)' }
];

export function isDaysService(item) {
  return String(item?.schedule_basis || 'km').toLowerCase() === 'days';
}

export function addDaysLocal(dateStr, days) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).slice(0, 10))) return '';
  const n = parseInt(days, 10);
  if (!Number.isFinite(n)) return '';
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Orden: vencido → rojo → amarillo → verde → sin dato; en el mismo color, menos km/días restantes primero. */
export function sortServiceItemsByPriority(items = []) {
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

export const INCIDENT_TYPE_LABELS = {
  crash: 'Choque / accidente',
  noise: 'Ruido extraño',
  damage: 'Daño físico',
  mechanical: 'Falla mecánica',
  other: 'Otro'
};

export const INCIDENT_SEVERITY_LABELS = {
  low: 'Leve',
  moderate: 'Moderado',
  high: 'Grave'
};

export const INCIDENT_STATUS_LABELS = {
  open: 'Abierto',
  in_review: 'En revisión',
  resolved: 'Resuelto'
};
