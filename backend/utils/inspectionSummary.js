const TIRE_DEPTH_WARN_MM = 3.5;
const TIRE_DEPTH_CRITICAL_MM = 2.0;

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Calcula conteos para resumen a partir de payload.answers (sin bloquear al chofer).
 */
function buildInspectionSummary(payload) {
  const answers = payload?.answers && typeof payload.answers === 'object' ? payload.answers : {};
  let reviewed = 0;
  let ok = 0;
  let warnings = 0;
  let critical = 0;
  let photoCount = 0;
  const observations = [];

  if (answers.notes_general?.text?.trim()) {
    observations.push({
      key: 'notes_general',
      label: 'Observaciones generales',
      level: 'warning',
      message: String(answers.notes_general.text).trim().slice(0, 500)
    });
    warnings += 1;
  }

  for (const [key, val] of Object.entries(answers)) {
    if (key === 'notes_general') continue;
    if (!val || typeof val !== 'object') continue;
    reviewed += 1;

    const photos = Array.isArray(val.photos) ? val.photos : [];
    photoCount += photos.length;

    if (val.pass === true || val.status === 'ok') {
      ok += 1;
      const depth = parseNum(val.depthMm);
      if (depth != null && depth < TIRE_DEPTH_WARN_MM) {
        warnings += 1;
        ok -= 1;
        observations.push({
          key,
          label: val.label || key,
          level: depth < TIRE_DEPTH_CRITICAL_MM ? 'critical' : 'warning',
          message: `Profundidad ${depth} mm`
        });
      }
      continue;
    }

    if (val.pass === false || val.status === 'issue') {
      const level = val.severity === 'critical' ? 'critical' : 'warning';
      if (level === 'critical') critical += 1;
      else warnings += 1;
      observations.push({
        key,
        label: val.label || key,
        level,
        message: val.comment || val.issues?.join(', ') || 'Problema reportado'
      });
      continue;
    }

    if (val.skipped) {
      continue;
    }

    ok += 1;
  }

  return {
    reviewed,
    ok: Math.max(0, ok),
    warnings,
    critical,
    photoCount,
    observations: observations.slice(0, 50)
  };
}

module.exports = {
  buildInspectionSummary,
  TIRE_DEPTH_WARN_MM,
  TIRE_DEPTH_CRITICAL_MM
};
