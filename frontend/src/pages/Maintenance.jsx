import React, { useState, useEffect } from 'react';
import {
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getVehicles,
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

const Maintenance = () => {
  const [maintenance, setMaintenance] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    mileage: '',
    maintenance_type: '',
    cost: '',
    payment_account_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchMaintenance();
    fetchVehicles();
    fetchAccounts();
  }, []);

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const response = await getMaintenance();
      setMaintenance(response.data.data || []);
    } catch (error) {
      setToast({ message: 'Error al cargar mantenimientos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await getVehicles();
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
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
      const payload = {
        vehicle_id: formData.vehicle_id || null,
        maintenance_date: formData.maintenance_date,
        mileage: formData.mileage ? parseInt(formData.mileage, 10) : null,
        maintenance_type: formData.maintenance_type || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        payment_account_id: formData.payment_account_id || null,
        notes: formData.notes || null
      };

      if (editingRecord) {
        await updateMaintenance(editingRecord.id, payload);
        setToast({ message: 'Mantenimiento actualizado exitosamente', type: 'success' });
      } else {
        await createMaintenance(payload);
        setToast({ message: 'Mantenimiento registrado exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchMaintenance();
    } catch (error) {
      setToast({ message: 'Error al guardar mantenimiento', type: 'error' });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      vehicle_id: record.vehicle_id || '',
      maintenance_date: record.maintenance_date ? String(record.maintenance_date).slice(0, 10) : '',
      mileage: record.mileage ?? '',
      maintenance_type: record.maintenance_type || '',
      cost: record.cost ?? '',
      payment_account_id: record.payment_account_id || '',
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record) => {
    if (window.confirm('¿Está seguro de eliminar este registro de mantenimiento?')) {
      try {
        await deleteMaintenance(record.id);
        setToast({ message: 'Mantenimiento eliminado exitosamente', type: 'success' });
        fetchMaintenance();
      } catch (error) {
        setToast({ message: 'Error al eliminar mantenimiento', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      mileage: '',
      maintenance_type: '',
      cost: '',
      payment_account_id: '',
      notes: ''
    });
    setEditingRecord(null);
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

  const getVehicleLabel = (row) => {
    if (row.vehicle_label) return row.vehicle_label;
    if (row.vehicle_code) return row.vehicle_code;
    if (row.license_plate) return row.license_plate;
    const v = vehicles.find((ve) => ve.id === row.vehicle_id);
    return v ? `${v.vehicle_code || v.license_plate || ''} ${v.brand || ''} ${v.model || ''}`.trim() || '-' : '-';
  };

  const columns = [
    {
      header: 'Unidad',
      accessor: 'vehicle_label',
      render: (row) => getVehicleLabel(row)
    },
    { header: 'Fecha', accessor: 'maintenance_date', render: (row) => formatDate(row.maintenance_date) },
    { header: 'Kilometraje', accessor: 'mileage', render: (row) => row.mileage != null ? row.mileage.toLocaleString() : '-' },
    { header: 'Mantenimiento', accessor: 'maintenance_type' },
    { header: 'Costo', accessor: 'cost', render: (row) => formatCurrency(row.cost) },
    { header: 'Cuenta', accessor: 'account_name' }
  ];

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.vehicle_code || v.license_plate || 'Sin código'} - ${v.brand || ''} ${v.model || ''} (${v.license_plate || '-'})`.trim()
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.account_name} (${a.bank_name || '-'})`
  }));

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header
        title="Mantenimiento"
        buttonText="+ Registrar Mantenimiento"
        onButtonClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
      />

      <Table
        columns={columns}
        data={maintenance}
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
        title={editingRecord ? 'Editar Mantenimiento' : 'Registrar Mantenimiento'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Unidad"
            value={formData.vehicle_id}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            options={vehicleOptions}
            required
          />

          <FormInput
            label="Fecha"
            type="date"
            value={formData.maintenance_date}
            onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
            required
          />

          <FormInput
            label="Kilometraje"
            type="number"
            value={formData.mileage}
            onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
            placeholder="Ej: 50000"
          />

          <FormInput
            label="Tipo de Mantenimiento"
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            placeholder="Ej: Cambio de aceite, Frenos, Llantas..."
          />

          <FormInput
            label="Costo"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
          />

          <FormSelect
            label="Cuenta (opcional - si selecciona, se registra como egreso y se descuenta de esta cuenta)"
            value={formData.payment_account_id}
            onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
            options={accountOptions}
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
              {editingRecord ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Maintenance;
