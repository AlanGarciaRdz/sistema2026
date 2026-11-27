import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getVehicleInspectionPortalContext,
  createVehicleInspectionPortal,
  updateVehicleInspectionPortal,
  completeVehicleInspectionPortal
} from '../services/api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import {
  buildWizardSteps,
  emptyAnswersForSteps,
  INSPECTION_TYPE_LABELS,
  TIRE_ISSUE_OPTIONS,
  TIRE_DEPTH_WARN_MM,
  TIRE_DEPTH_CRITICAL_MM,
  localInspectionStorageKey
} from '../utils/vehicleInspectionConfig';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

const WIZARD_STEPS = buildWizardSteps();
const CONTENT_STEPS = WIZARD_STEPS.filter((s) => s.type !== 'start' && s.type !== 'summary');

function formatNow() {
  return new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function tireDepthHint(depthMm) {
  const n = parseFloat(String(depthMm).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (n < TIRE_DEPTH_CRITICAL_MM) {
    return { level: 'critical', text: 'La profundidad registrada es muy baja.' };
  }
  if (n < TIRE_DEPTH_WARN_MM) {
    return { level: 'warn', text: 'La profundidad registrada parece baja.' };
  }
  return null;
}

function ProgressBar({ stepIndex, total }) {
  const pct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>Inspección</span>
        <span>
          {Math.min(stepIndex + 1, total)} de {total} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BigChoice({ ok, onOk, onIssue }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOk}
        className={`min-h-[52px] rounded-xl border-2 px-4 py-3 text-base font-semibold ${
          ok === true ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white'
        }`}
      >
        ✓ Bien
      </button>
      <button
        type="button"
        onClick={onIssue}
        className={`min-h-[52px] rounded-xl border-2 px-4 py-3 text-base font-semibold ${
          ok === false ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-gray-200 bg-white'
        }`}
      >
        ⚠ Tiene problema
      </button>
    </div>
  );
}

function PassFailRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`min-h-[40px] min-w-[44px] rounded-lg px-3 text-sm font-bold ${
            value === true ? 'bg-emerald-600 text-white' : 'bg-white ring-1 ring-gray-200'
          }`}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`min-h-[40px] min-w-[44px] rounded-lg px-3 text-sm font-bold ${
            value === false ? 'bg-red-600 text-white' : 'bg-white ring-1 ring-gray-200'
          }`}
        >
          ✗
        </button>
      </div>
    </div>
  );
}

