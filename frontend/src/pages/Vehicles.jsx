import React, { useState, useEffect } from 'react';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_code: '',
    brand: '',
    model: '',
    year: '',
    vehicle_type: '',
    license_plate: '',
    passenger_capacity: '',
    fuel_type: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await getVehicles();
      setVehicles(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar vehículos', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData);
        setToast({ message: 'Vehículo actualizado exitosamente', type: 'success' });
      } else {
        await createVehicle(formData);
        setToast({ message: 'Vehículo creado exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchVehicles();
    } catch (error) {
      setToast({ message: 'Error al guardar vehículo', type: 'error' });
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_code: vehicle.vehicle_code || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year || '',
      vehicle_type: vehicle.vehicle_type || '',
      license_plate: vehicle.license_plate || '',
      passenger_capacity: vehicle.passenger_capacity || '',
      fuel_type: vehicle.fuel_type || '',
      status: vehicle.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (vehicle) => {
    if (window.confirm('¿Está seguro de eliminar este vehículo?')) {
      try {
        await deleteVehicle(vehicle.id);
        setToast({ message: 'Vehículo eliminado exitosamente', type: 'success' });
        fetchVehicles();
      } catch (error) {
        setToast({ message: 'Error al eliminar vehículo', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_code: '',
      brand: '',
      model: '',
      year: '',
      vehicle_type: '',
      license_plate: '',
      passenger_capacity: '',
      fuel_type: '',
      status: 'Active'
    });
    setEditingVehicle(null);
  };

  const columns = [
    { header: 'Código', accessor: 'vehicle_code' },
    { header: 'Marca', accessor: 'brand' },
    { header: 'Modelo', accessor: 'model' },
    { header: 'Año', accessor: 'year' },
    { header: 'Placas', accessor: 'license_plate' },
    { header: 'Capacidad', accessor: 'passenger_capacity' },
    { 
      header: 'Estado', 
      accessor: 'status',
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Active' ? 'bg-green-100 text-green-800' :
          row.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
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
        title="Vehículos"
        buttonText="+ Nuevo Vehículo"
        onButtonClick={() => setIsModalOpen(true)}
      />

      <Table
        columns={columns}
        data={vehicles}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Código del Vehículo"
              id="vehicle_code"
              value={formData.vehicle_code}
              onChange={(e) => setFormData({ ...formData, vehicle_code: e.target.value })}
            />
            <FormInput
              label="Marca"
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
            <FormInput
              label="Modelo"
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
            <FormInput
              label="Año"
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />
            <FormInput
              label="Tipo de Vehículo"
              id="vehicle_type"
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
            />
            <FormInput
              label="Placas"
              id="license_plate"
              value={formData.license_plate}
              onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
            />
            <FormInput
              label="Capacidad de Pasajeros"
              id="passenger_capacity"
              type="number"
              value={formData.passenger_capacity}
              onChange={(e) => setFormData({ ...formData, passenger_capacity: e.target.value })}
            />
            <FormInput
              label="Tipo de Combustible"
              id="fuel_type"
              value={formData.fuel_type}
              onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
            />
            <FormSelect
              label="Estado"
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Activo' },
                { value: 'Maintenance', label: 'Mantenimiento' },
                { value: 'Inactive', label: 'Inactivo' }
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingVehicle ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Vehicles;
