import React, { useState, useEffect } from 'react';
import { getContracts, deleteContract } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await getContracts();
      setContracts(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar contratos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contract) => {
    if (window.confirm('¿Está seguro de eliminar este contrato?')) {
      try {
        await deleteContract(contract.id);
        setToast({ message: 'Contrato eliminado exitosamente', type: 'success' });
        fetchContracts();
      } catch (error) {
        setToast({ message: 'Error al eliminar contrato', type: 'error' });
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
    { header: 'No. Contrato', accessor: 'contract_number' },
    { header: 'Cliente', accessor: 'client_name' },
    { header: 'Origen', accessor: 'origin' },
    { header: 'Destino', accessor: 'destination' },
    { header: 'Fecha Inicio', render: (row) => formatDate(row.start_date) },
    { header: 'Fecha Fin', render: (row) => formatDate(row.end_date) },
    { header: 'Monto Total', render: (row) => formatCurrency(row.total_amount) },
    { 
      header: 'Estado', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Agendado' ? 'bg-green-100 text-green-800' :
          row.status === 'Realizado' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header title="Contratos" />
      <Table
        columns={columns}
        data={contracts}
        onDelete={handleDelete}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Contracts;
