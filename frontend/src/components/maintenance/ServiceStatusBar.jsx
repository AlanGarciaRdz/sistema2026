import React from 'react';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  intervalBarPercent,
  formatKm,
  isDaysService
} from '../../utils/maintenanceStatus';
import { formatDateLocal } from '../../utils/formatDateLocal';

const ServiceStatusBar = ({ item, compact = false }) => {
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.unknown;
  const pct = intervalBarPercent(item);
  const byDays = isDaysService(item);
  const statusLabel =
    item.status === 'unknown' && byDays ? 'Sin fecha' : STATUS_LABELS[item.status] || item.status;

  const remainingLine = byDays ? (
    item.days_remaining != null ? (
      item.days_remaining > 0 ? (
        <>
          Faltan <strong>{item.days_remaining}</strong> días
          {!compact && item.interval_consumed_days != null && item.interval_total_days != null && (
            <span className="text-gray-400">
              {' '}
              · {item.interval_consumed_days} / {item.interval_total_days} días
            </span>
          )}
        </>
      ) : (
        <strong className="text-red-700">Vencido por {Math.abs(item.days_remaining)} días</strong>
      )
    ) : (
      'Indica la fecha del último servicio'
    )
  ) : item.km_remaining != null ? (
    item.km_remaining > 0 ? (
      <>
        Faltan <strong>{formatKm(item.km_remaining)}</strong> km
        {!compact && item.interval_consumed_km != null && item.interval_total_km != null && (
          <span className="text-gray-400">
            {' '}
            · {formatKm(item.interval_consumed_km)} / {formatKm(item.interval_total_km)} km
          </span>
        )}
      </>
    ) : (
      <strong className="text-red-700">Pasado por {formatKm(Math.abs(item.km_remaining))} km</strong>
    )
  ) : (
    'Captura el km actual de la unidad'
  );

  return (
    <div className={`rounded-lg border border-gray-100 bg-gray-50/80 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0 pr-8">
          <p className={`font-medium text-gray-800 ${compact ? 'text-sm leading-tight' : 'text-sm'}`}>
            {item.title}
          </p>
          {byDays && item.next_due_date && (
            <p className="text-[11px] text-gray-500">
              Próximo: {formatDateLocal(item.next_due_date)}
              {item.interval_days ? ` · cada ${item.interval_days} d` : ''}
            </p>
          )}
          {!byDays && item.next_due_km != null && (
            <p className="text-[11px] text-gray-500">
              Próximo: {formatKm(item.next_due_km)} km
              {item.interval_km ? ` · cada ${formatKm(item.interval_km)}` : ''}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
          {statusLabel}
        </span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-gray-200 ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all ${style.bar}`}
          style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
        />
      </div>
      <p className={`mt-1 text-gray-600 ${compact ? 'text-[11px] leading-snug' : 'text-xs'}`}>
        {remainingLine}
        {!byDays && item.last_service_km != null && (
          <span className="text-gray-400"> · último {formatKm(item.last_service_km)} km</span>
        )}
        {byDays && item.last_service_date && (
          <span className="text-gray-400"> · último {formatDateLocal(item.last_service_date)}</span>
        )}
      </p>
      {!byDays && item.next_due_mismatch && item.expected_next_due_km != null && (
        <p className="mt-1 text-[11px] text-amber-800">
          Debería ser <strong>{formatKm(item.expected_next_due_km)}</strong> km
        </p>
      )}
    </div>
  );
};

export default ServiceStatusBar;
