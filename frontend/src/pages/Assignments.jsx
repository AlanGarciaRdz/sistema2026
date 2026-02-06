import React, { useState, useEffect } from 'react';
import { getAssignments, deleteAssignment } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignments();
      setAssignments(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar asignaciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (window.confirm('¿Está seguro de eliminar esta asignación?')) {
      try {
        await deleteAssignment(assignment.id);
        setToast({ message: 'Asignación eliminada exitosamente', type: 'success' });
        fetchAssignments();
      } catch (error) {
        setToast({ message: 'Error al eliminar asignación', type: 'error' });
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const columns = [
    { header: 'Contrato', accessor: 'contract_number' },
    { header: 'Chofer', accessor: 'driver_name' },
    { header: 'Vehículo', accessor: 'vehicle_code' },
    { header: 'Fecha Asignación', render: (row) => formatDate(row.assigned_date) },
    { header: 'Fecha Viaje', render: (row) => formatDate(row.driving_date) }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header title="Asignaciones" />
      <Table
        columns={columns}
        data={assignments}
        onDelete={handleDelete}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Assignments;
