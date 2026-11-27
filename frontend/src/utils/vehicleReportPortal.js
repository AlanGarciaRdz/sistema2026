/** Clave del portal: ID de unidad (estable y único). */
export function vehicleReportPortalKey(vehicle) {
  if (vehicle?.id == null) return '';
  return String(vehicle.id);
}

export function vehicleReportPortalPath(vehicle) {
  const key = vehicleReportPortalKey(vehicle);
  return `/u/${encodeURIComponent(key)}`;
}

export function vehicleReportPortalUrl(vehicle) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/sistema${vehicleReportPortalPath(vehicle)}`;
}

export function vehicleInspectionPortalPath(vehicle) {
  const key = vehicleReportPortalKey(vehicle);
  return `/u/${encodeURIComponent(key)}/inspeccion`;
}

export function vehicleUnitPortalUrl(vehicle) {
  return vehicleReportPortalUrl(vehicle);
}

/** Mensaje para WhatsApp con link al portal del chofer. */
export async function copyVehicleReportPortalLink(vehicle, setToast) {
  if (!vehicle?.id) {
    setToast?.({ message: 'La unidad no tiene ID para el link', type: 'error' });
    return false;
  }

  const label =
    vehicle.vehicle_code ||
    vehicle.license_plate ||
    [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
    `Unidad #${vehicle.id}`;

  const hubUrl = vehicleUnitPortalUrl(vehicle);
  const text = [
    'Portal del chofer — incidentes e inspección de unidad:',
    '',
    `Unidad: ${label}`,
    vehicle.license_plate ? `Placas: ${vehicle.license_plate}` : null,
    '',
    hubUrl
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await navigator.clipboard.writeText(text);
    setToast?.({ message: 'Link para chofer copiado al portapapeles', type: 'success' });
    return true;
  } catch {
    setToast?.({ message: 'No se pudo copiar. Copie el link manualmente.', type: 'error' });
    return false;
  }
}
