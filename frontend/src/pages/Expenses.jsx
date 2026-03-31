import React, { useState, useEffect, useMemo } from 'react';
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
  const [validateModal, setValidateModal] = useState(null);
  const [validateAccountId, setValidateAccountId] = useState('');
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
  }, [viewMode]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params =
        viewMode === 'pending' ? { validation_status: 'pending' } : {};
      const response = await getExpenses(params);
      setExpenses(response.data.data || []);
    } catch (error) {
      setToast({ message: 'Error al cargar gastos', type: 'error' });
    } finally {
      setLoading(false);
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
    setValidateModal(expense);
    setValidateAccountId('');
  };

  const handleValidateApprove = async (e) => {
    e.preventDefault();
    if (!validateAccountId) {
      setToast({ message: 'Seleccione la cuenta contable', type: 'error' });
      return;
    }
    try {
      await validateExpense(validateModal.id, {
        action: 'approve',
        payment_account_id: parseInt(validateAccountId, 10)
      });
      setToast({ message: 'Gasto validado', type: 'success' });
      setValidateModal(null);
      fetchExpenses();
    } catch (error) {
      setToast({ message: error.response?.data?.error || 'Error al validar', type: 'error' });
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
    if (window.confirm('¿Está seguro de eliminar este gasto?')) {
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
      const source = getExpenseSource(row);
      if (source.type === 'contract') {
        const contract = contracts.find((c) => c.id === row.contract_id);
        const contractNum = row.contract_number || contract?.contract_number || '';
        const clientName = contract?.client_name || '';
        return (
          contractNum.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q)
        );
      }
      return source.label.toLowerCase().includes(q);
    });
  }, [expenses, tableSearch, contracts]);

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

  const columns = useMemo(() => {
    const origen = {
      header: 'Origen',
      accessor: 'contract_number',
      render: (row) => getExpenseSource(row).label
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
    if (viewMode === 'pending') {
      return [origen, tipo, monto, forma, cuenta, unidad, fecha];
    }
    return [origen, tipo, monto, estado, forma, cuenta, unidad, fecha];
  }, [viewMode]);

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
          placeholder="Buscar por número de contrato o nombre del cliente..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {tableSearch && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando {filteredExpenses.length} de {expenses.length} egresos
          </p>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredExpenses}
        onEdit={viewMode === 'pending' ? undefined : handleEdit}
        onDelete={viewMode === 'pending' ? undefined : handleDelete}
        customActions={
          viewMode === 'pending'
            ? (row) => (
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
              )
            : undefined
        }
        sortable
      />

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
        isOpen={!!validateModal}
        onClose={() => setValidateModal(null)}
        title="Validar gasto del chofer"
        size="md"
      >
        {validateModal && (
          <form onSubmit={handleValidateApprove} className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{validateModal.expense_type}</strong> ·{' '}
              {formatCurrency(validateModal.amount)} · Contrato{' '}
              {validateModal.contract_number || '—'}
            </p>
            <p className="text-sm text-gray-600">
              Forma reportada: <strong>{validateModal.driver_payment_method || '—'}</strong>
            </p>
            <FormSelect
              label="Cuenta (donde se descuenta)"
              value={validateAccountId}
              onChange={(e) => setValidateAccountId(e.target.value)}
              options={accountOptions}
              required
            />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" type="button" onClick={() => setValidateModal(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Aprobar gasto
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Expenses;
