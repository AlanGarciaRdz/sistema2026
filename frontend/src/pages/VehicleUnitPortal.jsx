import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getVehicleReportPortal } from '../services/api';
import Loading from '../components/Loading';
import { Truck, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { formatKm } from '../utils/maintenanceStatus';

const VehicleUnitPortal = () => {
  const { vehicleKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getVehicleReportPortal(vehicleKey);
        setPortal(res.data.data);
        setNotFound(false);
      } catch {
        setPortal(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleKey]);

  if (loading) return <Loading />;

  if (notFound || !portal?.vehicle) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <p className="text-gray-600">Unidad no encontrada. Verifica el link que te compartieron.</p>
      </div>
    );
  }

  const v = portal.vehicle;
  const unitLabel =
    v.vehicle_code ||
    [v.brand, v.model].filter(Boolean).join(' ') ||
    v.license_plate ||
    `Unidad #${v.id}`;

  const base = `/u/${encodeURIComponent(vehicleKey)}`;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 p-4 pb-10">
      <header className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
            <Truck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Portal del chofer</p>
            <h1 className="text-xl font-semibold text-gray-900">{unitLabel}</h1>
            {v.license_plate && <p className="text-sm text-gray-600">Placas: {v.license_plate}</p>}
            {v.current_mileage != null && (
              <p className="mt-1 text-xs text-gray-400">Km registrado: {formatKm(v.current_mileage)}</p>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <Link
          to={`${base}/inspeccion`}
          className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-emerald-200 transition hover:ring-emerald-400"
        >
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Inspección de unidad</p>
            <p className="text-sm text-gray-500">Checklist guiado paso a paso</p>
          </div>
        </Link>

        <Link
          to={`${base}/incidente`}
          className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-orange-200 transition hover:ring-orange-400"
        >
          <div className="rounded-full bg-orange-100 p-3 text-orange-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">Reportar incidente</p>
            <p className="text-sm text-gray-500">Daño, choque, ruido o falla</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default VehicleUnitPortal;
