import React, { useState, useEffect } from 'react';
import { getPaymentAccounts, createPaymentAccount, updatePaymentAccount, deletePaymentAccount } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const PaymentAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    account_code: '',
    account_name: '',
    account_type: '',
    bank_name: '',
    business_unit: '',
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await getPaymentAccounts();
      setAccounts(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar cuentas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updatePaymentAccount(editingAccount.id, formData);
        setToast({ message: 'Cuenta actualizada exitosamente', type: 'success' });
      } else {
        await createPaymentAccount(formData);
        setToast({ message: 'Cuenta creada exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      setToast({ message: 'Error al guardar cuenta', type: 'error' });
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code || '',
      account_name: account.account_name || '',
      account_type: account.account_type || '',
      bank_name: account.bank_name || '',
      business_unit: account.business_unit || '',
      status: account.status || 'Active',
      notes: account.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (account) => {
    if (window.confirm('¿Está seguro de eliminar esta cuenta?')) {
      try {
        await deletePaymentAccount(account.id);
        setToast({ message: 'Cuenta eliminada exitosamente', type: 'success' });
        fetchAccounts();
      } catch (error) {
        setToast({ message: 'Error al eliminar cuenta', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      account_code: '',
      account_name: '',
      account_type: '',
      bank_name: '',
      business_unit: '',
      status: 'Active',
      notes: ''
    });
    setEditingAccount(null);
  };

  const columns = [
    { header: 'Código', accessor: 'account_code' },
    { header: 'Nombre', accessor: 'account_name' },
    { header: 'Tipo', accessor: 'account_type' },
    { header: 'Banco', accessor: 'bank_name' },
    { header: 'Unidad de Negocio', accessor: 'business_unit' },
    { 
      header: 'Estado', 
      accessor: 'status',
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header
        title="Cuentas de Pago"
        buttonText="+ Nueva Cuenta"
        onButtonClick={() => setIsModalOpen(true)}
      />

      <Table
        columns={columns}
        data={accounts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Código de Cuenta"
            id="account_code"
            value={formData.account_code}
            onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
            required
          />
          <FormInput
            label="Nombre de Cuenta"
            id="account_name"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            required
          />
          <FormSelect
            label="Tipo de Cuenta"
            id="account_type"
            value={formData.account_type}
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
            options={[
              { value: 'Banco', label: 'Banco' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Tarjeta', label: 'Tarjeta' }
            ]}
          />
          <FormInput
            label="Banco"
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
          />
          <FormInput
            label="Unidad de Negocio"
            id="business_unit"
            value={formData.business_unit}
            onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
          />
          <FormSelect
            label="Estado"
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'Active', label: 'Activo' },
              { value: 'Inactive', label: 'Inactivo' }
            ]}
          />
          <FormInput
            label="Notas"
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingAccount ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default PaymentAccounts;
