import React, { useState, useEffect, useMemo } from 'react';
import ContractService from '../components/ContractService';
import {
  getContracts,
  deleteContract,
  createContract,
  updateContract,
  syncContractCalendar,
  getPayments,
  getExpenses,
  getAssignments
} from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { Link } from 'react-router-dom';
import { FileDown, Copy, Eye, Link2, Share2, User, FileSpreadsheet, Calendar } from 'lucide-react';
import { buildPdfInfoFromRow, generateContractPdf } from '../utils/contractPdfUtils';
import { formatDateLocal, diffInclusiveCalendarDays } from '../utils/formatDateLocal';
import TripSummaryModal from '../components/TripSummaryModal';

const driverPortalPath = (contractNumber) => `/c/${encodeURIComponent(contractNumber)}`;

const copyDriverPortalLink = async (contractNumber, setToast) => {
  const url = `${window.location.origin}/sistema${driverPortalPath(contractNumber)}`;
  try {
    await navigator.clipboard.writeText(url);
    setToast({ message: 'Link para chofer copiado al portapapeles', type: 'success' });
  } catch {
    setToast({ message: 'No se pudo copiar. Copie manualmente la URL.', type: 'error' });
  }
};

const generateContractNumber = () => {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
};

/** CSV para abrir en Excel (UTF-8 con BOM). */
const escapeCsvCell = (val) => {
  if (val == null || val === '') return '';
  const s = String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [assignments, setAssignments] = useState([]);
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
  const [filterChofer, setFilterChofer] = useState('');
  const [summaryRow, setSummaryRow] = useState(null);
  const [syncingCalendarId, setSyncingCalendarId] = useState(null);

  useEffect(() => {
    fetchContracts();
    fetchPayments();
    fetchExpenses();
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await getAssignments();
      setAssignments(response.data.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await getExpenses();
      setExpenses(response.data.data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

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
        complete: 'Realizado',
        pending_collect: 'Por cobrar',
        pending_pay: 'Por pagar'
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
      fetchAssignments();
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
      Realizado: 'complete',
      'Por cobrar': 'pending_collect',
      'Por pagar': 'pending_pay'
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
      Realizado: 'complete',
      'Por cobrar': 'pending_collect',
      'Por pagar': 'pending_pay'
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
        fetchAssignments();
      } catch (error) {
        setToast({ message: 'Error al eliminar contrato', type: 'error' });
      }
    }
  };

  const handleSyncCalendar = async (row) => {
    try {
      setSyncingCalendarId(row.id);
      const res = await syncContractCalendar(row.id);
      setToast({
        message: res.data.calendarMessage || 'Calendario sincronizado',
        type: 'success'
      });
      fetchContracts();
    } catch (error) {
      setToast({
        message: error.response?.data?.error || 'No se pudo sincronizar el calendario',
        type: 'error'
      });
    } finally {
      setSyncingCalendarId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const formatDate = formatDateLocal;

  const getUnitType = (row) => {
    try {
      const n = row.notes ? JSON.parse(row.notes) : {};
      return n.unitType || '-';
    } catch { return '-'; }
  };

  const driverNamesByContractId = useMemo(() => {
    const m = new Map();
    for (const a of assignments) {
      const cid = a.contract_id;
      if (cid == null || !a.driver_name) continue;
      const arr = m.get(cid) || [];
      if (!arr.includes(a.driver_name)) arr.push(a.driver_name);
      m.set(cid, arr);
    }
    for (const arr of m.values()) {
      arr.sort((x, y) => x.localeCompare(y, 'es'));
    }
    return m;
  }, [assignments]);

  const getAssignedDriverNames = (row) => {
    const fromAssign = driverNamesByContractId.get(row.id) || [];
    let notesData = {};
    try {
      notesData = row.notes ? JSON.parse(row.notes) : {};
    } catch {}
    const n = notesData?.assignment?.driver_name;
    if (n && !fromAssign.includes(n)) {
      return [...fromAssign, n].sort((a, b) => a.localeCompare(b, 'es'));
    }
    return fromAssign;
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
      if (filterChofer.trim()) {
        const q = filterChofer.toLowerCase().trim();
        const names = getAssignedDriverNames(row);
        if (!names.some((name) => name.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [
    contracts,
    filterFechaInicio,
    filterFechaFin,
    filterCliente,
    filterNoContrato,
    filterEstado,
    filterDestino,
    filterChofer,
    assignments
  ]);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filterFechaInicio ||
          filterFechaFin ||
          (filterCliente && filterCliente.trim()) ||
          (filterNoContrato && filterNoContrato.trim()) ||
          filterEstado ||
          (filterDestino && filterDestino.trim()) ||
          (filterChofer && filterChofer.trim())
      ),
    [
      filterFechaInicio,
      filterFechaFin,
      filterCliente,
      filterNoContrato,
      filterEstado,
      filterDestino,
      filterChofer
    ]
  );

  const filteredTotalSum = useMemo(
    () => filteredContracts.reduce((s, row) => s + (parseFloat(row.total_amount) || 0), 0),
    [filteredContracts]
  );

  const exportContractsToExcel = () => {
    const headers = [
      'No. Contrato',
      'Cliente',
      'Origen',
      'Destino',
      'Fecha Inicio',
      'Fecha Fin',
      'Monto',
      'Itinerario',
      'Tipo de unidad',
      'Chofer asignado'
    ];
    const lines = [headers.map(escapeCsvCell).join(',')];
    for (const row of filteredContracts) {
      const fd = (d) => (d && formatDateLocal(d) !== '-' ? formatDateLocal(d) : '');
      const drivers = getAssignedDriverNames(row);
      const record = [
        row.contract_number ?? '',
        row.client_name ?? '',
        row.origin ?? '',
        row.destination ?? '',
        fd(row.start_date),
        fd(row.end_date),
        parseFloat(row.total_amount) || 0,
        (row.itinerary ?? '').trim(),
        getUnitType(row),
        drivers.length ? drivers.join('; ') : ''
      ];
      lines.push(record.map(escapeCsvCell).join(','));
    }
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contratos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ message: 'Archivo descargado (ábrelo con Excel)', type: 'success' });
  };

  const getPaidAmount = (contractId) => {
    return (payments || [])
      .filter((p) => p.contract_id != null && p.contract_id == contractId)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  const getExpensesByConcept = (contractId) => {
    const list = (expenses || []).filter(
      (e) => e.contract_id != null && e.contract_id == contractId
    );
    const byConcept = {};
    for (const e of list) {
      const t = e.expense_type || 'Otro';
      byConcept[t] = (byConcept[t] || 0) + (parseFloat(e.amount) || 0);
    }
    return byConcept;
  };

  const getTotalExpenses = (contractId) => {
    const byConcept = getExpensesByConcept(contractId);
    return Object.values(byConcept).reduce((s, v) => s + v, 0);
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
      width: '140px',
      wrap: true,
      render: (row) => {
        const unit = getAssignedUnit(row);
        const drivers = getAssignedDriverNames(row);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.contract_number}</span>
            <span className="text-xs text-gray-500">{getUnitType(row)}</span>
            {unit && <span className="text-xs text-blue-600 font-medium">{unit}</span>}
            {drivers.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-0.5 pt-0.5 border-t border-gray-100">
                {drivers.map((name) => (
                  <span
                    key={name}
                    className="text-xs text-violet-800 flex items-start gap-1 leading-snug"
                  >
                    <User size={12} className="shrink-0 mt-0.5 opacity-80" aria-hidden />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }
    },
    { header: 'Cliente', accessor: 'client_name', maxWidth: '120px', wrap: true },
    { header: 'Origen', accessor: 'origin', maxWidth: '120px', wrap: true },
    {
      header: 'Destino',
      maxWidth: '120px',
      wrap: true,
      render: (row) => {
        const itin = (row.itinerary || '').replace(/\s+/g, ' ').trim();
        const preview =
          itin.length > 25 ? `${itin.slice(0, 25)}…` : itin;
        return (
          <div className="flex flex-col gap-0.5">
            <span>{row.destination || '—'}</span>
            {preview ? (
              <span className="text-[10px] text-gray-500 leading-snug break-words" title={itin}>
                {preview}
              </span>
            ) : null}
          </div>
        );
      }
    },
    { header: 'Fecha Inicio', render: (row) => formatDate(row.start_date), width: '95px' },
    { header: 'Fecha Fin', render: (row) => formatDate(row.end_date), width: '95px' },
    {
      header: 'Monto Total',
      headerRender: () => (
        <div className="flex flex-col gap-1 items-start">
          <span className="uppercase tracking-wider">Monto Total</span>
          {hasActiveFilters && (
            <span className="normal-case text-[11px] font-bold text-blue-800 tabular-nums leading-tight">
              Σ {formatCurrency(filteredTotalSum)}
            </span>
          )}
        </div>
      ),
      width: '170px',
      render: (row) => {
        const total = parseFloat(row.total_amount) || 0;
        const paid = getPaidAmount(row.id);
        const remaining = total - paid;
        const hasPayments = paid > 0;
        const byConcept = getExpensesByConcept(row.id);
        const totalExpenses = Object.values(byConcept).reduce((s, v) => s + v, 0);
        const hasExpenses = totalExpenses > 0;
        const utilidad = paid - totalExpenses;
        const pctUtilidad = paid > 0 ? ((utilidad / paid) * 100).toFixed(1) : null;

        const days =
          row.start_date && row.end_date
            ? diffInclusiveCalendarDays(row.start_date, row.end_date)
            : 0;
        const utilidadPorDia = days > 0 && hasPayments ? utilidad / days : null;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{formatCurrency(total)}</span>
            {hasPayments && (
              <>
                <span className="text-xs text-green-600">Abonado: {formatCurrency(paid)}</span>
                <span className="text-xs text-amber-600">Falta: {formatCurrency(remaining)}</span>
              </>
            )}
            {hasExpenses && (
              <>
                {Object.entries(byConcept).map(([tipo, monto]) => (
                  <span key={tipo} className="text-xs text-gray-600">
                    {tipo}: {formatCurrency(monto)}
                  </span>
                ))}
                <span className={`text-xs font-medium ${utilidad >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  Utilidad: {formatCurrency(utilidad)}
                  {pctUtilidad != null && ` (${pctUtilidad}%)`}
                </span>
              </>
            )}
            {utilidadPorDia != null && (
              <span className="text-xs text-blue-600 font-medium">
                Utilidad/día: {formatCurrency(utilidadPorDia)}
              </span>
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
          row.status === 'Por cobrar' ? 'bg-amber-100 text-amber-900' :
          row.status === 'Por pagar' ? 'bg-orange-100 text-orange-900' :
          row.status === 'En proceso' ? 'bg-yellow-100 text-yellow-900' :
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
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
              <option value="Por cobrar">Por cobrar</option>
              <option value="Por pagar">Por pagar</option>
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
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Chofer</label>
            <input
              type="text"
              placeholder="Nombre del chofer..."
              value={filterChofer}
              onChange={(e) => setFilterChofer(e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportContractsToExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg border border-emerald-700/20 touch-manipulation"
          >
            <FileSpreadsheet size={18} aria-hidden />
            Exportar a Excel
          </button>
          <span className="text-xs text-gray-600">
            {filteredContracts.length} registro{filteredContracts.length === 1 ? '' : 's'} (según filtros)
          </span>
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
            <Link
              to={driverPortalPath(row.contract_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 inline-flex"
              title="Portal chofer (gastos/efectivo)"
            >
              <Link2 size={18} />
            </Link>
            <button
              type="button"
              onClick={() => handleSyncCalendar(row)}
              disabled={syncingCalendarId === row.id}
              className={`transition-colors p-1 disabled:opacity-50 ${
                row.calendar_event_id
                  ? 'text-sky-700 hover:text-sky-900'
                  : 'text-sky-600 hover:text-sky-800'
              }`}
              title={
                row.calendar_event_id
                  ? 'Actualizar evento en Google Calendar'
                  : 'Crear evento en Google Calendar'
              }
            >
              <Calendar size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => copyDriverPortalLink(row.contract_number, setToast)}
              className="text-indigo-500 hover:text-indigo-700 transition-colors p-1"
              title="Copiar link portal chofer (WhatsApp)"
            >
              <Share2 size={18} />
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
        assignedDriverNames={
          editingContract?.id
            ? getAssignedDriverNames(
                contracts.find((c) => c.id === editingContract.id) || { id: editingContract.id, notes: null }
              )
            : []
        }
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
