import React, { useState, useEffect, useMemo } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import Header from '../components/Header';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await getClients();
      setClients(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar clientes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        setToast({ message: 'Cliente actualizado exitosamente', type: 'success' });
      } else {
        await createClient(formData);
        setToast({ message: 'Cliente creado exitosamente', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      setToast({ message: 'Error al guardar cliente', type: 'error' });
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      contact_person: client.contact_person || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (client) => {
    if (window.confirm('¿Está seguro de eliminar este cliente?')) {
      try {
        await deleteClient(client.id);
        setToast({ message: 'Cliente eliminado exitosamente', type: 'success' });
        fetchClients();
      } catch (error) {
        setToast({ message: 'Error al eliminar cliente', type: 'error' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: ''
    });
    setEditingClient(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const q = searchTerm.toLowerCase().trim();
    return clients.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.contact_person || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
    );
  }, [clients, searchTerm]);

  const columns = [
    { header: 'Nombre', accessor: 'name' },
    { header: 'Persona de Contacto', accessor: 'contact_person' },
    { header: 'Teléfono', accessor: 'phone' },
    { header: 'Email', accessor: 'email' }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      
      <Header title="Clientes" 
        buttonText="+ Nuevo Cliente"
        onButtonClick={() => setIsModalOpen(true)}
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, contacto, teléfono o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando {filteredClients.length} de {clients.length} clientes
          </p>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredClients}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            label="Persona de Contacto"
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
          <FormInput
            label="Dirección"
            id="address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={handleCloseModal} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingClient ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Clients;