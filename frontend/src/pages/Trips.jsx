import React, { useEffect, useMemo, useState } from 'react';
import { getAssignments, getDrivers, updateAssignment } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import FormSelect from '../components/FormSelect';
import FormInput from '../components/FormInput';
import Button from '../components/Button';

const STATUS_OPTIONS = ['Programado', 'En curso', 'Finalizado', 'Cancelado'];

const Trips = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [driverFilter, setDriverFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [statusValue, setStatusValue] = useState('Programado');
  const [hoursValue, setHoursValue] = useState('');

  const parseJson = (value) => {
    if (!value || typeof value !== 'string') return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  const getTripMeta = (trip) => {
    const notes = parseJson(trip.notes);
    const meta = notes.trip_meta || {};
    return {
      status: meta.status || 'Programado',
      workedHours: Number(meta.worked_hours || 0),
      paid: Boolean(meta.paid)
    };
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString('es-MX') : '-');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tripsRes, driversRes] = await Promise.all([getAssignments(), getDrivers()]);
      setTrips(tripsRes.data.data || []);
      setDrivers(driversRes.data.data || []);
    } catch {
      setToast({ message: 'Error al cargar viajes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const meta = getTripMeta(trip);
      const matchesDriver = !driverFilter || String(trip.driver_id) === String(driverFilter);
      const matchesStatus = !statusFilter || meta.status === statusFilter;
      const tripDate = trip.driving_date ? String(trip.driving_date).slice(0, 10) : '';
      const matchesFrom = !fromDate || (tripDate && tripDate >= fromDate);
      const matchesTo = !toDate || (tripDate && tripDate <= toDate);
      return matchesDriver && matchesStatus && matchesFrom && matchesTo;
    });
  }, [trips, driverFilter, statusFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalFacturado = filteredTrips.reduce((acc, t) => acc + Number(t.total_amount || 0), 0);
    const totalHoras = filteredTrips.reduce((acc, t) => acc + getTripMeta(t).workedHours, 0);
    return { totalTrips, totalFacturado, totalHoras };
  }, [filteredTrips]);

  const persistTripMeta = async (trip, patch) => {
    const notes = parseJson(trip.notes);
    const nextNotes = {
      ...notes,
      trip_meta: {
        ...(notes.trip_meta || {}),
        ...patch
      }
    };

    await updateAssignment(trip.id, {
      contract_id: trip.contract_id,
      driver_id: trip.driver_id,
      vehicle_id: trip.vehicle_id,
      assigned_date: trip.assigned_date || null,
      driving_date: trip.driving_date || null,
      external_company_id: trip.external_company_id || null,
      notes: JSON.stringify(nextNotes)
    });
  };

  const togglePaid = async (trip) => {
    try {
      const meta = getTripMeta(trip);
      await persistTripMeta(trip, { paid: !meta.paid });
      setToast({ message: !meta.paid ? 'Marcado como pagado' : 'Marcado como no pagado', type: 'success' });
      fetchData();
    } catch {
      setToast({ message: 'Error al actualizar pago', type: 'error' });
    }
  };

  const openEditModal = (trip) => {
    const meta = getTripMeta(trip);
    setEditingTrip(trip);
    setStatusValue(meta.status);
    setHoursValue(String(meta.workedHours || ''));
    setIsModalOpen(true);
  };

  const saveTripMeta = async (e) => {
    e.preventDefault();
    if (!editingTrip) return;
    try {
      await persistTripMeta(editingTrip, {
        status: statusValue,
        worked_hours: Number(hoursValue || 0)
      });
      setToast({ message: 'Viaje actualizado', type: 'success' });
      setIsModalOpen(false);
      setEditingTrip(null);
      fetchData();
    } catch {
      setToast({ message: 'Error al actualizar viaje', type: 'error' });
    }
  };

  const columns = [
    { header: 'Fecha', render: (row) => formatDate(row.driving_date) },
    { header: 'Cliente', accessor: 'client_name' },
    { header: 'Ruta', render: (row) => `${row.origin || '-'} → ${row.destination || '-'}` },
    { header: 'Unidad', render: (row) => row.license_plate || row.vehicle_code || '-' },
    { header: 'Chofer', accessor: 'driver_name' },
    {
      header: 'Estado',
      render: (row) => {
        const status = getTripMeta(row).status;
        return <span className="text-sm font-medium">{status}</span>;
      }
    },
    { header: 'Total', render: (row) => formatCurrency(row.total_amount) },
    {
      header: 'Pagado',
      render: (row) => (getTripMeta(row).paid ? 'Sí' : 'No')
    }
  ];

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header title="Viajes" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <FormSelect
          label="Chofer"
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
        />
        <FormInput label="Fecha inicio" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <FormInput label="Fecha fin" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <FormSelect
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
        />
      </div>

      <Table
        columns={columns}
        data={filteredTrips}
        customActions={(row) => (
          <>
            <button
              onClick={() => openEditModal(row)}
              className="text-blue-600 hover:text-blue-900 transition-colors"
              title="Editar estado/horas"
            >
              Editar
            </button>
            <button
              onClick={() => togglePaid(row)}
              className="text-green-600 hover:text-green-900 transition-colors"
              title="Marcar pago chofer"
            >
              {getTripMeta(row).paid ? 'No pagado' : 'Pagado'}
            </button>
          </>
        )}
      />

      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg text-sm">
        <div>Total de viajes: <strong>{totals.totalTrips}</strong></div>
        <div>Total facturado: <strong>{formatCurrency(totals.totalFacturado)}</strong></div>
        <div>Total horas trabajadas: <strong>{totals.totalHoras}</strong></div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrip(null);
        }}
        title="Editar viaje"
      >
        <form onSubmit={saveTripMeta}>
          <FormSelect
            label="Estado"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            required
          />
          <FormInput
            label="Horas trabajadas"
            type="number"
            step="0.5"
            value={hoursValue}
            onChange={(e) => setHoursValue(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Trips;
