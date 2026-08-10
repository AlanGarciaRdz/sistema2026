import React, { useState, useEffect, useCallback } from 'react';
import {
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getMaintenanceFleet,
  updateVehicleMileage,
  createServiceItem,
  updateServiceItem,
  deleteServiceItem,
  getIncidentReports,
  createIncidentReport,
  updateIncidentReport,
  deleteIncidentReport,
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
import VehicleFleetCard from '../components/maintenance/VehicleFleetCard';
import { copyVehicleReportPortalLink } from '../utils/vehicleReportPortal';
import {
  ITEM_KIND_PRESETS,
  SERVICE_KIND_OPTIONS,
  formatKm,
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS
} from '../utils/maintenanceStatus';

const TABS = [
  { id: 'fleet', label: 'Flota y alertas' },
  { id: 'history', label: 'Historial' }
];

const emptyMaintenanceForm = () => ({
  vehicle_id: '',
  maintenance_date: new Date().toISOString().split('T')[0],
  mileage: '',
  maintenance_type: '',
  cost: '',
  payment_account_id: '',
  notes: '',
  service_item_id: '',
  next_service_km: '',
  interval_km: ''
});

const emptyServiceItemForm = () => ({
  vehicle_id: '',
  title: '',
  item_kind: 'oil',
  next_due_km: '',
  warn_before_km: 5000,
  critical_before_km: 2000,
  interval_km: '',
  last_service_km: '',
  last_service_date: '',
  notes: ''
});

const emptyIncidentForm = () => ({
  vehicle_id: '',
  report_date: new Date().toISOString().split('T')[0],
  reported_by: '',
  report_type: 'crash',
  title: '',
  description: '',
  severity: 'moderate',
  mileage: '',
  status: 'open',
  resolution_notes: ''
});

const Maintenance = () => {
  const [tab, setTab] = useState('fleet');
  const [fleet, setFleet] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [savingMileageId, setSavingMileageId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingServiceItem, setEditingServiceItem] = useState(null);
  const [editingIncident, setEditingIncident] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState(emptyMaintenanceForm());
  const [serviceForm, setServiceForm] = useState(emptyServiceItemForm());
  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm());
  const [historyVehicleFilter, setHistoryVehicleFilter] = useState('');
  const [historyUnitSearch, setHistoryUnitSearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  const fetchFleet = useCallback(async () => {
    try {
      setLoadingFleet(true);
      const response = await getMaintenanceFleet();
      setFleet(response.data?.data?.vehicles || []);
    } catch (error) {
      console.error('Error loading fleet:', error);
      setFleet([]);
      setToast({ message: 'Error al cargar flota', type: 'error' });
    } finally {
      setLoadingFleet(false);
    }
  }, []);

  const fetchMaintenance = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await getMaintenance();
      setMaintenance(response.data.data || []);
    } catch (error) {
      setToast({ message: 'Error al cargar mantenimientos', type: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchIncidentReports = useCallback(async () => {
    try {
      const response = await getIncidentReports();
      setIncidentReports(response.data?.data || []);
    } catch (error) {
      console.warn('Incident reports not available:', error);
      setIncidentReports([]);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    fetchMaintenance();
    fetchIncidentReports();
    getVehicles()
      .then((r) => setVehicles(r.data.data || []))
      .catch(() => {});
    getPaymentAccounts()
      .then((r) => setAccounts(r.data.data || []))
      .catch(() => {});
  }, [fetchFleet, fetchMaintenance, fetchIncidentReports]);

  const refreshAll = () => {
    fetchFleet();
    fetchMaintenance();
    fetchIncidentReports();
  };

  const handleSaveMileage = async (vehicleId, km, kmDate) => {
    try {
      setSavingMileageId(vehicleId);
      const res = await updateVehicleMileage(vehicleId, {
        current_mileage: km,
        current_mileage_at: kmDate || new Date().toISOString().split('T')[0]
      });
      setToast({
        message: res.data.history_logged
          ? 'Kilometraje guardado y registrado en historial'
          : 'Kilometraje actualizado',
        type: 'success'
      });
      refreshAll();
    } catch {
      setToast({ message: 'Error al guardar kilometraje', type: 'error' });
    } finally {
      setSavingMileageId(null);
    }
  };

  const openServiceItemModal = (vehicle, item = null) => {
    setEditingServiceItem(item);
    if (item) {
      setServiceForm({
        vehicle_id: vehicle.id,
        title: item.title || '',
        item_kind: item.item_kind || 'custom',
        next_due_km: item.next_due_km ?? '',
        warn_before_km: item.warn_before_km ?? 5000,
        critical_before_km: item.critical_before_km ?? 2000,
        interval_km: item.interval_km ?? '',
        last_service_km: item.last_service_km ?? '',
        last_service_date: item.last_service_date
          ? String(item.last_service_date).slice(0, 10)
          : '',
        notes: item.notes || ''
      });
    } else {
      const preset = ITEM_KIND_PRESETS.oil;
      setServiceForm({
        ...emptyServiceItemForm(),
        vehicle_id: vehicle.id,
        title: preset.title,
        item_kind: 'oil',
        interval_km: preset.interval_km,
        warn_before_km: preset.warn_before_km,
        critical_before_km: preset.critical_before_km
      });
    }
    setIsServiceModalOpen(true);
  };

  const applyServiceKindPreset = (kind) => {
    const preset = ITEM_KIND_PRESETS[kind] || ITEM_KIND_PRESETS.custom;
    setServiceForm((prev) => {
      const next = {
        ...prev,
        item_kind: kind,
        title: preset.title || prev.title,
        interval_km: preset.interval_km ?? prev.interval_km,
        warn_before_km: preset.warn_before_km,
        critical_before_km: preset.critical_before_km
      };
      return suggestNextDueKm(next);
    });
  };

  const suggestNextDueKm = (form) => {
    const last = form.last_service_km ? parseInt(form.last_service_km, 10) : null;
    const interval = form.interval_km ? parseInt(form.interval_km, 10) : null;
    if (Number.isFinite(last) && Number.isFinite(interval)) {
      return { ...form, next_due_km: String(last + interval) };
    }
    return form;
  };

  const patchServiceForm = (patch) => {
    setServiceForm((prev) => suggestNextDueKm({ ...prev, ...patch }));
  };

  const handleServiceItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_id: serviceForm.vehicle_id,
        title: serviceForm.title,
        item_kind: serviceForm.item_kind,
        next_due_km: serviceForm.next_due_km ? parseInt(serviceForm.next_due_km, 10) : null,
        warn_before_km: parseInt(serviceForm.warn_before_km, 10) || 5000,
        critical_before_km: parseInt(serviceForm.critical_before_km, 10) || 2000,
        interval_km: serviceForm.interval_km ? parseInt(serviceForm.interval_km, 10) : null,
        last_service_km: serviceForm.last_service_km
          ? parseInt(serviceForm.last_service_km, 10)
          : null,
        last_service_date: serviceForm.last_service_date || null,
        notes: serviceForm.notes || null
      };
      if (editingServiceItem) {
        const res = await updateServiceItem(editingServiceItem.id, payload);
        setToast({
          message: res.data.history_logged
            ? 'Servicio actualizado y registrado en historial'
            : 'Servicio programado actualizado',
          type: 'success'
        });
      } else {
        const res = await createServiceItem(payload);
        setToast({
          message: res.data.history_logged
            ? 'Servicio agregado y registrado en historial'
            : 'Servicio programado agregado',
          type: 'success'
        });
      }
      setIsServiceModalOpen(false);
      setEditingServiceItem(null);
      refreshAll();
    } catch {
      setToast({ message: 'Error al guardar servicio programado', type: 'error' });
    }
  };

  const handleDeleteServiceItem = async () => {
    if (!editingServiceItem || !window.confirm('¿Desactivar este servicio programado?')) return;
    try {
      await deleteServiceItem(editingServiceItem.id);
      setToast({ message: 'Servicio eliminado', type: 'success' });
      setIsServiceModalOpen(false);
      setEditingServiceItem(null);
      fetchFleet();
    } catch {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const openIncidentModal = (vehicle, report = null) => {
    setEditingIncident(report);
    if (report) {
      setIncidentForm({
        vehicle_id: vehicle.id,
        report_date: report.report_date ? String(report.report_date).slice(0, 10) : '',
        reported_by: report.reported_by || '',
        report_type: report.report_type || 'other',
        title: report.title || '',
        description: report.description || '',
        severity: report.severity || 'moderate',
        mileage: report.mileage != null ? String(report.mileage) : '',
        status: report.status || 'open',
        resolution_notes: report.resolution_notes || ''
      });
    } else {
      setIncidentForm({
        ...emptyIncidentForm(),
        vehicle_id: vehicle.id,
        mileage: vehicle.current_mileage != null ? String(vehicle.current_mileage) : ''
      });
    }
    setIsIncidentModalOpen(true);
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_id: incidentForm.vehicle_id,
        report_date: incidentForm.report_date,
        reported_by: incidentForm.reported_by.trim(),
        report_type: incidentForm.report_type,
        title: incidentForm.title.trim(),
        description: incidentForm.description.trim() || null,
        severity: incidentForm.severity,
        mileage: incidentForm.mileage ? parseInt(incidentForm.mileage, 10) : null,
        status: incidentForm.status,
        resolution_notes: incidentForm.resolution_notes.trim() || null
      };
      if (editingIncident) {
        await updateIncidentReport(editingIncident.id, payload);
        setToast({ message: 'Reporte actualizado', type: 'success' });
      } else {
        await createIncidentReport(payload);
        setToast({ message: 'Reporte registrado', type: 'success' });
      }
      setIsIncidentModalOpen(false);
      setEditingIncident(null);
      refreshAll();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Error al guardar reporte';
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleDeleteIncident = async () => {
    if (!editingIncident || !window.confirm('¿Eliminar este reporte?')) return;
    try {
      await deleteIncidentReport(editingIncident.id);
      setToast({ message: 'Reporte eliminado', type: 'success' });
      setIsIncidentModalOpen(false);
      setEditingIncident(null);
      refreshAll();
    } catch {
      setToast({ message: 'Error al eliminar reporte', type: 'error' });
    }
  };

  const openMaintenanceModal = (vehicle = null, serviceItem = null) => {
    setEditingRecord(null);
    const base = emptyMaintenanceForm();
    if (vehicle) {
      base.vehicle_id = vehicle.id;
      base.mileage = vehicle.current_mileage != null ? String(vehicle.current_mileage) : '';
    }
    if (serviceItem) {
      base.service_item_id = serviceItem.id;
      base.maintenance_type = serviceItem.title;
      base.interval_km = serviceItem.interval_km != null ? String(serviceItem.interval_km) : '';
      if (serviceItem.next_due_km != null) {
        base.next_service_km = String(serviceItem.next_due_km);
      }
    }
    setFormData(base);
    setIsModalOpen(true);
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
        notes: formData.notes || null,
        service_item_id: formData.service_item_id || null,
        next_service_km: formData.next_service_km
          ? parseInt(formData.next_service_km, 10)
          : null,
        interval_km: formData.interval_km ? parseInt(formData.interval_km, 10) : null
      };

      if (editingRecord) {
        await updateMaintenance(editingRecord.id, payload);
        setToast({ message: 'Mantenimiento actualizado', type: 'success' });
      } else {
        await createMaintenance(payload);
        setToast({ message: 'Mantenimiento registrado', type: 'success' });
      }
      setIsModalOpen(false);
      resetForm();
      refreshAll();
    } catch {
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
      notes: record.notes || '',
      service_item_id: record.service_item_id || '',
      next_service_km: record.next_service_km ?? '',
      interval_km: record.interval_km ?? ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (record) => {
    if (!window.confirm('¿Eliminar este registro de mantenimiento?')) return;
    try {
      await deleteMaintenance(record.id);
      setToast({ message: 'Mantenimiento eliminado', type: 'success' });
      refreshAll();
    } catch {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData(emptyMaintenanceForm());
    setEditingRecord(null);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const getVehicleLabel = (row) => {
    if (row.vehicle_label) return row.vehicle_label;
    if (row.vehicle_code) return row.vehicle_code;
    if (row.license_plate) return row.license_plate;
    const v = vehicles.find((ve) => ve.id === row.vehicle_id);
    return v
      ? `${v.vehicle_code || v.license_plate || ''} ${v.brand || ''} ${v.model || ''}`.trim() || '-'
      : '-';
  };

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.vehicle_code || v.license_plate || 'Sin código'} - ${v.brand || ''} ${v.model || ''} (${v.license_plate || '-'})`.trim()
  }));

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.account_name} (${a.bank_name || '-'})`
  }));

  const serviceItemsForVehicle = (vehicleId) => {
    const v = fleet.find((f) => f.id === parseInt(vehicleId, 10));
    return (v?.service_items || []).map((it) => ({ value: it.id, label: it.title }));
  };

  const columns = [
    {
      header: 'Unidad',
      accessor: 'vehicle_label',
      render: (row) => getVehicleLabel(row)
    },
    { header: 'Fecha', accessor: 'maintenance_date', render: (row) => formatDate(row.maintenance_date) },
    {
      header: 'Km',
      accessor: 'mileage',
      render: (row) => (row.mileage != null ? row.mileage.toLocaleString() : '-')
    },
    { header: 'Servicio', accessor: 'maintenance_type' },
    {
      header: 'Próximo km',
      accessor: 'next_service_km',
      render: (row) => formatKm(row.next_service_km)
    },
    { header: 'Costo', accessor: 'cost', render: (row) => formatCurrency(row.cost) },
    { header: 'Cuenta', accessor: 'account_name' }
  ];

  const incidentColumns = [
    {
      header: 'Unidad',
      accessor: 'vehicle_label',
      render: (row) => row.vehicle_label || getVehicleLabel(row)
    },
    { header: 'Fecha', accessor: 'report_date', render: (row) => formatDate(row.report_date) },
    {
      header: 'Tipo',
      accessor: 'report_type',
      render: (row) => INCIDENT_TYPE_LABELS[row.report_type] || row.report_type
    },
    { header: 'Título', accessor: 'title' },
    { header: 'Reportó', accessor: 'reported_by' },
    {
      header: 'Gravedad',
      accessor: 'severity',
      render: (row) => INCIDENT_SEVERITY_LABELS[row.severity] || row.severity
    },
    {
      header: 'Estado',
      accessor: 'status',
      render: (row) => INCIDENT_STATUS_LABELS[row.status] || row.status
    },
    {
      header: 'Km',
      accessor: 'mileage',
      render: (row) => (row.mileage != null ? row.mileage.toLocaleString() : '-')
    }
  ];

  const sortedFleet = [...fleet].sort((a, b) => {
    const rank = { overdue: 4, critical: 3, warning: 2, ok: 1, unknown: 0 };
    return (rank[b.fleet_status] || 0) - (rank[a.fleet_status] || 0);
  });

  const filteredMaintenance = maintenance.filter((row) => {
    if (historyVehicleFilter && String(row.vehicle_id) !== String(historyVehicleFilter)) {
      return false;
    }
    const q = historyUnitSearch.trim().toLowerCase();
    if (!q) return true;
    const label = getVehicleLabel(row).toLowerCase();
    const plate = String(row.license_plate || '').toLowerCase();
    const code = String(row.vehicle_code || '').toLowerCase();
    return label.includes(q) || plate.includes(q) || code.includes(q);
  });

  const filteredIncidents = incidentReports.filter((row) => {
    if (historyVehicleFilter && String(row.vehicle_id) !== String(historyVehicleFilter)) {
      return false;
    }
    const q = historyUnitSearch.trim().toLowerCase();
    if (!q) return true;
    const label = (row.vehicle_label || getVehicleLabel(row)).toLowerCase();
    const plate = String(row.license_plate || '').toLowerCase();
    const code = String(row.vehicle_code || '').toLowerCase();
    const title = String(row.title || '').toLowerCase();
    return label.includes(q) || plate.includes(q) || code.includes(q) || title.includes(q);
  });

  const historyFilterActive =
    historyVehicleFilter || historyUnitSearch.trim() || historyTypeFilter !== 'all';

  if (loadingFleet && loadingHistory && !fleet.length) return <Loading />;

  return (
    <div className="p-6">
      <Header title="Mantenimiento">
        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          + Registrar servicio
        </Button>
      </Header>

      <p className="mb-4 max-w-3xl text-sm text-gray-600">
        Las alertas comparan el <strong>km actual de la unidad</strong> contra el <strong>próximo
        servicio</strong> de cada ítem. Captura el odómetro de hoy arriba en cada tarjeta (ej. 165,601).
        El próximo km debe ser último servicio + intervalo (ej. 155,601 + 10,000 = 165,601). Amarillo
        y rojo según los km que configures antes del vencimiento.
      </p>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fleet' && (
        <>
          {loadingFleet ? (
            <Loading />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedFleet.map((vehicle) => (
                <VehicleFleetCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  savingMileage={savingMileageId === vehicle.id}
                  onSaveMileage={handleSaveMileage}
                  onAddServiceItem={openServiceItemModal}
                  onEditServiceItem={openServiceItemModal}
                  onRegisterMaintenance={openMaintenanceModal}
                  onAddIncidentReport={openIncidentModal}
                  onEditIncidentReport={openIncidentModal}
                  onCopyReportLink={(vehicle) => copyVehicleReportPortalLink(vehicle, setToast)}
                />
              ))}
            </div>
          )}
          {!loadingFleet && sortedFleet.length === 0 && (
            <p className="text-center text-gray-500">No hay vehículos activos registrados.</p>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Filtrar historial
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-600">Tipo</label>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="all">Servicios y reportes</option>
                  <option value="services">Solo servicios</option>
                  <option value="reports">Solo reportes / incidentes</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-600">Unidad</label>
                <select
                  value={historyVehicleFilter}
                  onChange={(e) => setHistoryVehicleFilter(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Todas las unidades</option>
                  {vehicleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Buscar unidad
                </label>
                <input
                  type="text"
                  placeholder="Código, placas, modelo..."
                  value={historyUnitSearch}
                  onChange={(e) => setHistoryUnitSearch(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                {historyFilterActive && (
                  <Button
                    variant="secondary"
                    className="min-h-[44px]"
                    onClick={() => {
                      setHistoryVehicleFilter('');
                      setHistoryUnitSearch('');
                      setHistoryTypeFilter('all');
                    }}
                  >
                    Limpiar
                  </Button>
                )}
                <p className="pb-2 text-sm text-gray-500">
                  {filteredMaintenance.length} servicios · {filteredIncidents.length} reportes
                </p>
              </div>
            </div>
          </div>
          {loadingHistory ? (
            <Loading />
          ) : (
            <>
              {(historyTypeFilter === 'all' || historyTypeFilter === 'services') && (
                <div className="mb-6">
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">
                    Servicios y mantenimiento
                  </h3>
                  <Table
                    columns={columns}
                    data={filteredMaintenance}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    sortable
                  />
                  {maintenance.length > 0 && filteredMaintenance.length === 0 && (
                    <p className="mt-2 text-center text-sm text-gray-500">
                      No hay servicios con ese filtro.
                    </p>
                  )}
                </div>
              )}
              {(historyTypeFilter === 'all' || historyTypeFilter === 'reports') && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">
                    Reportes e incidentes
                  </h3>
                  <Table
                    columns={incidentColumns}
                    data={filteredIncidents}
                    onEdit={(row) => {
                      const v = fleet.find((f) => f.id === row.vehicle_id) || {
                        id: row.vehicle_id
                      };
                      openIncidentModal(v, row);
                    }}
                    onDelete={async (row) => {
                      if (!window.confirm('¿Eliminar este reporte?')) return;
                      try {
                        await deleteIncidentReport(row.id);
                        setToast({ message: 'Reporte eliminado', type: 'success' });
                        refreshAll();
                      } catch {
                        setToast({ message: 'Error al eliminar reporte', type: 'error' });
                      }
                    }}
                    sortable
                  />
                  {incidentReports.length > 0 && filteredIncidents.length === 0 && (
                    <p className="mt-2 text-center text-sm text-gray-500">
                      No hay reportes con ese filtro.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setEditingServiceItem(null);
        }}
        title={editingServiceItem ? 'Editar servicio programado' : 'Agregar servicio programado'}
        size="md"
      >
        <form onSubmit={handleServiceItemSubmit} className="space-y-4">
          <FormSelect
            label="Tipo"
            value={serviceForm.item_kind}
            onChange={(e) => applyServiceKindPreset(e.target.value)}
            options={SERVICE_KIND_OPTIONS}
          />
          <FormInput
            label="Nombre"
            value={serviceForm.title}
            onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
            required
          />
          <FormInput
            label="Último servicio (km)"
            type="number"
            value={serviceForm.last_service_km}
            onChange={(e) => patchServiceForm({ last_service_km: e.target.value })}
          />
          <p className="text-xs text-gray-500 -mt-2">
            Al cambiar el km o la fecha del último servicio y guardar, se agrega una entrada en la
            pestaña <strong>Historial</strong> para análisis futuro (cargas de AdBlue, aceite, etc.).
          </p>
          <FormInput
            label="Intervalo después del servicio (km)"
            type="number"
            value={serviceForm.interval_km}
            onChange={(e) => patchServiceForm({ interval_km: e.target.value })}
            placeholder="Ej. 10000 aceite, 30000 frenos"
          />
          <FormInput
            label="Próximo servicio (km) = último + intervalo"
            type="number"
            value={serviceForm.next_due_km}
            onChange={(e) => setServiceForm({ ...serviceForm, next_due_km: e.target.value })}
            placeholder="Se calcula solo al llenar último + intervalo"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Alerta amarilla (km antes)"
              type="number"
              value={serviceForm.warn_before_km}
              onChange={(e) => setServiceForm({ ...serviceForm, warn_before_km: e.target.value })}
            />
            <FormInput
              label="Alerta roja (km antes)"
              type="number"
              value={serviceForm.critical_before_km}
              onChange={(e) => setServiceForm({ ...serviceForm, critical_before_km: e.target.value })}
            />
          </div>
          <FormInput
            label="Fecha último servicio"
            type="date"
            value={serviceForm.last_service_date}
            onChange={(e) => setServiceForm({ ...serviceForm, last_service_date: e.target.value })}
          />
          <FormInput
            label="Notas"
            value={serviceForm.notes}
            onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
          />
          <div className="flex justify-between gap-3 border-t pt-4">
            <div>
              {editingServiceItem && (
                <Button variant="secondary" type="button" onClick={handleDeleteServiceItem}>
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={() => setIsServiceModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Guardar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingRecord ? 'Editar servicio' : 'Registrar servicio'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Unidad"
            value={formData.vehicle_id}
            onChange={(e) =>
              setFormData({ ...formData, vehicle_id: e.target.value, service_item_id: '' })
            }
            options={vehicleOptions}
            required
          />

          {formData.vehicle_id && serviceItemsForVehicle(formData.vehicle_id).length > 0 && (
            <FormSelect
              label="Vincular a servicio programado (opcional)"
              value={formData.service_item_id}
              onChange={(e) => {
                const id = e.target.value;
                const item = fleet
                  .find((f) => f.id === parseInt(formData.vehicle_id, 10))
                  ?.service_items?.find((it) => String(it.id) === String(id));
                setFormData({
                  ...formData,
                  service_item_id: id,
                  maintenance_type: item?.title || formData.maintenance_type,
                  interval_km:
                    item?.interval_km != null ? String(item.interval_km) : formData.interval_km
                });
              }}
              options={[
                { value: '', label: '— Ninguno —' },
                ...serviceItemsForVehicle(formData.vehicle_id)
              ]}
            />
          )}

          <FormInput
            label="Fecha"
            type="date"
            value={formData.maintenance_date}
            onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
            required
          />

          <FormInput
            label="Kilometraje al servicio"
            type="number"
            value={formData.mileage}
            onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
            placeholder="Km del odómetro"
          />

          <FormInput
            label="Tipo de servicio"
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            placeholder="Ej. Frenos delanteros, cambio aceite..."
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Próximo servicio (km)"
              type="number"
              value={formData.next_service_km}
              onChange={(e) => setFormData({ ...formData, next_service_km: e.target.value })}
              placeholder="Si vacío, usa intervalo"
            />
            <FormInput
              label="Intervalo (km)"
              type="number"
              value={formData.interval_km}
              onChange={(e) => setFormData({ ...formData, interval_km: e.target.value })}
              placeholder="Ej. 30000"
            />
          </div>

          <FormInput
            label="Detalle del servicio"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Balatas, discos, mano de obra, purgado..."
          />

          <FormInput
            label="Costo"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
          />

          <FormSelect
            label="Cuenta (opcional — genera egreso)"
            value={formData.payment_account_id}
            onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
            options={accountOptions}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingRecord ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setEditingIncident(null);
        }}
        title={editingIncident ? 'Editar reporte' : 'Reportar incidente'}
        size="md"
      >
        <form onSubmit={handleIncidentSubmit} className="space-y-4">
          <FormInput
            label="Fecha del incidente"
            type="date"
            value={incidentForm.report_date}
            onChange={(e) => setIncidentForm({ ...incidentForm, report_date: e.target.value })}
            required
          />
          <FormInput
            label="Quién reporta"
            value={incidentForm.reported_by}
            onChange={(e) => setIncidentForm({ ...incidentForm, reported_by: e.target.value })}
            placeholder="Nombre del chofer, encargado, taller..."
            required
          />
          <FormSelect
            label="Tipo de reporte"
            value={incidentForm.report_type}
            onChange={(e) => setIncidentForm({ ...incidentForm, report_type: e.target.value })}
            options={Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => ({
              value,
              label
            }))}
          />
          <FormInput
            label="Resumen (título)"
            value={incidentForm.title}
            onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
            placeholder="Ej. Golpe en puerta lateral derecha"
            required
          />
          <FormInput
            label="Descripción detallada"
            value={incidentForm.description}
            onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
            placeholder="Qué pasó, dónde, daños visibles..."
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Gravedad"
              value={incidentForm.severity}
              onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
              options={Object.entries(INCIDENT_SEVERITY_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
            />
            <FormSelect
              label="Estado"
              value={incidentForm.status}
              onChange={(e) => setIncidentForm({ ...incidentForm, status: e.target.value })}
              options={Object.entries(INCIDENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label
              }))}
            />
          </div>
          <FormInput
            label="Km al momento del incidente (opcional)"
            type="number"
            value={incidentForm.mileage}
            onChange={(e) => setIncidentForm({ ...incidentForm, mileage: e.target.value })}
          />
          {(incidentForm.status === 'resolved' || incidentForm.status === 'in_review') && (
            <FormInput
              label="Seguimiento / resolución"
              value={incidentForm.resolution_notes}
              onChange={(e) =>
                setIncidentForm({ ...incidentForm, resolution_notes: e.target.value })
              }
              placeholder="Reparación, taller, pendientes..."
            />
          )}
          <div className="flex justify-between gap-3 border-t pt-4">
            <div>
              {editingIncident && (
                <Button variant="secondary" type="button" onClick={handleDeleteIncident}>
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setIsIncidentModalOpen(false);
                  setEditingIncident(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {editingIncident ? 'Actualizar' : 'Guardar reporte'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Maintenance;
