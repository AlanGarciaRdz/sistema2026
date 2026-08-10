import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDriverPortal,
  postDriverPortalExpense,
  postDriverPortalExpensesBulk,
  putDriverPortalExpense,
  deleteDriverPortalExpense,
  postDriverPortalPayment
} from '../services/api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { Truck, User, Pencil, Trash2, FileDown, Upload } from 'lucide-react';
import { parseCasetasCsv } from '../utils/parseCasetasCsv';
import { formatDateLocal } from '../utils/formatDateLocal';
import { buildPdfInfoFromRow, generateContractPdf } from '../utils/contractPdfUtils';

const PAYMENT_METHODS = [
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Depósito', label: 'Depósito' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Tarjeta', label: 'Tarjeta' }
];

const EXPENSE_TYPES = [
  { value: 'Viatico', label: 'Viáticos' },
  { value: 'Nómina', label: 'Nómina / Sueldo' },
  { value: 'Casetas', label: 'Casetas' },
  { value: 'Combustible', label: 'Combustible' },
  // { value: 'TAG', label: 'TAG' },
  { value: 'Derecho Piso Aeropuerto', label: 'Derecho piso aeropuerto' },
  { value: 'Estacionamiento', label: 'Estacionamiento' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Otro', label: 'Otro (especificar en notas)' }
];

const parseNotes = (raw) => {
  try {
    const n = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
    return n.extra_notes || '';
  } catch {
    return '';
  }
};

const DriverContractPortal = () => {
  const { contractNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState(null);
  const [toast, setToast] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [expenseType, setExpenseType] = useState('Viatico');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMethod, setExpenseMethod] = useState('Efectivo');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [savingPay, setSavingPay] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [casetasPreview, setCasetasPreview] = useState([]);
  const [casetasImportMethod, setCasetasImportMethod] = useState('Transferencia');
  const [casetasParseErrors, setCasetasParseErrors] = useState([]);
  const [importingCasetas, setImportingCasetas] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getDriverPortal(contractNumber);
      setPortal(res.data.data);
      setNotFound(false);
    } catch (e) {
      if (e.response?.status === 404) setNotFound(true);
      else setToast({ message: 'No se pudo cargar el contrato', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractNumber]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

  const formatDate = formatDateLocal;

  const getCasetaRowKey = (row, index) =>
    row.tag_folio ? String(row.tag_folio) : `${index}-${row.expense_date}-${row.notes}`;

  const selectedCasetas = useMemo(
    () => casetasPreview.filter((row) => row.selected !== false),
    [casetasPreview]
  );

  const selectedCasetasTotal = useMemo(
    () => selectedCasetas.reduce((s, row) => s + row.amount, 0),
    [selectedCasetas]
  );

  const toggleCasetaRow = (key) => {
    setCasetasPreview((prev) =>
      prev.map((row, i) =>
        getCasetaRowKey(row, i) === key ? { ...row, selected: row.selected === false } : row
      )
    );
  };

  const setAllCasetasSelected = (selected) => {
    setCasetasPreview((prev) => prev.map((row) => ({ ...row, selected })));
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setExpenseType('Viatico');
    setExpenseAmount('');
    setExpenseMethod('Efectivo');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseNotes('');
  };

  const startEditExpense = (ex) => {
    if (ex.validation_status !== 'pending') return;
    setEditingExpense(ex);
    setExpenseType(ex.expense_type || 'Viatico');
    setExpenseAmount(String(ex.amount ?? ''));
    setExpenseMethod(ex.driver_payment_method || 'Efectivo');
    setExpenseDate(ex.expense_date ? String(ex.expense_date).slice(0, 10) : new Date().toISOString().split('T')[0]);
    setExpenseNotes(parseNotes(ex.notes));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDeleteExpense = async (ex) => {
    if (ex.validation_status !== 'pending') return;
    const noteText = parseNotes(ex.notes);
    const label = [ex.expense_type, noteText].filter(Boolean).join(' · ');
    if (!window.confirm(`¿Eliminar este gasto?\n${label}\n${formatCurrency(ex.amount)}`)) return;
    try {
      setDeletingExpenseId(ex.id);
      await deleteDriverPortalExpense(contractNumber, ex.id);
      if (editingExpense?.id === ex.id) resetExpenseForm();
      setToast({ message: 'Gasto eliminado', type: 'success' });
      await load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'No se pudo eliminar', type: 'error' });
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const onSubmitExpense = async (e) => {
    e.preventDefault();
    try {
      setSavingExpense(true);
      const payload = {
        expense_type: expenseType,
        amount: parseFloat(expenseAmount),
        payment_method: expenseMethod,
        expense_date: expenseDate,
        notes: expenseNotes || null
      };
      if (editingExpense) {
        await putDriverPortalExpense(contractNumber, editingExpense.id, payload);
        setToast({ message: 'Gasto actualizado', type: 'success' });
        resetExpenseForm();
      } else {
        await postDriverPortalExpense(contractNumber, payload);
        setToast({
          message: 'Gasto enviado. Queda pendiente de validación en oficina.',
          type: 'success'
        });
        setExpenseAmount('');
        setExpenseNotes('');
      }
      await load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Error al guardar', type: 'error' });
    } finally {
      setSavingExpense(false);
    }
  };

  const onSubmitPayment = async (e) => {
    e.preventDefault();
    try {
      setSavingPay(true);
      await postDriverPortalPayment(contractNumber, {
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        payment_date: payDate,
        notes: payNotes || null
      });
      setToast({ message: 'Ingreso registrado', type: 'success' });
      setPayAmount('');
      setPayNotes('');
      await load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Error al guardar', type: 'error' });
    } finally {
      setSavingPay(false);
    }
  };

  const onCasetasCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const { rows, errors } = parseCasetasCsv(text);
      setCasetasPreview(rows.map((row) => ({ ...row, selected: true })));
      setCasetasParseErrors(errors);
      if (!rows.length) {
        setToast({
          message: errors[0] || 'No se encontraron peajes en el CSV',
          type: 'error'
        });
      }
    } catch {
      setToast({ message: 'No se pudo leer el archivo', type: 'error' });
    }
  };

  const onImportCasetasCsv = async () => {
    if (!selectedCasetas.length) {
      setToast({ message: 'Selecciona al menos un peaje', type: 'error' });
      return;
    }
    try {
      setImportingCasetas(true);
      const items = selectedCasetas.map(({ selected: _s, ...row }) => row);
      const res = await postDriverPortalExpensesBulk(contractNumber, {
        payment_method: casetasImportMethod,
        items
      });
      const { created = 0, skipped = 0 } = res.data || {};
      setToast({
        message: `Importados ${created} caseta(s)${skipped ? ` · ${skipped} omitido(s) (duplicados)` : ''}`,
        type: 'success'
      });
      setCasetasPreview([]);
      setCasetasParseErrors([]);
      await load();
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Error al importar', type: 'error' });
    } finally {
      setImportingCasetas(false);
    }
  };

  const handleDownloadContractPdf = async () => {
    const row = portal?.contract;
    if (!row?.contract_number) {
      setToast({ message: 'No hay datos de contrato para el PDF', type: 'error' });
      return;
    }
    try {
      setPdfGenerating(true);
      const info = await buildPdfInfoFromRow(row);
      await generateContractPdf(info);
      setToast({ message: 'Contrato descargado (PDF)', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'No se pudo generar el PDF. Intente de nuevo.', type: 'error' });
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) return <Loading />;
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <p className="text-lg text-gray-700 text-center">No se encontró el contrato.</p>
      </div>
    );
  }

  const c = portal?.contract;
  const assignedDriver = portal?.assignedDriver;
  const assignedDrivers =
    portal?.assignedDrivers?.length > 0
      ? portal.assignedDrivers
      : assignedDriver?.driver_name
        ? [assignedDriver]
        : [];
  const recentExpenses = portal?.recentExpenses || [];
  const recentPayments = portal?.recentPayments || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-blue-700 text-white px-4 py-6 shadow">
        <div className="max-w-lg mx-auto flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Truck className="shrink-0 mt-1" size={28} />
            <div className="min-w-0">
              <p className="text-blue-100 text-sm">Contrato</p>
              <h1 className="text-2xl font-bold break-words">{c?.contract_number}</h1>
              <p className="text-blue-100 mt-1">{c?.client_name || 'Cliente'}</p>
              {assignedDrivers.length > 0 && (
                <div className="text-sm mt-2 font-medium text-white space-y-1">
                  <p className="flex items-center gap-1.5">
                    <User size={16} className="shrink-0 opacity-90" aria-hidden />
                    <span>
                      {assignedDrivers.length === 1 ? 'Chofer' : 'Choferes'}:{' '}
                      {assignedDrivers.map((d) => d.driver_name).join(', ')}
                    </span>
                  </p>
                </div>
              )}
              <p className="text-sm mt-2 opacity-90">
                {c?.origin || '—'} → {c?.destination || '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadContractPdf}
            disabled={pdfGenerating || !c?.contract_number}
            className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 disabled:opacity-50 font-semibold px-4 py-3 min-h-[48px] shadow-sm"
          >
            <FileDown size={20} />
            {pdfGenerating ? 'Generando…' : 'Descargar contrato (PDF)'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 -mt-2 space-y-6">
        <section className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {editingExpense ? 'Corregir gasto' : 'Registrar gasto'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Elige cómo pagaste (efectivo, depósito o transferencia). El gasto queda ligado a este
            contrato; la oficina lo validará y asignará la cuenta.
          </p>
          {editingExpense && (
            <button
              type="button"
              onClick={resetExpenseForm}
              className="mb-3 text-sm text-blue-600 underline"
            >
              Cancelar edición
            </button>
          )}
          <form onSubmit={onSubmitExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de gasto</label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value)}
                className="w-full min-h-[48px] text-base border border-gray-300 rounded-lg px-3 py-2"
              >
                {EXPENSE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[48px] text-lg border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select
                value={expenseMethod}
                onChange={(e) => setExpenseMethod(e.target.value)}
                className="w-full min-h-[48px] text-base border border-gray-300 rounded-lg px-3 py-2"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                rows={2}
                placeholder="Ej. casetas sin TAG…"
                className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={savingExpense}
              className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
            >
              {savingExpense ? 'Guardando…' : editingExpense ? 'Guardar cambios' : 'Guardar gasto'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow border border-violet-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Upload size={20} className="text-violet-700" />
            Importar casetas (CSV TAG)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Sube el archivo <strong>movimientos_*.csv</strong> exportado de IAVE / EasyTrip. Crea un
            gasto de caseta por cada peaje, igual que si lo capturaras uno por uno.
          </p>
          <label className="flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed border-violet-300 rounded-xl cursor-pointer bg-violet-50/50 hover:bg-violet-50 transition">
            <span className="text-sm font-medium text-violet-800">Elegir archivo CSV</span>
            <span className="text-xs text-violet-600 mt-1">movimientos_IMDM….csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onCasetasCsvSelected}
            />
          </label>

          {casetasParseErrors.length > 0 && (
            <ul className="mt-2 text-xs text-amber-800 list-disc list-inside">
              {casetasParseErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}

          {casetasPreview.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">
                  {selectedCasetas.length} de {casetasPreview.length} seleccionado(s) ·{' '}
                  {formatCurrency(selectedCasetasTotal)}
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAllCasetasSelected(true)}
                    className="text-violet-700 underline"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllCasetasSelected(false)}
                    className="text-gray-600 underline"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <ul className="max-h-52 overflow-y-auto text-xs border border-gray-200 rounded-lg divide-y">
                {casetasPreview.map((row, i) => {
                  const key = getCasetaRowKey(row, i);
                  const checked = row.selected !== false;
                  return (
                    <li key={key}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer min-h-[44px] ${
                          checked ? 'bg-white' : 'bg-gray-50 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCasetaRow(key)}
                          className="rounded border-gray-300 w-4 h-4 shrink-0"
                        />
                        <span className="text-gray-700 flex-1 min-w-0 leading-snug">
                          {formatDate(row.expense_date)} · {row.notes}
                        </span>
                        <span className="font-semibold shrink-0">{formatCurrency(row.amount)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de pago (todos)
                </label>
                <select
                  value={casetasImportMethod}
                  onChange={(e) => setCasetasImportMethod(e.target.value)}
                  className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onImportCasetasCsv}
                disabled={importingCasetas || selectedCasetas.length === 0}
                className="w-full min-h-[48px] bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {importingCasetas
                  ? 'Importando…'
                  : `Registrar ${selectedCasetas.length} caseta(s)`}
              </button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar ingreso</h2>
          <p className="text-sm text-gray-600 mb-4">
            Indica cómo recibiste el dinero: efectivo, depósito o transferencia.
          </p>
          <form onSubmit={onSubmitPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[48px] text-lg border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pago</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full min-h-[48px] text-base border border-gray-300 rounded-lg px-3 py-2"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                rows={2}
                className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={savingPay}
              className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-lg disabled:opacity-50"
            >
              {savingPay ? 'Guardando…' : 'Registrar ingreso'}
            </button>
          </form>
        </section>

        {recentExpenses.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Tus gastos</h3>
            <ul className="space-y-2">
              {recentExpenses.map((ex) => {
                const pending = ex.validation_status === 'pending';
                const rejected = ex.validation_status === 'rejected';
                const noteText = parseNotes(ex.notes);
                return (
                  <li
                    key={ex.id}
                    className={`bg-white rounded-lg border px-3 py-2 text-sm ${
                      pending ? 'border-amber-300' : rejected ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between gap-2 items-start">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{ex.expense_type}</span>
                        <span className="text-gray-500 block text-xs">
                          {ex.driver_payment_method || '—'} · {formatDate(ex.expense_date)}
                        </span>
                        {noteText ? (
                          <span className="text-gray-700 block text-xs mt-1 leading-snug break-words">
                            {noteText}
                          </span>
                        ) : null}
                        {pending && (
                          <span className="text-xs text-amber-700 block mt-0.5">
                            Pendiente de validación
                          </span>
                        )}
                        {rejected && (
                          <span className="text-xs text-red-600 block mt-0.5">Rechazado en oficina</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold">{formatCurrency(ex.amount)}</span>
                        {pending && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditExpense(ex)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Corregir"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteExpense(ex)}
                              disabled={deletingExpenseId === ex.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {recentPayments.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Ingresos registrados</h3>
            <ul className="space-y-2">
              {recentPayments.map((p) => (
                <li
                  key={p.id}
                  className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex justify-between gap-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-green-700">{p.payment_method || 'Ingreso'}</span>
                    <span className="text-gray-500 block text-xs">{formatDate(p.payment_date)}</span>
                  </span>
                  <span className="font-semibold shrink-0">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DriverContractPortal;
