import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  validateExpense,
  getContracts,
  getPaymentAccounts
} from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { matchesAmountSearch } from '../utils/matchesAmountSearch';

/** Primer y último día del mes local (YYYY-MM-DD). */
const getCalendarMonthRange = (d = new Date()) => {
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${lastDay}`;
  return { start, end };
};

const EXPENSE_TYPES = [
  { value: 'Agua', label: 'Agua' },
  { value: 'Arrendamiento', label: 'Arrendamiento' },
  { value: 'AWS', label: 'AWS' },
  { value: 'Casetas', label: 'Casetas' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Comisiones', label: 'Comisiones' },
  { value: 'Contadores', label: 'Contadores' },
  { value: 'Credito', label: 'Credito' },
  { value: 'Gas', label: 'Gas' },
  { value: 'Google', label: 'Google' },
  { value: 'Impuestos', label: 'Impuestos' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Luz', label: 'Luz' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Nómina', label: 'Nómina' },
  { value: 'Otro', label: 'Otro' },
  { value: 'Pago proveedor externo', label: 'Pago proveedor externo' },
  { value: 'Estacionamiento', label: 'Estacionamiento' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Derecho Piso Aeropuerto', label: 'Derecho piso aeropuerto' },
  { value: 'Renta', label: 'Renta' },
  { value: 'Seguros', label: 'Seguros' },
  { value: 'Software', label: 'Software' },
  { value: 'Teléfono', label: 'Teléfono' },
  { value: 'Viatico', label: 'Viatico' }
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [toast, setToast] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [{ start: dateFrom, end: dateTo }, setDateRange] = useState(() => getCalendarMonthRange());
  const expensesFetchSeq = useRef(0);
  /** Lista de gastos a validar en el modal (uno o varios); null = cerrado */
  const [validateTargets, setValidateTargets] = useState(null);
  const [validateAccountId, setValidateAccountId] = useState('');
  const [validatingBulk, setValidatingBulk] = useState(false);
  /** IDs marcados en la vista pendiente (chkbox) */
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [formData, setFormData] = useState({
    contract_id: '',
    expense_type: '',
    expense_type_other: '',
    amount: '',
    payment_account_id: '',
    business_unit: '',
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchContracts();
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [viewMode, dateFrom, dateTo]);

  useEffect(() => {
    if (viewMode !== 'pending') setSelectedPendingIds([]);
  }, [viewMode]);

  useEffect(() => {
    const ids = new Set(expenses.map((e) => e.id));
    setSelectedPendingIds((prev) => prev.filter((id) => ids.has(id)));
  }, [expenses]);

  const fetchExpenses = async () => {
    const seq = ++expensesFetchSeq.current;
    try {
      setLoading(true);
      const DATE = /^\d{4}-\d{2}-\d{2}$/;
      const hasRange = DATE.test(dateFrom) && DATE.test(dateTo);
      let a = dateFrom;
      let b = dateTo;
      if (hasRange && a > b) {
        const t = a;
        a = b;
        b = t;
      }
      let params;
      if (viewMode === 'pending') {
        params = { validation_status: 'pending' };
        if (hasRange) {
          params.start = a;
          params.end = b;
          params.limit = 5000;
        } else {
          params.limit = 500;
        }
      } else if (hasRange) {
        params = { start: a, end: b, limit: 5000 };
      } else {
        params = { limit: 20 };
      }
      const response = await getExpenses(params);
      if (seq !== expensesFetchSeq.current) return;
      setExpenses(response.data.data || []);
    } catch (error) {
      if (seq !== expensesFetchSeq.current) return;
      setToast({ message: 'Error al cargar gastos', type: 'error' });
    } finally {
      if (seq === expensesFetchSeq.current) setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await getContracts();
      setContracts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await getPaymentAccounts();
      setAccounts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expenseType = formData.expense_type === 'Otro'
        ? formData.expense_type_other
        : formData.expense_type;

      const payload = {
        contract_id: formData.contract_id || null,
        expense_type: expenseType || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        payment_account_id: formData.payment_account_id || null,
        business_unit: formData.business_unit || null,
        expense_date: formData.expense_date,
        notes: formData.notes || null
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        setToast({ message: 'Gasto actualizado exitosamente', type: 'success' });
      } else {
        await createExpense(payload);
        setToast({ message: 'Gasto registrado exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      setToast({ message: 'Error al guardar gasto', type: 'error' });
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    const isOther = expense.expense_type && !EXPENSE_TYPES.find(t => t.value === expense.expense_type);
    setFormData({
      contract_id: expense.contract_id || '',
      expense_type: isOther ? 'Otro' : (expense.expense_type || ''),
      expense_type_other: isOther ? expense.expense_type : '',
      amount: expense.amount ?? '',
      payment_account_id: expense.payment_account_id || '',
      business_unit: expense.business_unit || '',
      expense_date: expense.expense_date ? String(expense.expense_date).slice(0, 10) : '',
      notes: expense.notes || ''
    });
    setIsModalOpen(true);
  };

  const openValidateModal = (expense) => {
    setValidateTargets([expense]);
    setValidateAccountId('');
  };

  const openBulkValidateModal = () => {
    const rows = filteredExpenses.filter((e) => selectedPendingIds.includes(e.id));
    if (rows.length === 0) {
      setToast({ message: 'Marque al menos un gasto en la tabla', type: 'error' });
      return;
    }
    setValidateTargets(rows);
    setValidateAccountId('');
  };

  const toggleSelectPending = (id) => {
    setSelectedPendingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisiblePending = () => {
    setSelectedPendingIds(filteredExpenses.map((r) => r.id));
  };

  const clearPendingSelection = () => setSelectedPendingIds([]);

  const handleValidateApprove = async (e) => {
    e.preventDefault();
    if (!validateTargets?.length) return;
    if (!validateAccountId) {
      setToast({ message: 'Seleccione la cuenta contable', type: 'error' });
      return;
    }
    const accountId = parseInt(validateAccountId, 10);
    if (Number.isNaN(accountId)) {
      setToast({ message: 'Cuenta no válida', type: 'error' });
      return;
    }

    try {
      setValidatingBulk(true);
      const validatedIds = validateTargets.map((t) => t.id);
      const results = await Promise.allSettled(
        validateTargets.map((exp) =>
          validateExpense(exp.id, { action: 'approve', payment_account_id: accountId })
        )
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      if (fail === 0) {
        setToast({
          message:
            validateTargets.length === 1 ? 'Gasto validado' : `${ok} gastos validados`,
          type: 'success'
        });
      } else {
        setToast({
          message: `Validados: ${ok}. Con error: ${fail}. Revise e intente de nuevo.`,
          type: ok > 0 ? 'warning' : 'error'
        });
      }
      setValidateTargets(null);
      const idSet = new Set(validatedIds);
      setSelectedPendingIds((prev) => prev.filter((id) => !idSet.has(id)));
      fetchExpenses();
    } catch (error) {
      setToast({ message: error.response?.data?.error || 'Error al validar', type: 'error' });
    } finally {
      setValidatingBulk(false);
    }
  };

  const handleRejectRow = async (row) => {
    if (!window.confirm('¿Rechazar este gasto del chofer?')) return;
    try {
      await validateExpense(row.id, { action: 'reject' });
      setToast({ message: 'Gasto rechazado', type: 'success' });
      fetchExpenses();
    } catch (error) {
      setToast({ message: error.response?.data?.error || 'Error', type: 'error' });
    }
  };

  const handleDelete = async (expense) => {
    const msg =
      expense.expense_type === 'Transferencia entre cuentas'
        ? '¿Eliminar este traspaso? También se eliminará el ingreso vinculado en la cuenta destino.'
        : '¿Está seguro de eliminar este gasto?';
    if (window.confirm(msg)) {
      try {
        await deleteExpense(expense.id);
        setToast({ message: 'Gasto eliminado exitosamente', type: 'success' });
        fetchExpenses();
      } catch (error) {
        setToast({ message: 'Error al eliminar gasto', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setContractSearch('');
    setFormData({
      contract_id: '',
      expense_type: '',
      expense_type_other: '',
      amount: '',
      payment_account_id: '',
      business_unit: '',
      expense_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingExpense(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const getExpenseSource = (row) => {
    if (row.contract_number) return { type: 'contract', label: `Contrato ${row.contract_number}` };
    try {
      const notes = JSON.parse(row.notes || '{}');
      if (notes.maintenance_id != null && notes.vehicle_label) {
        return { type: 'maintenance', label: `Unidad: ${notes.vehicle_label}` };
      }
    } catch {}
    return { type: 'company', label: 'Empresa' };
  };

  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: `${c.contract_number || ''} - ${c.client_name || 'Sin cliente'}`
  }));

  const filteredContractOptions = useMemo(() => {
    if (!contractSearch.trim()) return contractOptions;
    const q = contractSearch.toLowerCase().trim();
    return contractOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || String(opt.value).includes(q)
    );
  }, [contractOptions, contractSearch]);

  const filteredExpenses = useMemo(() => {
    if (!tableSearch.trim()) return expenses;
    const q = tableSearch.toLowerCase().trim();
    return expenses.filter((row) => {
      if (matchesAmountSearch(tableSearch.trim(), row.amount)) return true;
      const source = getExpenseSource(row);
      if (source.type === 'contract') {
        const contract = contracts.find((c) => c.id === row.contract_id);
        const contractNum = row.contract_number || contract?.contract_number || '';
        const clientName = (row.client_name || contract?.client_name || '').toLowerCase();
        const origin = (row.contract_origin || '').toLowerCase();
        const dest = (row.contract_destination || '').toLowerCase();
        return (
          contractNum.toLowerCase().includes(q) ||
          clientName.includes(q) ||
          origin.includes(q) ||
          dest.includes(q)
        );
      }
      return source.label.toLowerCase().includes(q);
    });
  }, [expenses, tableSearch, contracts]);

  const expensesTableTotal = useMemo(
    () => filteredExpenses.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0),
    [filteredExpenses]
  );

  const groupedExpenseSections = useMemo(() => {
    const list = filteredExpenses;
    const byContract = new Map();
    const otros = [];
    for (const row of list) {
      if (row.contract_id) {
        if (!byContract.has(row.contract_id)) byContract.set(row.contract_id, []);
        byContract.get(row.contract_id).push(row);
      } else {
        otros.push(row);
      }
    }
    const sortByDateDesc = (rows) =>
      [...rows].sort((a, b) => {
        const da = new Date(a.expense_date || 0).getTime();
        const db = new Date(b.expense_date || 0).getTime();
        return db - da;
      });
    const contractIds = [...byContract.keys()].sort((a, b) => {
      const na = byContract.get(a)[0]?.contract_number || '';
      const nb = byContract.get(b)[0]?.contract_number || '';
      return String(na).localeCompare(String(nb), 'es', { numeric: true });
    });
    const sections = contractIds.map((id) => ({
      key: `contract-${id}`,
      kind: 'contract',
      rows: sortByDateDesc(byContract.get(id))
    }));
    for (const row of sortByDateDesc(otros)) {
      sections.push({ key: `other-${row.id}`, kind: 'other', rows: [row] });
    }
    return sections;
  }, [filteredExpenses]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.account_name} (${a.bank_name || '-'})`
  }));

  const validationLabel = (row) => {
    const v = row.validation_status || 'approved';
    if (v === 'pending') return <span className="text-amber-700 font-medium">Por validar</span>;
    if (v === 'rejected') return <span className="text-red-600">Rechazado</span>;
    return '—';
  };

  const allViewColumns = useMemo(() => {
    const origen = {
      header: 'Origen',
      accessor: 'contract_number',
      wrap: true,
      maxWidth: '240px',
      render: (row) => {
        if (row.contract_number) {
          return (
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-semibold text-gray-900">Contrato {row.contract_number}</span>
              <span className="text-gray-700">{row.client_name || 'Cliente'}</span>
              <span className="text-xs text-gray-500">
                {(row.contract_origin || '—') + ' → ' + (row.contract_destination || '—')}
              </span>
            </div>
          );
        }
        return <span>{getExpenseSource(row).label}</span>;
      }
    };
    const tipo = { header: 'Tipo de Gasto', accessor: 'expense_type' };
    const monto = { header: 'Monto', render: (row) => formatCurrency(row.amount) };
    const estado = {
      header: 'Estado',
      render: (row) => validationLabel(row)
    };
    const forma = {
      header: 'Forma (chofer)',
      render: (row) => row.driver_payment_method || '—'
    };
    const cuenta = { header: 'Cuenta', accessor: 'account_name' };
    const unidad = { header: 'Unidad de Negocio', accessor: 'business_unit' };
    const fecha = { header: 'Fecha', render: (row) => formatDate(row.expense_date) };
    return [origen, tipo, monto, estado, forma, cuenta, unidad, fecha];
  }, []);

  const pendingDetailColumns = useMemo(() => {
    const seleccion = {
      header: '',
      width: '42px',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedPendingIds.includes(row.id)}
          onChange={() => toggleSelectPending(row.id)}
          className="rounded border-gray-300 cursor-pointer text-emerald-600 focus:ring-emerald-500"
          aria-label="Seleccionar para validación"
        />
      )
    };
    const tipo = { header: 'Tipo de Gasto', accessor: 'expense_type' };
    const monto = { header: 'Monto', render: (row) => formatCurrency(row.amount) };
    const forma = {
      header: 'Forma (chofer)',
      render: (row) => row.driver_payment_method || '—'
    };
    const cuenta = { header: 'Cuenta', accessor: 'account_name' };
    const unidad = { header: 'Unidad de Negocio', accessor: 'business_unit' };
    const fecha = { header: 'Fecha', render: (row) => formatDate(row.expense_date) };
    return [seleccion, tipo, monto, forma, cuenta, unidad, fecha];
  }, [selectedPendingIds]);

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header
        title="Egresos"
        buttonText="+ Registrar Gasto"
        onButtonClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
      />

      <div className="mb-4 flex flex-wrap items-end gap-4 p-4 bg-white rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[40px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[40px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setDateRange(getCalendarMonthRange())}
          className="px-3 py-2 text-sm font-medium text-blue-600 hover:underline"
        >
          Mes en curso
        </button>
        <button
          type="button"
          onClick={() => setDateRange({ start: '', end: '' })}
          className="px-3 py-2 text-sm font-medium text-gray-600 hover:underline"
        >
          Sin filtro de fechas
        </button>
        
        <div className="ml-auto rounded-lg bg-amber-50 border border-amber-100 px-4 py-2 min-w-[180px]">
          <p className="text-xs text-amber-800">Total en tabla</p>
          <p className="text-lg font-bold text-amber-900 tabular-nums">
            {formatCurrency(expensesTableTotal)}
          </p>
          <p className="text-xs text-amber-700/80 mt-0.5">
            {filteredExpenses.length} registro{filteredExpenses.length === 1 ? '' : 's'}
            {tableSearch.trim() ? ' (con búsqueda)' : ''}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            viewMode === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Todos los egresos
        </button>
        <button
          type="button"
          onClick={() => setViewMode('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            viewMode === 'pending'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Por validar (chofer)
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Contrato, cliente, origen o monto (ej. 500 o 1200.50)..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {viewMode === 'all' && !tableSearch && !(dateFrom && dateTo) && (
          <p className="mt-2 text-sm text-gray-600">
            Sin rango de fechas: se muestran los 20 egresos más recientes.
          </p>
        )}
        {viewMode === 'all' && !tableSearch && dateFrom && dateTo && (
          <p className="mt-2 text-sm text-gray-600">
            Egresos con fecha entre {dateFrom} y {dateTo} (hasta 5000 registros).
          </p>
        )}
        {viewMode === 'pending' && dateFrom && dateTo && !tableSearch && (
          <p className="mt-2 text-sm text-gray-600">
            Por validar con fecha entre {dateFrom} y {dateTo}.
          </p>
        )}
        {tableSearch && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando {filteredExpenses.length} de {expenses.length} egresos
          </p>
        )}
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
          No hay egresos que mostrar
        </div>
      ) : viewMode === 'all' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table
            columns={allViewColumns}
            data={filteredExpenses}
            sortable
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {filteredExpenses.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-emerald-50/90 border border-emerald-100 text-sm">
              <span className="text-gray-800 font-medium">
                {selectedPendingIds.length} seleccionado
                {selectedPendingIds.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={selectAllVisiblePending}
                className="text-emerald-700 hover:text-emerald-900 font-medium underline-offset-2 hover:underline"
              >
                Marcar todos (visibles)
              </button>
              <button
                type="button"
                onClick={clearPendingSelection}
                className="text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
              >
                Limpiar marca
              </button>
              <button
                type="button"
                disabled={selectedPendingIds.length === 0}
                onClick={openBulkValidateModal}
                className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm shadow-sm hover:bg-emerald-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Validar selección
                {selectedPendingIds.length > 0 ? ` (${selectedPendingIds.length})` : ''}
              </button>
            </div>
          )}
          {groupedExpenseSections.map((section) => {
            const first = section.rows[0];
            const isContract = section.kind === 'contract';
            return (
              <div key={section.key} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <div className="bg-slate-100 border-b border-gray-200 px-4 py-3">
                  {isContract && first?.contract_number ? (
                    <>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Contrato</p>
                      <p className="text-xl font-bold text-gray-900">{first.contract_number}</p>
                      <p className="text-sm text-slate-700 mt-1">
                        {first.client_name || 'Cliente'}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {first.contract_origin || '—'} → {first.contract_destination || '—'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Origen</p>
                      <p className="text-base font-semibold text-gray-900">
                        {getExpenseSource(first).label}
                      </p>
                    </>
                  )}
                </div>
                <Table
                  columns={pendingDetailColumns}
                  data={section.rows}
                  customActions={(row) => (
                    <>
                      <button
                        type="button"
                        onClick={() => openValidateModal(row)}
                        className="text-green-600 hover:text-green-900 font-medium px-2 py-1"
                        title="Aprobar y asignar cuenta"
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRow(row)}
                        className="text-red-600 hover:text-red-900 font-medium px-2 py-1"
                        title="Rechazar"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingExpense ? 'Editar Gasto' : 'Registrar Gasto'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar contrato
            </label>
            <input
              type="text"
              placeholder="Escribe número de contrato o nombre del cliente..."
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <FormSelect
            label="Contrato (opcional - dejar vacío para gastos de empresa)"
            value={formData.contract_id}
            onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
            options={filteredContractOptions}
          />
          {contractSearch && filteredContractOptions.length === 0 && (
            <p className="mt-1 text-sm text-amber-600">
              No se encontraron contratos. Intenta con otro término.
            </p>
          )}

          <FormSelect
            label="Tipo de Gasto"
            value={formData.expense_type}
            onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
            options={EXPENSE_TYPES}
            required
          />

          {formData.expense_type === 'Otro' && (
            <FormInput
              label="Especifique el tipo"
              value={formData.expense_type_other}
              onChange={(e) => setFormData({ ...formData, expense_type_other: e.target.value })}
              placeholder="Ej: Licencias, Publicidad..."
              required={formData.expense_type === 'Otro'}
            />
          )}

          <FormInput
            label="Monto"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          <FormSelect
            label="Cuenta (de la cual se descuenta)"
            value={formData.payment_account_id}
            onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
            options={accountOptions}
          />

          <FormInput
            label="Unidad de Negocio"
            value={formData.business_unit}
            onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
            placeholder="Ej: Transit, Turismo..."
          />

          <FormInput
            label="Fecha"
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            required
          />

          <FormInput
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingExpense ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!validateTargets?.length}
        onClose={() => !validatingBulk && setValidateTargets(null)}
        title={
          validateTargets?.length && validateTargets.length > 1
            ? `Validar ${validateTargets.length} gastos`
            : 'Validar gasto del chofer'
        }
        size="md"
      >
        {validateTargets?.length ? (
          <form onSubmit={handleValidateApprove} className="space-y-4">
            <p className="text-sm text-gray-600">
              Se cargará todo el monto a la <strong>misma cuenta</strong> seleccionada.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
              {validateTargets.map((row) => {
                const contratoSnippet =
                  row.contract_number &&
                  `${row.contract_number}${row.client_name ? ` · ${row.client_name}` : ''}`;
                return (
                  <div key={row.id} className="px-3 py-2 text-sm text-gray-800">
                    <div className="font-medium">{row.expense_type}</div>
                    <div className="text-gray-600 tabular-nums">{formatCurrency(row.amount)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Chofer:&nbsp;<strong>{row.driver_payment_method || '—'}</strong>
                    </div>
                    {contratoSnippet && (
                      <div className="text-xs text-gray-500 mt-0.5">{contratoSnippet}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {validateTargets.length > 1 && (
              <p className="text-sm font-semibold text-gray-900 tabular-nums">
                Total:&nbsp;
                {formatCurrency(
                  validateTargets.reduce((s, row) => s + (parseFloat(row.amount) || 0), 0)
                )}
              </p>
            )}
            <FormSelect
              label="Cuenta (donde se descuenta)"
              value={validateAccountId}
              onChange={(e) => setValidateAccountId(e.target.value)}
              options={accountOptions}
              required
            />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                type="button"
                disabled={validatingBulk}
                onClick={() => setValidateTargets(null)}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={validatingBulk}>
                {validatingBulk ? 'Guardando…' : validateTargets.length > 1 ? 'Aprobar gastos' : 'Aprobar gasto'}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Expenses;
