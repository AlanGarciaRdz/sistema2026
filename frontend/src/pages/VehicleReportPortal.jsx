import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getVehicleReportPortal, postVehicleReportPortal } from '../services/api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { Truck, AlertTriangle } from 'lucide-react';
import {
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
  formatKm
} from '../utils/maintenanceStatus';

const TYPE_OPTIONS = Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label
}));

const SEVERITY_OPTIONS = Object.entries(INCIDENT_SEVERITY_LABELS).map(([value, label]) => ({
  value,
  label
}));

const VehicleReportPortal = () => {
  const { vehicleKey } = useParams();
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportedBy, setReportedBy] = useState('');
  const [reportType, setReportType] = useState('crash');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [mileage, setMileage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await getVehicleReportPortal(vehicleKey);
      setPortal(res.data.data);
      setNotFound(false);
      const v = res.data.data?.vehicle;
      if (v?.current_mileage != null) {
        setMileage(String(v.current_mileage));
      }
    } catch {
      setPortal(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [vehicleKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportedBy.trim() || !title.trim()) {
      setToast({ message: 'Indica tu nombre y un resumen del incidente', type: 'error' });
      return;
    }
    try {
      setSaving(true);
      await postVehicleReportPortal(vehicleKey, {
        report_date: reportDate,
        reported_by: reportedBy.trim(),
        report_type: reportType,
        title: title.trim(),
        description: description.trim() || null,
        severity,
        mileage: mileage ? parseInt(mileage, 10) : null
      });
      setToast({ message: 'Reporte enviado. Gracias.', type: 'success' });
      setTitle('');
      setDescription('');
      setReportType('crash');
      setSeverity('moderate');
      await load();
    } catch (err) {
      setToast({
        message: err?.response?.data?.error || 'No se pudo enviar el reporte',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 p-4 pb-10">
      <header className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-orange-100 p-2 text-orange-700">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Reporte de unidad</h1>
            <p className="text-sm font-medium text-gray-800">{unitLabel}</p>
            {v.license_plate && (
              <p className="text-sm text-gray-500">Placas: {v.license_plate}</p>
            )}
            {v.current_mileage != null && (
              <p className="text-xs text-gray-400 mt-1">
                Km registrado: {formatKm(v.current_mileage)}
              </p>
            )}
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Nuevo reporte
        </h2>

        <label className="block text-xs font-medium text-gray-600">
          Tu nombre <span className="text-red-500">*</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
            placeholder="Nombre del chofer"
            required
          />
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Fecha del incidente <span className="text-red-500">*</span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            required
          />
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Tipo
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Resumen <span className="text-red-500">*</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Golpe en puerta, ruido en frenos..."
            required
          />
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Detalle
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué pasó, dónde, daños..."
          />
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Gravedad
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-gray-600">
          Km del odómetro (opcional)
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="Km actual"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Enviando...' : 'Enviar reporte'}
        </button>
      </form>

      {portal.recentReports?.length > 0 && (
        <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Reportes recientes</h2>
          <ul className="space-y-3 text-sm">
            {portal.recentReports.map((r) => (
              <li key={r.id} className="rounded-lg border border-orange-100 bg-orange-50/40 p-3">
                <p className="font-medium text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.report_date
                    ? new Date(r.report_date).toLocaleDateString('es-MX')
                    : '—'}
                  · {INCIDENT_TYPE_LABELS[r.report_type] || r.report_type}
                  · {INCIDENT_SEVERITY_LABELS[r.severity] || r.severity}
                </p>
                <p className="text-xs text-gray-500">
                  {r.reported_by}
                  {r.mileage != null && ` · ${formatKm(r.mileage)} km`}
                  · {INCIDENT_STATUS_LABELS[r.status] || r.status}
                </p>
                {r.description && (
                  <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{r.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default VehicleReportPortal;
