import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContractService from '../components/ContractService';
import {
  getContracts,
  deleteContract,
  createContract,
  createAssignment,
  updateAssignment,
  deleteAssignment,
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
import Modal from '../components/Modal';
import Button from '../components/Button';
import { Link } from 'react-router-dom';
import { FileDown, Copy, Eye, Link2, Share2, User, FileSpreadsheet, Calendar, RefreshCw } from 'lucide-react';
import {
  buildPdfInfoFromRow,
  generateContractPdf,
  getContractBillingAmounts,
  getContractAmountDue
} from '../utils/contractPdfUtils';
import {
  formatDateLocal,
  formatDateWithWeekdayLocal,
  diffInclusiveCalendarDays
} from '../utils/formatDateLocal';
import {
  duplicateAssignmentIds,
  getPrimaryDriverNames,
  mergeAssignmentForEdit,
  pickPrimaryAssignment,
  resolveAssignmentIdForContract
} from '../utils/assignmentContractSync';
import TripSummaryModal from '../components/TripSummaryModal';

const driverPortalPath = (contractNumber) => `/c/${encodeURIComponent(contractNumber)}`;

/** Mensaje listo para WhatsApp con datos del servicio + URL del portal chofer. */
const copyDriverPortalLink = async (contractRow, setToast) => {
  const contractNumber = contractRow?.contract_number;
  if (!contractNumber) {
    setToast({ message: 'Este registro no tiene número de contrato', type: 'error' });
    return;
  }

  const fd = (d) => formatDateWithWeekdayLocal(d);
  const ini = fd(contractRow.start_date);
  const fin = fd(contractRow.end_date);
  let fechaServicio = '—';
  if (ini && fin && fin !== ini) fechaServicio = `${ini} al ${fin}`;
  else if (ini) fechaServicio = ini;

  const cliente = (contractRow.client_name || '').trim() || '—';
  const url = `${window.location.origin}/sistema${driverPortalPath(contractNumber)}`;

  const text = [
    'Registra tus gastos del servicio:',
    '',
    `Fecha del servicio: ${fechaServicio}`,
    `Cliente: ${cliente}`,
    `No. contrato: ${contractNumber}`,
    '',
    url
  ].join('\n');

  try {
    await navigator.clipboard.writeText(text);
    setToast({ message: 'Mensaje con link copiado al portapapeles', type: 'success' });
  } catch {
    setToast({ message: 'No se pudo copiar. Copie manualmente.', type: 'error' });
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

/** Query params de filtros (persisten al refrescar la página). */
const FILTER_PARAM = {
  fechaInicio: 'fi',
  fechaFin: 'ff',
  cliente: 'cliente',
  noContrato: 'contrato',
  estado: 'estado',
  destino: 'destino',
  chofer: 'chofer'
};

const Contracts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [isContratoServicioOpen, setIsContratoServicioOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  const filterFechaInicio = searchParams.get(FILTER_PARAM.fechaInicio) || '';
  const filterFechaFin = searchParams.get(FILTER_PARAM.fechaFin) || '';
  const filterCliente = searchParams.get(FILTER_PARAM.cliente) || '';
  const filterNoContrato = searchParams.get(FILTER_PARAM.noContrato) || '';
  const filterEstado = searchParams.get(FILTER_PARAM.estado) || '';
  const filterDestino = searchParams.get(FILTER_PARAM.destino) || '';
  const filterChofer = searchParams.get(FILTER_PARAM.chofer) || '';

  const setFilterParam = useCallback(
    (paramKey, value) => {
      const next = new URLSearchParams(searchParams);
      const v = value != null ? String(value) : '';
      if (v) next.set(paramKey, v);
      else next.delete(paramKey);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    Object.values(FILTER_PARAM).forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [summaryRow, setSummaryRow] = useState(null);
  const [syncingCalendarId, setSyncingCalendarId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportIncludeFinance, setExportIncludeFinance] = useState(true);
  const [exportIncludeExpenseBreakdown, setExportIncludeExpenseBreakdown] = useState(false);

  const fetchAssignments = async () => {
    const response = await getAssignments();
    setAssignments(response.data.data || []);
  };

  const fetchExpenses = async () => {
    const response = await getExpenses();
    setExpenses(response.data.data || []);
  };

  const fetchPayments = async () => {
    const response = await getPayments();
    setPayments(response.data.data || []);
  };

  const fetchContracts = async () => {
    const response = await getContracts();
    setContracts(response.data.data);
  };

  const refreshAllData = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      await Promise.all([fetchContracts(), fetchPayments(), fetchExpenses(), fetchAssignments()]);
    } catch (error) {
      console.error('Error refreshing contracts data:', error);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData({ initial: true });
  }, [refreshAllData]);

  const handleRefresh = async () => {
    await refreshAllData({ initial: false });
    setToast({ message: 'Datos actualizados', type: 'success' });
  };

  const handleSaveContract = async (payload) => {
    try {
      const statusMap = {
        quote_sent: 'Cotización enviada',
        purchase_order: 'Orden de compra',
        invoice_sent: 'Factura enviada',
        scheduled: 'Agendado',
        in_progress: 'En proceso',
        complete: 'Realizado',
        pending_collect: 'Por cobrar',
        pending_pay: 'Por pagar',
        cancelled: 'Cancelado'
      };

      const isContrato = payload.mode === 'contrato';
      const startDate = isContrato ? payload.departure : payload.serviceDate;
      const endDate = isContrato ? (payload.returnDate || payload.departure) : payload.serviceDate;

      let preservedNotes = {};
      if (editingContract?.id) {
        const prevRow = contracts.find((c) => c.id === editingContract.id);
        if (prevRow?.notes && typeof prevRow.notes === 'string') {
          try {
            const p = JSON.parse(prevRow.notes);
            if (p && typeof p === 'object' && !Array.isArray(p)) preservedNotes = { ...p };
          } catch {
            preservedNotes = {};
          }
        }
      }

      const kmCandidate = payload.adminKm;
      const kmNum =
        kmCandidate != null && kmCandidate !== '' && Number.isFinite(Number(kmCandidate))
          ? Number(kmCandidate)
          : NaN;

      const nextNotesObj = {
        ...preservedNotes,
        mode: payload.mode,
        contactName: payload.contactName || '',
        contactPhone: payload.contactPhone || '',
        referencias: payload.referencias || '',
        unitType: payload.unitType || '',
        departureTime: payload.departureTime || '',
        returnTime: payload.returnTime || '',
        serviceTime: payload.serviceTime || '',
        calendarEventMode: payload.calendarEventMode || 'dual',
        vehicle: payload.vehicle || null,
        uiNotes: payload.notes || ''
      };
      if (Number.isFinite(kmNum) && kmNum > 0) nextNotesObj.adminKm = kmNum;
      else delete nextNotesObj.adminKm;
      if (payload.includeIva) nextNotesObj.includeIva = true;
      else delete nextNotesObj.includeIva;
      if (payload.ivaPriceIncludesTax) nextNotesObj.ivaPriceIncludesTax = true;
      else delete nextNotesObj.ivaPriceIncludesTax;

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
        notes: JSON.stringify(nextNotesObj)
      };

      let contractId = editingContract?.id || null;
      if (editingContract?.id) {
        await updateContract(editingContract.id, contractData);
        setToast({ message: 'Contrato actualizado exitosamente', type: 'success' });
      } else {
        const created = await createContract(contractData);
        contractId = created.data?.data?.id ?? null;
        setToast({ message: 'Contrato guardado exitosamente', type: 'success' });
      }

      const a = payload.assignment;
      if (contractId && a?.driver_id) {
        const assignPayload = {
          contract_id: contractId,
          driver_id: a.driver_id,
          vehicle_id: a.vehicle_id || payload.vehicle?.id || null,
          assigned_date: a.assigned_date || null,
          driving_date: a.driving_date || null,
          external_company_id: null,
          notes: null
        };
        const assignmentId = resolveAssignmentIdForContract(contractId, a.id, assignments);
        let keptId = assignmentId;

        if (keptId) {
          await updateAssignment(keptId, assignPayload);
        } else {
          const created = await createAssignment(assignPayload);
          keptId = created.data?.data?.id ?? null;
        }

        const dupIds = duplicateAssignmentIds(contractId, keptId, assignments);
        for (const dupId of dupIds) {
          await deleteAssignment(dupId);
        }
      }

      setEditingContract(null);
      setIsContratoServicioOpen(false);
      await refreshAllData({ initial: false });
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
      'Cotización enviada': 'quote_sent',
      'Orden de compra': 'purchase_order',
      'Factura enviada': 'invoice_sent',
      Agendado: 'scheduled',
      'En proceso': 'in_progress',
      Realizado: 'complete',
      'Por cobrar': 'pending_collect',
      'Por pagar': 'pending_pay',
      Cancelado: 'cancelled'
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
      includeIva: Boolean(notesData.includeIva),
      ivaPriceIncludesTax: Boolean(notesData.ivaPriceIncludesTax),
      adminKm:
        notesData.adminKm != null && notesData.adminKm !== ''
          ? String(notesData.adminKm)
          : '',
      notes: notesData.uiNotes ?? notesData.notes ?? '',
      status: statusReverseMap[row.status] || 'scheduled',
      departure: mode === 'contrato' ? startDateStr : '',
      returnDate: mode === 'contrato' ? endDateStr : '',
      departureTime: notesData.departureTime || '',
      returnTime: notesData.returnTime || '',
      calendarEventMode: notesData.calendarEventMode || 'dual',
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
      'Cotización enviada': 'quote_sent',
      'Orden de compra': 'purchase_order',
      'Factura enviada': 'invoice_sent',
      Agendado: 'scheduled',
      'En proceso': 'in_progress',
      Realizado: 'complete',
      'Por cobrar': 'pending_collect',
      'Por pagar': 'pending_pay',
      Cancelado: 'cancelled'
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
      includeIva: Boolean(notesData.includeIva),
      ivaPriceIncludesTax: Boolean(notesData.ivaPriceIncludesTax),
      adminKm:
        notesData.adminKm != null && notesData.adminKm !== ''
          ? String(notesData.adminKm)
          : '',
      notes: notesData.uiNotes ?? notesData.notes ?? '',
      status: statusReverseMap[row.status] || 'scheduled',
      departure: mode === 'contrato' ? startDateStr : '',
      returnDate: mode === 'contrato' ? endDateStr : '',
      departureTime: notesData.departureTime || '',
      returnTime: notesData.returnTime || '',
      calendarEventMode: notesData.calendarEventMode || 'dual',
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
        await refreshAllData({ initial: false });
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
      await refreshAllData({ initial: false });
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

  /** Día + fecha en dos líneas para caber en columna estrecha (95px). */
  const renderDateWeekdayCell = (value) => {
    const full = formatDateWithWeekdayLocal(value);
    if (!full) return '-';
    const i = full.indexOf(' ');
    if (i < 0) return full;
    return (
      <span className="block leading-snug">
        <span className="block text-[11px] font-medium text-gray-800">{full.slice(0, i)}</span>
        <span className="block text-xs text-gray-700">{full.slice(i + 1)}</span>
      </span>
    );
  };

  const getUnitType = (row) => {
    try {
      const n = row.notes ? JSON.parse(row.notes) : {};
      return n.unitType || '-';
    } catch { return '-'; }
  };

  const getAssignedDriverNames = (row) =>
    getPrimaryDriverNames(row.id, assignments, row.notes);

  const getAssignmentForContractModal = (contractId) => {
    if (contractId == null) return null;
    const rows = assignments.filter((a) => String(a.contract_id) === String(contractId));
    const tableRow = pickPrimaryAssignment(rows);
    const contractRow = contracts.find((c) => String(c.id) === String(contractId));
    return mergeAssignmentForEdit(tableRow, contractRow?.notes);
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
    () => filteredContracts.reduce((s, row) => s + getContractAmountDue(row), 0),
    [filteredContracts]
  );

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

  const getAdminKmFromNotes = (row) => {
    try {
      const n = row?.notes ? JSON.parse(row.notes) : {};
      const v = Number(n.adminKm);
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  };

  const formatExpenseBreakdownForCsv = (contractId) => {
    const m = getExpensesByConcept(contractId);
    return Object.keys(m)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((k) => `${k}: ${(parseFloat(m[k]) || 0).toFixed(2)}`)
      .join(' | ');
  };

  const runContractsCsvExport = (includeFinance, includeExpenseBreakdown) => {
    const baseHeaders = [
      'No. Contrato',
      'Cliente',
      'Origen',
      'Destino',
      'Fecha Inicio',
      'Fecha Fin',
      'Monto cotizado',
      'Itinerario',
      'Tipo de unidad',
      'Chofer asignado',
      'Km admin',
      'Precio MXN/km (cotizado ÷ km)',
      'Precio MXN/km (cobrado ÷ km)'
    ];

    const financeHeaders = includeFinance
      ? [
          'Total cobrado',
          'Total egresos asignados al contrato',
          'Utilidad neta MXN',
          'Utilidad (montos + % sobre cobrado)',
          'Margen % sobre cobrado',
          'Días vigencia (calendario)',
          'Utilidad promedio por día MXN'
        ]
      : [];

    const expenseCol = includeExpenseBreakdown ? ['Egresos desglose por concepto'] : [];
    const headers = [...baseHeaders, ...financeHeaders, ...expenseCol];
    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const row of filteredContracts) {
      const fd = (d) => (d && formatDateLocal(d) !== '-' ? formatDateLocal(d) : '');
      const drivers = getAssignedDriverNames(row);
      const cotizadoNum = parseFloat(row.total_amount) || 0;
      const km = getAdminKmFromNotes(row);
      const cobradoNum = getPaidAmount(row.id);
      const gastosNum = getTotalExpenses(row.id);
      const precioLista = km ? Number((cotizadoNum / km).toFixed(4)) : '';
      const precioCobKm = km ? Number((cobradoNum / km).toFixed(4)) : '';

      const record = [
        row.contract_number ?? '',
        row.client_name ?? '',
        row.origin ?? '',
        row.destination ?? '',
        fd(row.start_date),
        fd(row.end_date),
        cotizadoNum,
        (row.itinerary ?? '').trim(),
        getUnitType(row),
        drivers.length ? drivers.join('; ') : '',
        km ?? '',
        precioLista,
        precioCobKm
      ];

      if (includeFinance) {
        const utilidad = cobradoNum - gastosNum;
        const diasRaw = diffInclusiveCalendarDays(
          row.start_date,
          row.end_date || row.start_date
        );
        const dias = diasRaw >= 1 ? diasRaw : 1;
        const pct = cobradoNum > 0 ? (utilidad / cobradoNum) * 100 : null;
        const pctDisplay = pct != null && Number.isFinite(pct) ? Number(pct.toFixed(2)) : '';
        const utilidadTexto =
          pct != null && Number.isFinite(pct)
            ? `${formatCurrency(utilidad)} (${pct.toFixed(1)}%)`
            : `${formatCurrency(utilidad)} (sin cobrado para %)`;
        record.push(
          cobradoNum,
          gastosNum,
          utilidad,
          utilidadTexto,
          pctDisplay,
          dias,
          Number((utilidad / dias).toFixed(2))
        );
      }

      if (includeExpenseBreakdown) {
        record.push(formatExpenseBreakdownForCsv(row.id));
      }

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
    {
      header: 'Fecha Inicio',
      render: (row) => renderDateWeekdayCell(row.start_date),
      width: '95px',
      wrap: true
    },
    {
      header: 'Fecha Fin',
      render: (row) => renderDateWeekdayCell(row.end_date),
      width: '95px',
      wrap: true
    },
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
        const billing = getContractBillingAmounts(row);
        const amountDue = billing.grandTotal;
        const paid = getPaidAmount(row.id);
        const remaining = amountDue - paid;
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
            <span className="font-medium">{formatCurrency(amountDue)}</span>
            {billing.includeIva && (
              <span className="text-[11px] text-gray-500 leading-snug">
                Subtotal {formatCurrency(billing.subtotal)} + IVA {formatCurrency(billing.iva)}
              </span>
            )}
            {hasPayments && (
              <>
                <span className="text-xs text-green-600">Abonado: {formatCurrency(paid)}</span>
                <span
                  className={`text-xs font-medium ${
                    remaining > 0.01
                      ? 'text-amber-600'
                      : remaining < -0.01
                        ? 'text-red-600'
                        : 'text-green-700'
                  }`}
                >
                  Falta: {formatCurrency(remaining)}
                </span>
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
          row.status === 'Cotización enviada' ? 'bg-sky-100 text-sky-900' :
          row.status === 'Orden de compra' ? 'bg-indigo-100 text-indigo-900' :
          row.status === 'Factura enviada' ? 'bg-teal-100 text-teal-900' :
          row.status === 'Agendado' ? 'bg-green-100 text-green-800' :
          row.status === 'Realizado' ? 'bg-blue-100 text-blue-800' :
          row.status === 'Por cobrar' ? 'bg-amber-100 text-amber-900' :
          row.status === 'Por pagar' ? 'bg-orange-100 text-orange-900' :
          row.status === 'En proceso' ? 'bg-yellow-100 text-yellow-900' :
          row.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
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
              onChange={(e) => setFilterParam(FILTER_PARAM.fechaInicio, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
            <input
              type="date"
              value={filterFechaFin}
              onChange={(e) => setFilterParam(FILTER_PARAM.fechaFin, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterCliente}
              onChange={(e) => setFilterParam(FILTER_PARAM.cliente, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">No. contrato</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterNoContrato}
              onChange={(e) => setFilterParam(FILTER_PARAM.noContrato, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterParam(FILTER_PARAM.estado, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            >
              <option value="">Todos</option>
              <option value="Cotización enviada">Cotización enviada</option>
              <option value="Orden de compra">Orden de compra</option>
              <option value="Factura enviada">Factura enviada</option>
              <option value="Agendado">Agendado</option>
              <option value="En proceso">En proceso</option>
              <option value="Realizado">Realizado</option>
              <option value="Por cobrar">Por cobrar</option>
              <option value="Por pagar">Por pagar</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={filterDestino}
              onChange={(e) => setFilterParam(FILTER_PARAM.destino, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Chofer</label>
            <input
              type="text"
              placeholder="Nombre del chofer..."
              value={filterChofer}
              onChange={(e) => setFilterParam(FILTER_PARAM.chofer, e.target.value)}
              className="w-full min-h-[44px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 sm:py-1.5 touch-manipulation"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-800 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 touch-manipulation disabled:opacity-60"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} aria-hidden />
            {refreshing ? 'Actualizando…' : 'Actualizar datos'}
          </button>
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg border border-emerald-700/20 touch-manipulation"
          >
            <FileSpreadsheet size={18} aria-hidden />
            Exportar a Excel
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-900 underline touch-manipulation"
            >
              Limpiar filtros
            </button>
          )}
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
                row.calendar_event_id || row.calendar_return_event_id
                  ? 'text-sky-700 hover:text-sky-900'
                  : 'text-sky-600 hover:text-sky-800'
              }`}
              title={
                row.calendar_event_id || row.calendar_return_event_id
                  ? 'Actualizar evento(s) en Google Calendar (salida y regreso si aplica)'
                  : 'Crear evento(s) en Google Calendar (2 eventos si el viaje es de varios días)'
              }
            >
              <Calendar size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => copyDriverPortalLink(row, setToast)}
              className="text-indigo-500 hover:text-indigo-700 transition-colors p-1"
              title="Copiar mensaje + link portal chofer (WhatsApp)"
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

      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exportar a Excel (CSV)"
        size="md"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Se exportan{' '}
            <strong>{filteredContracts.length}</strong> fila
            {filteredContracts.length === 1 ? '' : 's'} con los filtros actuales de la tabla.
          </p>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={exportIncludeFinance}
              onChange={(e) => setExportIncludeFinance(e.target.checked)}
            />
            <span>
              Incluir <strong>columnas económicas</strong>: total cobrado, egresos asignados al
              contrato, utilidad (cobrado − egresos), texto tipo &quot;$3,634.00 (40.4%)&quot;, margen %
              sobre cobrado, días de vigencia y <strong>utilidad promedio por día</strong> (misma
              cifra por día de servicio en calendario).
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={exportIncludeExpenseBreakdown}
              onChange={(e) => setExportIncludeExpenseBreakdown(e.target.checked)}
            />
            <span>
              Incluir <strong>columna de desglose de egresos</strong> por tipo (texto), p. ej.{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">Combustible: 100.00 | Casetas: 50.00</code>
            </span>
          </label>
          <p className="text-xs text-gray-500 leading-relaxed">
            Siempre se añaden <strong>Km admin</strong> y precios por km cuando registraste kilometraje
            en el contrato (uso interno, no aparece en PDF cliente). El CSV incluye precio cotizado÷km y
            cobrado÷km para comparar con lo facturado o con margen objetivo por km-ruta en tu operación.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setExportModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              type="button"
              onClick={() => {
                runContractsCsvExport(exportIncludeFinance, exportIncludeExpenseBreakdown);
                setExportModalOpen(false);
              }}
            >
              Descargar CSV
            </Button>
          </div>
        </div>
      </Modal>

      <ContractService
        key={editingContract?.id ?? 'new'}
        isOpen={isContratoServicioOpen}
        onClose={() => {
          setIsContratoServicioOpen(false);
          setEditingContract(null);
        }}
        onSave={handleSaveContract}
        editingContract={editingContract}
        initialAssignment={
          editingContract?.id ? getAssignmentForContractModal(editingContract.id) : null
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
