/**
 * Formatea una fecha para mostrar en es-MX sin desfase por zona horaria cuando el valor
 * es solo día (PostgreSQL DATE o ISO que empieza en YYYY-MM-DD).
 * `new Date("2026-03-28")` se interpreta como UTC y en México puede verse como 27/03.
 */

/** Primer y último día del mes local del dispositivo (YYYY-MM-DD). Misma base que Egresos/Ingresos. */
export function getCalendarMonthRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end };
}

/** Día 1 del mes local hasta hoy (YYYY-MM-DD). Para métricas MTD del dashboard. */
export function getMonthToDateRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(d.getDate())}`;
  return { start, end };
}
/**
 * Fecha calendario local como YYYY-MM-DD (para filtros y comparaciones).
 * Evita usar solo el prefijo ISO del string: en UTC puede ser otro día que en local.
 */
export function toYmdLocal(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  // Solo fecha (p. ej. DATE de PostgreSQL): usar tal cual, sin interpretar como UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) return '';
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateLocal(value) {
  if (value == null || value === '') return '-';
  const s = String(value).trim();
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) {
    const [y, m, d] = ymd[1].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX');
  }
  const t = new Date(s);
  if (!Number.isNaN(t.getTime())) return t.toLocaleDateString('es-MX');
  return '-';
}

/**
 * Días inclusivos entre dos fechas solo-día (misma lógica que antes en Contratos, sin UTC).
 */
export function diffInclusiveCalendarDays(startValue, endValue) {
  const s1 = startValue ? String(startValue).slice(0, 10) : '';
  const s2 = endValue ? String(endValue).slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s1) || !/^\d{4}-\d{2}-\d{2}$/.test(s2)) return 0;
  const [y1, m1, d1] = s1.split('-').map(Number);
  const [y2, m2, d2] = s2.split('-').map(Number);
  const start = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1);
}
