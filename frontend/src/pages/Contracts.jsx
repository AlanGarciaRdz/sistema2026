import React, { useState, useEffect } from 'react';
import ContractService from '../components/ContractService';
import { getContracts, deleteContract, createContract, updateContract } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isContratoServicioOpen, setIsContratoServicioOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

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

  const handleSaveContract = async (payload) => {
    try {
      // Map ContractService payload -> backend contracts schema
      const statusMap = {
        scheduled: 'Agendado',
        in_progress: 'En proceso',
        complete: 'Realizado'
      };

      const isContrato = payload.mode === 'contrato';
      const startDate = isContrato ? payload.departure : payload.serviceDate;
      const endDate = isContrato ? (payload.returnDate || payload.departure) : payload.serviceDate;

      const contractData = {
        contract_number: payload.folio,
        quote_id: null,
        client_id: payload.client?.id || null,
        start_date: startDate || null,
        end_date: endDate || null,
        origin: payload.origin || null,
        origin_maps: payload.originMaps || null,
        destination: payload.destination || null,
        destination_maps: payload.destinationMaps || null,
        itinerary: payload.itineraryText || null,
        passenger_count: payload.capacity || null,
        total_amount: payload.total || 0,
        status: statusMap[payload.status] || 'Agendado',
        num_units: 1,
        event_type: payload.mode === 'contrato' ? 'Contrato' : 'Servicio',
        vehicle_name: payload.vehicle?.license_plate || payload.vehicle?.plate || payload.vehicle?.vehicle_code || null,
        // Keep extra UI fields in notes for later (optional)
        notes: JSON.stringify({
          mode: payload.mode,
          contactName: payload.contactName || '',
          contactPhone: payload.contactPhone || '',
          unitType: payload.unitType || '',
          departureTime: payload.departureTime || '',
          returnTime: payload.returnTime || '',
          serviceTime: payload.serviceTime || '',
          vehicle: payload.vehicle || null,
          uiNotes: payload.notes || ''
        })
      };

      if (editingContract?.id) {
        await updateContract(editingContract.id, contractData);
        setToast({ message: 'Contrato actualizado exitosamente', type: 'success' });
      } else {
        await createContract(contractData);
        setToast({ message: 'Contrato guardado exitosamente', type: 'success' });
      }

      setEditingContract(null);
      setIsContratoServicioOpen(false);
      fetchContracts();
    } catch (error) {
      console.error('Error saving contract:', error);
      setToast({ message: 'Error al guardar contrato', type: 'error' });
    }
  };

  const handleEdit = (row) => {
    let notesData = {};
    try {
      notesData = row.notes ? JSON.parse(row.notes) : {};
    } catch {}

    // Map backend row -> ContractService expected shape
    const statusReverseMap = {
      Agendado: 'scheduled',
      'En proceso': 'in_progress',
      Realizado: 'complete'
    };

    const mode = notesData.mode || 'contrato';
    const startDateStr = row.start_date ? String(row.start_date).slice(0, 10) : '';
    const endDateStr = row.end_date ? String(row.end_date).slice(0, 10) : '';

    setEditingContract({
      id: row.id,
      folio: row.contract_number,
      mode,
      client: row.client_id ? { id: row.client_id, name: row.client_name, phone: notesData.contactPhone || '' } : null,
      vehicle: notesData.vehicle || null,
      contactName: notesData.contactName || '',
      contactPhone: notesData.contactPhone || '',
      origin: row.origin || '',
      originMaps: row.origin_maps || '',
      destination: row.destination || '',
      destinationMaps: row.destination_maps || '',
      itineraryText: row.itinerary || '',
      unitType: notesData.unitType || '',
      total: row.total_amount ?? '',
      notes: notesData.uiNotes || '',
      status: statusReverseMap[row.status] || 'scheduled',
      departure: mode === 'contrato' ? startDateStr : '',
      returnDate: mode === 'contrato' ? endDateStr : '',
      departureTime: notesData.departureTime || '',
      returnTime: notesData.returnTime || '',
      capacity: row.passenger_count || '',
      serviceDate: mode === 'servicio' ? startDateStr : '',
      serviceTime: mode === 'servicio' ? (notesData.serviceTime || '') : ''
    });

    setIsContratoServicioOpen(true);
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
      
      <Header title="Contratos" 
        buttonText="+ Contrato/Servicio"
        onButtonClick={() => {
          setIsContratoServicioOpen(true);
        }}
      />
      <Table
        columns={columns}
        data={contracts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ContractService
        isOpen={isContratoServicioOpen}
        onClose={() => {
          setIsContratoServicioOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        editingContract={editingContract}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Contracts;
