import React, { useState, useEffect } from 'react';
import ServiceStatusBar from './ServiceStatusBar';
import Button from '../Button';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  formatKm,
  sortServiceItemsByPriority,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS
} from '../../utils/maintenanceStatus';

const severityBadge = (severity) => {
  if (severity === 'high') return 'bg-red-100 text-red-800';
  if (severity === 'low') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-900';
};

const statusBadge = (status) => {
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-800';
  if (status === 'in_review') return 'bg-blue-100 text-blue-800';
  return 'bg-orange-100 text-orange-800';
};

const daysSinceDate = (value) => {
  if (!value) return null;
  const dateOnly = String(value).slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const readingDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((today - readingDay) / 86400000));
};

const VehicleFleetCard = ({
  vehicle,
  onSaveMileage,
  onAddServiceItem,
  onEditServiceItem,
  onRegisterMaintenance,
  onAddIncidentReport,
  onEditIncidentReport,
  onCopyReportLink,
  savingMileage
}) => {
  const [kmInput, setKmInput] = useState(
    vehicle.current_mileage != null ? String(vehicle.current_mileage) : ''
  );
  const [kmDate, setKmDate] = useState(
    vehicle.current_mileage_at
      ? String(vehicle.current_mileage_at).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    setKmInput(vehicle.current_mileage != null ? String(vehicle.current_mileage) : '');
    setKmDate(
      vehicle.current_mileage_at
        ? String(vehicle.current_mileage_at).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
  }, [vehicle.id, vehicle.current_mileage, vehicle.current_mileage_at]);

  const fleetStyle = STATUS_STYLES[vehicle.fleet_status] || STATUS_STYLES.unknown;
  const label =
    vehicle.vehicle_code ||
    [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
    vehicle.license_plate ||
    `Unidad #${vehicle.id}`;

  const handleSaveKm = () => {
    const km = kmInput.trim() === '' ? null : parseInt(kmInput, 10);
    if (km != null && (!Number.isFinite(km) || km < 0)) return;
    onSaveMileage(vehicle.id, km, kmDate);
  };

  const recentMaintenance = vehicle.recent_maintenance || [];
  const recentReports = vehicle.recent_incident_reports || [];
  const daysWithoutMileageUpdate = daysSinceDate(vehicle.current_mileage_at);
  const showIncidents = Boolean(onAddIncidentReport);
  const hasHistory =
    recentMaintenance.length > 0 || (showIncidents && recentReports.length > 0);
  const sortedItems = sortServiceItemsByPriority(vehicle.service_items || []);

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ring-1 ${fleetStyle.ring}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 shrink-0 lg:w-56">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${fleetStyle.badge}`}>
              {STATUS_LABELS[vehicle.fleet_status]}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {vehicle.license_plate && <span className="mr-2">{vehicle.license_plate}</span>}
            {vehicle.brand} {vehicle.model}
          </p>
          {vehicle.effective_mileage != null && (
            <p className="mt-1 text-xs text-gray-500">
              Odómetro efectivo: <strong>{formatKm(vehicle.effective_mileage)}</strong> km
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {vehicle.mileage_stale && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              El km guardado ({formatKm(vehicle.current_mileage)}) está atrás. Las alertas usan{' '}
              <strong>{formatKm(vehicle.effective_mileage)}</strong> km. Guarda el odómetro de hoy.
            </p>
          )}
          {daysWithoutMileageUpdate > 5 && (
            <p className="rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
              {daysWithoutMileageUpdate} días sin actualizar el odómetro.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2.5">
            <div className="min-w-[110px] flex-1 sm:max-w-[160px]">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Km actual</label>
              <input
                type="number"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                placeholder="Ej. 256759"
                value={kmInput}
                onChange={(e) => setKmInput(e.target.value)}
              />
            </div>
            <div className="min-w-[130px]">
              <label className="mb-1 block text-[11px] font-medium text-gray-600">Fecha lectura</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                value={kmDate}
                onChange={(e) => setKmDate(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={handleSaveKm} disabled={savingMileage}>
              Guardar km
            </Button>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => onAddServiceItem(vehicle)}
              >
                + Servicio
              </Button>
              <Button
                variant="primary"
                className="text-xs"
                onClick={() => onRegisterMaintenance(vehicle)}
              >
                Registrar
              </Button>
              {showIncidents && (
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => onAddIncidentReport(vehicle)}
                >
                  + Incidente
                </Button>
              )}
              {onCopyReportLink && (
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => onCopyReportLink(vehicle)}
                >
                  Link chofer
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {sortedItems.length ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sortedItems.map((item) => (
              <div key={item.id} className="group relative min-w-0">
                <ServiceStatusBar item={item} compact />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-[11px] text-blue-600 opacity-0 group-hover:opacity-100"
                  onClick={() => onEditServiceItem(vehicle, item)}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-sm text-gray-500">
            Sin servicios programados. Agrega aceite, fumigación u otro servicio.
          </p>
        )}
      </div>

      {hasHistory && (
        <div className="mt-3 flex flex-wrap gap-4 border-t pt-3">
          {recentMaintenance.length > 0 && (
            <details className="min-w-[240px] flex-1">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Últimos servicios ({recentMaintenance.length})
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                {recentMaintenance.map((m) => (
                  <li key={m.id} className="rounded bg-gray-50 px-2 py-1.5">
                    <span className="font-medium text-gray-800">
                      {m.maintenance_date
                        ? new Date(m.maintenance_date).toLocaleDateString('es-MX')
                        : '—'}
                    </span>
                    {m.mileage != null && ` · ${formatKm(m.mileage)} km`}
                    {m.maintenance_type && ` · ${m.maintenance_type}`}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {showIncidents && recentReports.length > 0 && (
            <details className="min-w-[240px] flex-1">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">
                Reportes e incidentes ({recentReports.length})
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                {recentReports.map((r) => (
                  <li
                    key={r.id}
                    className="rounded border border-orange-100 bg-orange-50/50 px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-gray-800">
                        {r.report_date
                          ? new Date(r.report_date).toLocaleDateString('es-MX')
                          : '—'}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${severityBadge(r.severity)}`}
                      >
                        {INCIDENT_SEVERITY_LABELS[r.severity] || r.severity}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}
                      >
                        {INCIDENT_STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-medium text-gray-900">{r.title}</p>
                    {onEditIncidentReport && (
                      <button
                        type="button"
                        className="mt-0.5 text-blue-600 hover:underline"
                        onClick={() => onEditIncidentReport(vehicle, r)}
                      >
                        Editar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleFleetCard;
