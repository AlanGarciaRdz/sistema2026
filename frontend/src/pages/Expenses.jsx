import React, { useState, useEffect } from 'react';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
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
  { value: 'Luz', label: 'Luz' },
  { value: 'Agua', label: 'Agua' },
  { value: 'Gas', label: 'Gas' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Teléfono', label: 'Teléfono' },
  { value: 'Contadores', label: 'Contadores' },
  { value: 'AWS', label: 'AWS' },
  { value: 'Google', label: 'Google' },
  { value: 'Software', label: 'Software' },
  { value: 'Combustible', label: 'Combustible' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Seguros', label: 'Seguros' },
  { value: 'Nómina', label: 'Nómina' },
  { value: 'Renta', label: 'Renta' },
  { value: 'Otro', label: 'Otro' }
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [toast, setToast] = useState(null);
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
    fetchExpenses();
    fetchContracts();
    fetchAccounts();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await getExpenses();
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

  const contractOptions = contracts.map((c) => ({
    value: c.id,
    label: `${c.contract_number || ''} - ${c.client_name || 'Sin cliente'}`
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.account_name} (${a.bank_name || '-'})`
  }));

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

  const columns = [
    {
      header: 'Origen',
      accessor: 'contract_number',
      render: (row) => getExpenseSource(row).label
    },
    { header: 'Tipo de Gasto', accessor: 'expense_type' },
    { header: 'Monto', render: (row) => formatCurrency(row.amount) },
    { header: 'Cuenta', accessor: 'account_name' },
    { header: 'Unidad de Negocio', accessor: 'business_unit' },
    { header: 'Fecha', render: (row) => formatDate(row.expense_date) }
  ];

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

      <Table
        columns={columns}
        data={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
          <FormSelect
            label="Contrato (opcional - dejar vacío para gastos de empresa)"
            value={formData.contract_id}
            onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
            options={contractOptions}
          />

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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Expenses;
