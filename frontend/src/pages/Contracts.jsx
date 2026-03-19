import React, { useState, useEffect, useMemo } from 'react';
import ContractService from '../components/ContractService';
import { getContracts, deleteContract, createContract, updateContract, getPayments } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { FileDown, Copy, Eye } from 'lucide-react';
import { buildPdfInfoFromRow, generateContractPdf } from '../utils/contractPdfUtils';
import TripSummaryModal from '../components/TripSummaryModal';

const generateContractNumber = () => {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
};

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isContratoServicioOpen, setIsContratoServicioOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterNoContrato, setFilterNoContrato] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [summaryRow, setSummaryRow] = useState(null);

  useEffect(() => {
    fetchContracts();
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await getPayments();
      setPayments(response.data.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

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
        notes: JSON.stringify({
          mode: payload.mode,
          contactName: payload.contactName || '',
          contactPhone: payload.contactPhone || '',
          referencias: payload.referencias || '',
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
      referencias: notesData.referencias || '',
      destination: row.destination || '',
      destinationMaps: row.destination_maps || '',
      itineraryText: row.itinerary || '',
      unitType: notesData.unitType || '',
      total: row.total_amount ?? '',
      notes: notesData.uiNotes ?? notesData.notes ?? '',
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

  const handleCopy = (row) => {
    let notesData = {};
    try {
      notesData = row.notes ? JSON.parse(row.notes) : {};
    } catch {}

    const statusReverseMap = {
      Agendado: 'scheduled',
      'En proceso': 'in_progress',
      Realizado: 'complete'
    };

    const mode = notesData.mode || 'contrato';
    const startDateStr = row.start_date ? String(row.start_date).slice(0, 10) : '';
    const endDateStr = row.end_date ? String(row.end_date).slice(0, 10) : '';

    setEditingContract({
      id: null,
      folio: generateContractNumber(),
      mode,
      client: row.client_id ? { id: row.client_id, name: row.client_name, phone: notesData.contactPhone || '' } : null,
      vehicle: notesData.vehicle || null,
      contactName: notesData.contactName || '',
      contactPhone: notesData.contactPhone || '',
      origin: row.origin || '',
      originMaps: row.origin_maps || '',
      referencias: notesData.referencias || '',
      destination: row.destination || '',
      destinationMaps: row.destination_maps || '',
      itineraryText: row.itinerary || '',
      unitType: notesData.unitType || '',
      total: row.total_amount ?? '',
      notes: notesData.uiNotes ?? notesData.notes ?? '',
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

  const handleGeneratePdf = async (row) => {
    try {
      const info = await buildPdfInfoFromRow(row);
      await generateContractPdf(info);
      setToast({ message: 'PDF generado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al generar PDF', type: 'error' });
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

  const getUnitType = (row) => {
    try {
      const n = row.notes ? JSON.parse(row.notes) : {};
      return n.unitType || '-';
    } catch { return '-'; }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((row) => {
      const startStr = row.start_date ? String(row.start_date).slice(0, 10) : '';
      const endStr = row.end_date ? String(row.end_date).slice(0, 10) : startStr;
      if (filterFechaInicio && startStr && startStr < filterFechaInicio) return false;
      if (filterFechaFin && endStr && endStr > filterFechaFin) return false;
      if (filterCliente) {
        const c = (row.client_name || '').toLowerCase();
        if (!c.includes(filterCliente.toLowerCase())) return false;
      }
      if (filterNoContrato) {
        const n = (row.contract_number || '').toLowerCase();
        if (!n.includes(filterNoContrato.toLowerCase())) return false;
      }
      if (filterEstado && row.status !== filterEstado) return false;
      if (filterDestino) {
        const d = (row.destination || '').toLowerCase();
        if (!d.includes(filterDestino.toLowerCase())) return false;
      }
      return true;
    });
  }, [contracts, filterFechaInicio, filterFechaFin, filterCliente, filterNoContrato, filterEstado, filterDestino]);

  const getPaidAmount = (contractId) => {
    return (payments || [])
      .filter((p) => p.contract_id != null && p.contract_id == contractId)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  const getAssignedUnit = (row) => {
    if (row.vehicle_name) return row.vehicle_name;
    try {
      const n = row.notes ? JSON.parse(row.notes) : {};
      const v = n.vehicle;
      if (!v) return null;
      return v.license_plate || v.vehicle_code || v.plate || null;
    } catch { return null; }
  };

  const columns = [
    {
      header: 'No. Contrato',
      width: '120px',
      render: (row) => {
        const unit = getAssignedUnit(row);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.contract_number}</span>
            <span className="text-xs text-gray-500">{getUnitType(row)}</span>
            {unit && <span className="text-xs text-blue-600 font-medium">{unit}</span>}
          </div>
        );
      }
    },
    { header: 'Cliente', accessor: 'client_name', maxWidth: '120px', wrap: true },
    { header: 'Origen', accessor: 'origin', maxWidth: '120px', wrap: true },
    { header: 'Destino', accessor: 'destination', maxWidth: '120px', wrap: true },
    { header: 'Fecha Inicio', render: (row) => formatDate(row.start_date), width: '95px' },
    { header: 'Fecha Fin', render: (row) => formatDate(row.end_date), width: '95px' },
    {
      header: 'Monto Total',
      width: '120px',
      render: (row) => {
        const total = parseFloat(row.total_amount) || 0;
        const paid = getPaidAmount(row.id);
        const remaining = total - paid;
        const hasPayments = paid > 0;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{formatCurrency(total)}</span>
            {hasPayments && (
              <>
                <span className="text-xs text-green-600">Abonado: {formatCurrency(paid)}</span>
                <span className="text-xs text-amber-600">Falta: {formatCurrency(remaining)}</span>
              </>
            )}
          </div>
        );
      }
    },
    {
      header: 'Estado',
      width: '100px',
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
    <div className="p-3 sm:p-4 md:p-6 min-w-0 overflow-x-hidden">
      
      <Header title="Contratos" 
        buttonText="+ Contrato/Servicio"
        onButtonClick={() => {
          setEditingContract(null);
          setIsContratoServicioOpen(true);
        }}
      />

      <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={filterFechaInicio}
              onChange={(e) => setFilterFechaInicio(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
            <input
              type="date"
              value={filterFechaFin}
              onChange={(e) => setFilterFechaFin(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">No. contrato</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterNoContrato}
              onChange={(e) => setFilterNoContrato(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            >
              <option value="">Todos</option>
              <option value="Agendado">Agendado</option>
              <option value="En proceso">En proceso</option>
              <option value="Realizado">Realizado</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterDestino}
              onChange={(e) => setFilterDestino(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={filteredContracts}
        onEdit={handleEdit}
        onDelete={handleDelete}
        customActions={(row) => (
          <>
            <button
              onClick={() => setSummaryRow(row)}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1"
              title="Resumen del viaje"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => handleCopy(row)}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1"
              title="Copiar servicio"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => handleGeneratePdf(row)}
              className="text-amber-600 hover:text-amber-800 transition-colors p-1"
              title="Generar PDF"
            >
              <FileDown size={18} />
            </button>
          </>
        )}
      />

      <ContractService
        key={editingContract?.id ?? 'new'}
        isOpen={isContratoServicioOpen}
        onClose={() => {
          setIsContratoServicioOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        editingContract={editingContract}
      />
      <TripSummaryModal
        isOpen={!!summaryRow}
        onClose={() => setSummaryRow(null)}
        row={summaryRow}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Contracts;
