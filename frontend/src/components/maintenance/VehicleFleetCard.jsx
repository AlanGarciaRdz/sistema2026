import React, { useState, useEffect } from 'react';
import ServiceStatusBar from './ServiceStatusBar';
import Button from '../Button';
import { STATUS_STYLES, STATUS_LABELS, formatKm } from '../../utils/maintenanceStatus';

const VehicleFleetCard = ({
  vehicle,
  onSaveMileage,
  onAddServiceItem,
  onEditServiceItem,
  onRegisterMaintenance,
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

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ring-1 ${fleetStyle.ring}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500">
            {vehicle.license_plate && <span className="mr-2">{vehicle.license_plate}</span>}
            {vehicle.brand} {vehicle.model}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${fleetStyle.badge}`}>
          {STATUS_LABELS[vehicle.fleet_status]}
        </span>
      </div>

      {vehicle.mileage_stale && (
        <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          El km guardado en la unidad ({formatKm(vehicle.current_mileage)}) está atrás. Las alertas
          usan <strong>{formatKm(vehicle.effective_mileage)}</strong> km (del último servicio
          registrado). Pulsa <strong>Guardar km</strong> con el odómetro de hoy.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
        <div className="min-w-[120px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Km actual (odómetro)
          </label>
          <input
            type="number"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ej. 256759"
            value={kmInput}
            onChange={(e) => setKmInput(e.target.value)}
          />
        </div>
        <div className="min-w-[130px]">
          <label className="mb-1 block text-xs font-medium text-gray-600">Fecha de lectura</label>
          <input
            type="date"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={kmDate}
            onChange={(e) => setKmDate(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={handleSaveKm} disabled={savingMileage}>
          Guardar km
        </Button>
        <p className="w-full text-[11px] text-gray-500">
          Cada guardado con km o fecha distinta queda en la pestaña <strong>Historial</strong> como
          &quot;Lectura odómetro&quot; (ej. km del 1 de junio).
        </p>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="secondary" className="text-xs" onClick={() => onAddServiceItem(vehicle)}>
          + Servicio programado
        </Button>
        <Button variant="primary" className="text-xs" onClick={() => onRegisterMaintenance(vehicle)}>
          Registrar servicio
        </Button>
      </div>

      <div className="space-y-2">
        {vehicle.service_items?.length ? (
          vehicle.service_items.map((item) => (
            <div key={item.id} className="group relative">
              <ServiceStatusBar item={item} />
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100"
                onClick={() => onEditServiceItem(vehicle, item)}
              >
                Editar
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
            Sin servicios programados. Agrega cambio de aceite, frenos u otro servicio.
          </p>
        )}
      </div>

      {vehicle.recent_maintenance?.length > 0 && (
        <details className="mt-3 border-t pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Últimos servicios ({vehicle.recent_maintenance.length})
          </summary>
          <ul className="mt-2 space-y-2 text-xs text-gray-600">
            {vehicle.recent_maintenance.map((m) => (
              <li key={m.id} className="rounded bg-gray-50 p-2">
                <span className="font-medium text-gray-800">
                  {m.maintenance_date
                    ? new Date(m.maintenance_date).toLocaleDateString('es-MX')
                    : '—'}
                </span>
                {m.mileage != null && ` · ${formatKm(m.mileage)} km`}
                {m.maintenance_type && ` · ${m.maintenance_type}`}
                {m.notes && <p className="mt-1 whitespace-pre-wrap text-gray-500">{m.notes}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default VehicleFleetCard;
