import React from 'react';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  intervalBarPercent,
  formatKm
} from '../../utils/maintenanceStatus';

const ServiceStatusBar = ({ item }) => {
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.unknown;
  const pct = intervalBarPercent(item);

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{item.title}</p>
          {item.next_due_km != null && (
            <p className="text-xs text-gray-500">
              Próximo: {formatKm(item.next_due_km)} km
              {item.interval_km ? ` · cada ${formatKm(item.interval_km)} km` : ''}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
          {STATUS_LABELS[item.status] || item.status}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${style.bar}`}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-600">
        {item.km_remaining != null ? (
          item.km_remaining > 0 ? (
            <>
              Faltan <strong>{formatKm(item.km_remaining)}</strong> km para el próximo servicio
              {item.interval_consumed_km != null && item.interval_total_km != null && (
                <span className="text-gray-400">
                  {' '}
                  · {formatKm(item.interval_consumed_km)} / {formatKm(item.interval_total_km)} km del
                  intervalo
                </span>
              )}
            </>
          ) : (
            <strong className="text-red-700">
              Pasado por {formatKm(Math.abs(item.km_remaining))} km
            </strong>
          )
        ) : (
          'Captura el km actual de la unidad para calcular alertas'
        )}
        {item.last_service_km != null && (
          <span className="text-gray-400">
            {' '}
            · último servicio {formatKm(item.last_service_km)} km
          </span>
        )}
      </p>
      {item.next_due_mismatch && item.expected_next_due_km != null && (
        <p className="mt-1 text-xs text-amber-800">
          El próximo km no coincide con último + intervalo. Debería ser{' '}
          <strong>{formatKm(item.expected_next_due_km)}</strong> km (tienes{' '}
          {formatKm(item.next_due_km)}).
        </p>
      )}
    </div>
  );
};

export default ServiceStatusBar;
