import React, { useState, useEffect } from 'react';
import { getExpenses, deleteExpense } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await getExpenses();
      setExpenses(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar gastos', type: 'error' });
    } finally {
      setLoading(false);
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

  const columns = [
    { header: 'Contrato', accessor: 'contract_number' },
    { header: 'Tipo de Gasto', accessor: 'expense_type' },
    { header: 'Monto', render: (row) => formatCurrency(row.amount) },
    { header: 'Cuenta', accessor: 'account_name' },
    { header: 'Unidad de Negocio', accessor: 'business_unit' },
    { header: 'Fecha', render: (row) => formatDate(row.expense_date) }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header title="Gastos" />
      <Table
        columns={columns}
        data={expenses}
        onDelete={handleDelete}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Expenses;
