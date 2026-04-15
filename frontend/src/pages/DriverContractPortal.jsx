import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getDriverPortal,
  postDriverPortalExpense,
  putDriverPortalExpense,
  postDriverPortalPayment
} from '../services/api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { Truck, Pencil } from 'lucide-react';
import { formatDateLocal } from '../utils/formatDateLocal';

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
  { value: 'TAG', label: 'TAG' },
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

  if (loading) return <Loading />;
  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <p className="text-lg text-gray-700 text-center">No se encontró el contrato.</p>
      </div>
    );
  }

  const c = portal?.contract;
  const recentExpenses = portal?.recentExpenses || [];
  const recentPayments = portal?.recentPayments || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-blue-700 text-white px-4 py-6 shadow">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <Truck className="shrink-0 mt-1" size={28} />
          <div>
            <p className="text-blue-100 text-sm">Contrato</p>
            <h1 className="text-2xl font-bold">{c?.contract_number}</h1>
            <p className="text-blue-100 mt-1">{c?.client_name || 'Cliente'}</p>
            <p className="text-sm mt-2 opacity-90">
              {c?.origin || '—'} → {c?.destination || '—'}
            </p>
          </div>
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
                return (
                  <li
                    key={ex.id}
                    className={`bg-white rounded-lg border px-3 py-2 text-sm ${
                      pending ? 'border-amber-300' : rejected ? 'border-red-200' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between gap-2 items-start">
                      <div>
                        <span className="font-medium">{ex.expense_type}</span>
                        <span className="text-gray-500 block text-xs">
                          {ex.driver_payment_method || '—'} · {formatDate(ex.expense_date)}
                        </span>
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
                          <button
                            type="button"
                            onClick={() => startEditExpense(ex)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Corregir"
                          >
                            <Pencil size={18} />
                          </button>
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
