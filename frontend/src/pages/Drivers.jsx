import React, { useState, useEffect } from 'react';
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { FileText } from 'lucide-react';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    license_number: '',
    documents: '',
    phone: '',
    email: '',
    status: 'Active',
    start_date: '',
    social_security_number: '',
    curp: '',
    job_title: ''
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await getDrivers();
      setDrivers(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar personal', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData);
        setToast({ message: 'Registro actualizado exitosamente', type: 'success' });
      } else {
        await createDriver(formData);
        setToast({ message: 'Personal registrado exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchDrivers();
    } catch (error) {
      setToast({ message: 'Error al guardar', type: 'error' });
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      license_number: driver.license_number || '',
      documents: driver.documents || '',
      phone: driver.phone || '',
      email: driver.email || '',
      status: driver.status || 'Active',
      start_date: driver.start_date ? String(driver.start_date).slice(0, 10) : '',
      social_security_number: driver.social_security_number || '',
      curp: driver.curp || '',
      job_title: driver.job_title || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (driver) => {
    if (window.confirm('¿Está seguro de eliminar este registro de personal?')) {
      try {
        await deleteDriver(driver.id);
        setToast({ message: 'Registro eliminado exitosamente', type: 'success' });
        fetchDrivers();
      } catch (error) {
        setToast({ message: 'Error al eliminar', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      license_number: '',
      documents: '',
      phone: '',
      email: '',
      status: 'Active',
      start_date: '',
      social_security_number: '',
      curp: '',
      job_title: ''
    });
    setEditingDriver(null);
  };

  const handleDocumentClick = (documents) => {
    if (documents) {
      // If it's a URL, open it in a new tab
      if (documents.startsWith('http://') || documents.startsWith('https://')) {
        window.open(documents, '_blank');
      } else {
        // Otherwise, show the documents text in an alert or modal
        alert('Documentos: ' + documents);
      }
    }
  };

  const columns = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Licencia', accessor: 'license_number' },
    { header: 'Teléfono', accessor: 'phone' },
    { header: 'Email', accessor: 'email' },
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
        title="Personal"
        buttonText="+ Agregar personal"
        onButtonClick={() => {
          resetForm();
          setIsModalOpen(true);
        }}
      />

      <Table
        columns={columns}
        data={drivers}
        customActions={(row) => (
          row.documents ? (
            <button
              onClick={() => handleDocumentClick(row.documents)}
              className="text-green-600 hover:text-green-900 transition-colors"
              title="Ver documentos"
            >
              <FileText size={18} />
            </button>
          ) : null
        )}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingDriver ? 'Editar personal' : 'Agregar personal'}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nombre"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <FormInput
            label="Número de Licencia"
            id="license_number"
            name="license_number"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          />
          <FormInput
            label="Fecha de inicio"
            id="start_date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
          <FormInput
            label="Número de seguro social"
            id="social_security_number"
            name="social_security_number"
            value={formData.social_security_number}
            onChange={(e) => setFormData({ ...formData, social_security_number: e.target.value })}
          />
          <FormInput
            label="CURP"
            id="curp"
            name="curp"
            value={formData.curp}
            onChange={(e) => setFormData({ ...formData, curp: e.target.value })}
            maxLength={18}
          />
          <FormInput
            label="Puesto en la empresa"
            id="job_title"
            name="job_title"
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
          />
          <FormInput
            label="Documentos"
            id="documents"
            name="documents"
            value={formData.documents}
            onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
          />
          <FormInput
            label="Teléfono"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <FormInput
            label="Email"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <FormSelect
            label="Estado"
            id="status"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'Active', label: 'Activo' },
              { value: 'Inactive', label: 'Inactivo' }
            ]}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => { setIsModalOpen(false); resetForm(); }} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingDriver ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Drivers;