const VehicleInspectionWizard = () => {
  const { vehicleKey, inspectionId: inspectionIdParam } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [inspectionId, setInspectionId] = useState(inspectionIdParam ? parseInt(inspectionIdParam, 10) : null);
  const [driverName, setDriverName] = useState('');
  const [inspectionType, setInspectionType] = useState('pre_trip');
  const [mileage, setMileage] = useState('');
  const [answers, setAnswers] = useState(() => emptyAnswersForSteps(WIZARD_STEPS));
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState(null);

  const currentStep = WIZARD_STEPS[stepIndex];
  const progressIndex = Math.max(0, CONTENT_STEPS.findIndex((s) => s.id === currentStep?.id));

  const unitLabel = useMemo(() => {
    if (!vehicle) return '';
    return (
      vehicle.vehicle_code ||
      [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
      vehicle.license_plate ||
      `Unidad #${vehicle.id}`
    );
  }, [vehicle]);

  const persistLocal = useCallback(
    (payload) => {
      if (!vehicle?.id || !inspectionId) return;
      try {
        localStorage.setItem(
          localInspectionStorageKey(vehicle.id, inspectionId),
          JSON.stringify({ stepIndex, answers, driverName, inspectionType, mileage, ...payload })
        );
      } catch {
        /* ignore quota */
      }
    },
    [vehicle?.id, inspectionId, stepIndex, answers, driverName, inspectionType, mileage]
  );

  const saveToServer = useCallback(
    async (nextStepIndex, nextAnswers, extra = {}) => {
      if (!inspectionId) return;
      setSaving(true);
      try {
        await updateVehicleInspectionPortal(vehicleKey, inspectionId, {
          driver_name: driverName,
          inspection_type: inspectionType,
          mileage: mileage || null,
          current_step_index: nextStepIndex,
          payload: { version: 1, answers: nextAnswers, ...extra }
        });
        persistLocal({ stepIndex: nextStepIndex, answers: nextAnswers });
      } catch (err) {
        setToast({
          message: err?.response?.data?.error || 'Sin conexión — se guardó en el teléfono',
          type: 'error'
        });
        persistLocal({ stepIndex: nextStepIndex, answers: nextAnswers });
      } finally {
        setSaving(false);
      }
    },
    [inspectionId, vehicleKey, driverName, inspectionType, mileage, persistLocal]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await getVehicleInspectionPortalContext(vehicleKey);
        const data = res.data.data;
        setVehicle(data.vehicle);
        if (data.vehicle?.current_mileage != null) {
          setMileage(String(data.vehicle.current_mileage));
        }

        const open = data.inProgressInspection;
        if (open && (!inspectionIdParam || parseInt(inspectionIdParam, 10) === open.id)) {
          setInspectionId(open.id);
          setDriverName(open.driver_name || '');
          setInspectionType(open.inspection_type || 'pre_trip');
          if (open.mileage != null) setMileage(String(open.mileage));
          const pl = open.payload?.answers ? open.payload : { answers: emptyAnswersForSteps(WIZARD_STEPS) };
          setAnswers({ ...emptyAnswersForSteps(WIZARD_STEPS), ...(pl.answers || {}) });
          const idx = Math.min(
            WIZARD_STEPS.length - 1,
            Math.max(0, open.current_step_index || 0)
          );
          setStepIndex(idx);
        }
      } catch {
        setToast({ message: 'No se pudo cargar la unidad', type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleKey, inspectionIdParam]);

  const startInspection = async () => {
    try {
      setSaving(true);
      const res = await createVehicleInspectionPortal(vehicleKey, {
        driver_name: driverName,
        inspection_type: inspectionType,
        mileage: mileage || null,
        current_step_index: 1,
        payload: { version: 1, answers }
      });
      const row = res.data.data;
      setInspectionId(row.id);
      navigate(`/u/${encodeURIComponent(vehicleKey)}/inspeccion/${row.id}`, { replace: true });
      setStepIndex(1);
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Error al iniciar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    const next = Math.min(stepIndex + 1, WIZARD_STEPS.length - 1);
    if (currentStep?.type === 'summary') return;
    await saveToServer(next, answers);
    setStepIndex(next);
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const finishInspection = async () => {
    if (!inspectionId) return;
    try {
      setSaving(true);
      const res = await completeVehicleInspectionPortal(vehicleKey, inspectionId, {
        payload: { version: 1, answers },
        current_step_index: stepIndex
      });
      setSummary(res.data.summary || res.data.data?.summary);
      setCompleted(true);
      if (vehicle?.id) {
        localStorage.removeItem(localInspectionStorageKey(vehicle.id, inspectionId));
      }
    } catch (err) {
      setToast({ message: err?.response?.data?.error || 'Error al finalizar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateAnswer = (key, patch) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch }
    }));
  };

  const addPhoto = async (key, file) => {
    if (!file) return;
    if (file.size > 2_500_000) {
      setToast({ message: 'Foto muy grande (máx ~2.5 MB)', type: 'error' });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAnswers((prev) => {
        const cur = prev[key] || {};
        const photos = [...(cur.photos || []), { at: new Date().toISOString(), dataUrl }].slice(-3);
        return { ...prev, [key]: { ...cur, photos } };
      });
    } catch {
      setToast({ message: 'No se pudo leer la foto', type: 'error' });
    }
  };

  if (loading) return <Loading />;

  if (!vehicle) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center text-gray-600">
        Unidad no encontrada.{' '}
        <Link to={`/u/${encodeURIComponent(vehicleKey)}`} className="text-blue-600">
          Volver
        </Link>
      </div>
    );
  }

  const hub = `/u/${encodeURIComponent(vehicleKey)}`;

  if (completed) {
    const obs = summary?.observations || [];
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-slate-50 p-4 pb-10">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-emerald-200">
          <h1 className="text-xl font-bold text-gray-900">✅ Inspección completada</h1>
          <p className="mt-2 text-sm text-gray-600">{unitLabel}</p>
          {driverName && <p className="text-sm text-gray-600">Chofer: {driverName}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="font-bold text-emerald-800">{summary?.ok ?? '—'}</p>
              <p className="text-xs text-emerald-700">Correctos</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="font-bold text-amber-800">{summary?.warnings ?? '—'}</p>
              <p className="text-xs text-amber-700">Observaciones</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="font-bold text-red-800">{summary?.critical ?? '—'}</p>
              <p className="text-xs text-red-700">Críticos</p>
            </div>
          </div>
          {obs.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {obs.map((o) => (
                <li key={o.key} className="rounded-lg border border-amber-100 bg-amber-50/50 p-2">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-gray-600"> — {o.message}</span>
                </li>
              ))}
            </ul>
          )}
          {(summary?.photoCount ?? 0) > 0 && (
            <p className="mt-3 text-sm text-gray-500">📷 {summary.photoCount} fotografías</p>
          )}
          <Link
            to={hub}
            className="mt-6 block w-full rounded-xl bg-gray-900 py-3 text-center text-sm font-medium text-white"
          >
            Listo
          </Link>
        </div>
      </div>
    );
  }

  const showProgress = currentStep?.type !== 'start' && currentStep?.type !== 'summary';
  const navFooter = (
    <div className="mt-6 flex gap-2">
      {stepIndex > 0 && currentStep?.type !== 'start' && (
        <button
          type="button"
          onClick={goBack}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
      )}
      {currentStep?.type === 'start' ? (
        <button
          type="button"
          disabled={saving}
          onClick={inspectionId ? () => setStepIndex(1) : startInspection}
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white disabled:opacity-60"
        >
          {inspectionId ? 'Continuar inspección' : 'Comenzar inspección'}
        </button>
      ) : currentStep?.type === 'summary' ? (
        <button
          type="button"
          disabled={saving}
          onClick={finishInspection}
          className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-gray-900 text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Finalizar'}
        </button>
      ) : (
        <button
          type="button"
          disabled={saving}
          onClick={goNext}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 text-base font-semibold text-white disabled:opacity-60"
        >
          Siguiente <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 p-4 pb-10">
      <Link to={hub} className="mb-3 inline-block text-sm text-gray-500">
        ← Portal unidad
      </Link>

      {showProgress && <ProgressBar stepIndex={progressIndex} total={CONTENT_STEPS.length} />}

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {currentStep?.type === 'start' && (
          <>
            <p className="text-2xl">🚐</p>
            <h1 className="mt-2 text-xl font-bold text-gray-900">Inspección de unidad</h1>
            <p className="text-lg font-medium text-gray-800">{unitLabel}</p>
            {vehicle.license_plate && <p className="text-sm text-gray-500">Placas: {vehicle.license_plate}</p>}
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Chofer
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Tu nombre"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              Tipo de inspección
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
              >
                {Object.entries(INSPECTION_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-4 text-sm text-gray-500">{formatNow()}</p>
          </>
        )}

        {currentStep?.type === 'unit' && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Datos de unidad</h2>
            <p className="text-sm text-gray-500">{unitLabel}</p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Odómetro (opcional)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Km actual"
              />
            </label>
          </>
        )}

        {currentStep?.type === 'tire' && (() => {
          const a = answers[currentStep.tireId] || {};
          const hint = tireDepthHint(a.depthMm);
          return (
            <>
              <p className="text-2xl">{currentStep.emoji}</p>
              <h2 className="text-lg font-bold text-gray-900">{currentStep.tireLabel}</h2>
              <p className="text-sm text-gray-500">¿En buenas condiciones?</p>
              <div className="mt-4">
                <BigChoice
                  ok={a.status === 'ok' ? true : a.status === 'issue' ? false : null}
                  onOk={() => updateAnswer(currentStep.tireId, { status: 'ok', label: currentStep.tireLabel })}
                  onIssue={() =>
                    updateAnswer(currentStep.tireId, { status: 'issue', label: currentStep.tireLabel })
                  }
                />
              </div>
              <label className="mt-4 block text-sm font-medium text-gray-700">
                Profundidad (opcional)
                <div className="mt-1 flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-lg"
                    value={a.depthMm ?? ''}
                    onChange={(e) =>
                      updateAnswer(currentStep.tireId, { depthMm: e.target.value, label: currentStep.tireLabel })
                    }
                    placeholder="—"
                  />
                  <span className="text-gray-500">mm</span>
                </div>
              </label>
              {hint && (
                <p
                  className={`mt-2 rounded-lg px-3 py-2 text-sm ${
                    hint.level === 'critical' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  ⚠ {hint.text}
                </p>
              )}
              {a.status === 'issue' && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">¿Qué problema?</p>
                  {TIRE_ISSUE_OPTIONS.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(a.issues || []).includes(opt.id)}
                        onChange={(e) => {
                          const set = new Set(a.issues || []);
                          if (e.target.checked) set.add(opt.id);
                          else set.delete(opt.id);
                          updateAnswer(currentStep.tireId, {
                            issues: [...set],
                            label: currentStep.tireLabel
                          });
                        }}
                      />
                      {opt.label}
                    </label>
                  ))}
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Comentario (opcional)"
                    value={a.comment || ''}
                    onChange={(e) =>
                      updateAnswer(currentStep.tireId, { comment: e.target.value, label: currentStep.tireLabel })
                    }
                  />
                </div>
              )}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-blue-600">
                <Camera className="h-4 w-4" />
                Agregar fotografía
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => addPhoto(currentStep.tireId, e.target.files?.[0])}
                />
              </label>
              {(a.photos?.length ?? 0) > 0 && (
                <p className="text-xs text-gray-500">{a.photos.length} foto(s) adjunta(s)</p>
              )}
            </>
          );
        })()}

        {currentStep?.type === 'checklist' && (
          <>
            <p className="text-2xl">{currentStep.emoji}</p>
            <h2 className="text-lg font-bold text-gray-900">{currentStep.title}</h2>
            <div className="mt-4 space-y-2">
              {currentStep.items.map((item) => (
                <PassFailRow
                  key={item.id}
                  label={item.label}
                  value={answers[item.id]?.pass}
                  onChange={(pass) => updateAnswer(item.id, { pass, label: item.label })}
                />
              ))}
            </div>
          </>
        )}

        {currentStep?.type === 'notes' && (
          <>
            <p className="text-2xl">{currentStep.emoji}</p>
            <h2 className="text-lg font-bold text-gray-900">Observaciones generales</h2>
            <textarea
              className="mt-3 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
              placeholder="Opcional"
              value={answers.notes_general?.text || ''}
              onChange={(e) => updateAnswer('notes_general', { text: e.target.value })}
            />
          </>
        )}

        {currentStep?.type === 'summary' && (
          <>
            <p className="text-2xl">✅</p>
            <h2 className="text-lg font-bold text-gray-900">Resumen</h2>
            <p className="text-sm text-gray-600">{unitLabel}</p>
            {driverName && <p className="text-sm text-gray-600">Chofer: {driverName}</p>}
            <p className="mt-3 text-sm text-gray-500">
              Revisa y pulsa Finalizar para enviar. Puedes volver atrás si falta algo.
            </p>
          </>
        )}

        {navFooter}
        {saving && <p className="mt-2 text-center text-xs text-gray-400">Guardando…</p>}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default VehicleInspectionWizard;
