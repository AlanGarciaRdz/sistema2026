import React, { useState, useEffect, useMemo } from 'react';
import {
  getAssignments,
  deleteAssignment,
  createAssignment,
  updateAssignment,
  getContracts,
  getDrivers,
  getVehicles
} from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import FormSelect from '../components/FormSelect';
import FormInput from '../components/FormInput';
import Button from '../components/Button';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractUnitType, setContractUnitType] = useState('');
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [contractSearch, setContractSearch] = useState('');
  const [formData, setFormData] = useState({
    contract_id: '',
    driver_id: '',
    vehicle_id: '',
    assigned_date: new Date().toISOString().slice(0, 10),
    driving_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getAssignments();
      setAssignments(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar asignaciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (window.confirm('¿Está seguro de eliminar esta asignación?')) {
      try {
        await deleteAssignment(assignment.id);
        setToast({ message: 'Asignación eliminada exitosamente', type: 'success' });
        fetchAssignments();
      } catch (error) {
        setToast({ message: 'Error al eliminar asignación', type: 'error' });
      }
    }
  };

  const parseJson = (value) => {
    if (!value || typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const fetchModalData = async () => {
    try {
      const [contractsRes, driversRes, vehiclesRes] = await Promise.all([
        getContracts(),
        getDrivers(),
        getVehicles()
      ]);
      const contractsData = contractsRes.data.data || [];
      const driversData = driversRes.data.data || [];
      const vehiclesData = vehiclesRes.data.data || [];
      setContracts(contractsData);
      setDrivers(driversData);
      setVehicles(vehiclesData);
      return { contractsData, driversData, vehiclesData };
    } catch (error) {
      setToast({ message: 'Error al cargar contratos/choferes/unidades', type: 'error' });
      return { contractsData: [], driversData: [], vehiclesData: [] };
    }
  };

  const resetModalState = () => {
    setFormData({
      contract_id: '',
      driver_id: '',
      vehicle_id: '',
      assigned_date: new Date().toISOString().slice(0, 10),
      driving_date: '',
      notes: ''
    });
    setSelectedContract(null);
    setContractUnitType('');
    setEditingAssignment(null);
    setContractSearch('');
  };

  const sortedContracts = useMemo(
    () =>
      contracts
        .slice()
        .sort((a, b) =>
          String(a.contract_number || '').localeCompare(String(b.contract_number || ''), 'es', {
            numeric: true
          })
        ),
    [contracts]
  );

  /** Búsqueda por id numérico, número de contrato o cliente; el contrato ya elegido siempre aparece. */
  const filteredContractsForSelect = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    if (!q) return sortedContracts;
    return sortedContracts.filter((c) => {
      if (formData.contract_id && String(c.id) === String(formData.contract_id)) return true;
      const idStr = String(c.id);
      const numStr = String(c.contract_number || '').toLowerCase();
      const client = (c.client_name || '').toLowerCase();
      return (
        idStr === q ||
        idStr.includes(q) ||
        numStr.includes(q) ||
        client.includes(q)
      );
    });
  }, [sortedContracts, contractSearch, formData.contract_id]);

  const handleOpenModal = async () => {
    resetModalState();
    await fetchModalData();
    setIsModalOpen(true);
  };

  const handleContractChange = (e) => {
    const contractId = e.target.value;
    const contract = contracts.find((c) => String(c.id) === String(contractId)) || null;
    setSelectedContract(contract);

    let unitType = '';
    let vehicleId = '';
    const notesJson = parseJson(contract?.notes);

    if (notesJson?.unitType) {
      unitType = notesJson.unitType;
    } else if (notesJson?.vehicle?.vehicle_type) {
      unitType = notesJson.vehicle.vehicle_type;
    }

    // If contract already has vehicle assigned, preselect vehicle.
    if (notesJson?.vehicle?.id) {
      vehicleId = String(notesJson.vehicle.id);
    } else if (contract?.vehicle_name) {
      const matchedVehicle = vehicles.find((v) => {
        const plate = (v.license_plate || '').toLowerCase();
        const code = (v.vehicle_code || '').toLowerCase();
        const model = (v.model || '').toLowerCase();
        const target = String(contract.vehicle_name || '').toLowerCase();
        return plate === target || code === target || model === target;
      });
      if (matchedVehicle) {
        vehicleId = String(matchedVehicle.id);
      }
    }

    setContractUnitType(unitType);
    setFormData((prev) => ({
      ...prev,
      contract_id: contractId,
      vehicle_id: vehicleId,
      driving_date: contract?.start_date ? String(contract.start_date).slice(0, 10) : ''
    }));
  };

  const handleEdit = async (assignment) => {
    const { contractsData } = await fetchModalData();
    const contract = contractsData.find((c) => String(c.id) === String(assignment.contract_id)) || null;
    setEditingAssignment(assignment);
    setSelectedContract(contract);

    const notesJson = parseJson(contract?.notes);
    const unitType = notesJson?.unitType || notesJson?.vehicle?.vehicle_type || '';
    setContractUnitType(unitType);

    setFormData({
      contract_id: assignment.contract_id ? String(assignment.contract_id) : '',
      driver_id: assignment.driver_id ? String(assignment.driver_id) : '',
      vehicle_id: assignment.vehicle_id ? String(assignment.vehicle_id) : '',
      assigned_date: assignment.assigned_date ? String(assignment.assigned_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      driving_date: assignment.driving_date ? String(assignment.driving_date).slice(0, 10) : '',
      notes: assignment.notes || ''
    });

    setContractSearch(
      contract
        ? `${contract.id} ${contract.contract_number || ''}`.trim()
        : assignment.contract_id
          ? String(assignment.contract_id)
          : ''
    );

    setIsModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        contract_id: formData.contract_id ? parseInt(formData.contract_id, 10) : null,
        driver_id: formData.driver_id ? parseInt(formData.driver_id, 10) : null,
        vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id, 10) : null,
        assigned_date: formData.assigned_date || null,
        driving_date: formData.driving_date || null,
        external_company_id: null,
        notes: formData.notes || null
      };

      if (editingAssignment?.id) {
        await updateAssignment(editingAssignment.id, payload);
        setToast({ message: 'Asignación actualizada exitosamente', type: 'success' });
      } else {
        await createAssignment(payload);
        setToast({ message: 'Asignación creada exitosamente', type: 'success' });
      }

      setIsModalOpen(false);
      resetModalState();
      fetchAssignments();
    } catch (error) {
      setToast({ message: 'Error al guardar asignación', type: 'error' });
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX');
  };

  const columns = [
    { header: 'Contrato', accessor: 'contract_number' },
    { header: 'Chofer', accessor: 'driver_name' },
    {
      header: 'Vehículo',
      render: (row) => row.license_plate || row.vehicle_code || '-'
    },
    { header: 'Fecha Asignación', render: (row) => formatDate(row.assigned_date) },
    { header: 'Fecha Viaje', render: (row) => formatDate(row.driving_date) }
  ];

  // const assignedContractIds = new Set(
  //   assignments
  //     .filter((a) => !editingAssignment || a.id !== editingAssignment.id)
  //     .map((a) => String(a.contract_id))
  // );

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header
        title="Asignaciones"
        buttonText="+ Crear Asignación"
        onButtonClick={handleOpenModal}
      />
      <Table
        columns={columns}
        data={assignments}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModalState();
        }}
        title={editingAssignment ? 'Editar Asignación' : 'Nueva Asignación'}
        size="lg"
      >
        <form onSubmit={handleSaveAssignment}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contrato <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Busca por <strong>ID</strong> del contrato, número de folio o nombre del cliente.
            </p>
            <input
              type="text"
              placeholder="Ej: 42 o 2603311033 o nombre del cliente..."
              value={contractSearch}
              onChange={(e) => setContractSearch(e.target.value)}
              className="w-full mb-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={formData.contract_id}
              onChange={handleContractChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar contrato de la lista…</option>
              {filteredContractsForSelect.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  ID {contract.id} · #{contract.contract_number || '—'} · {contract.client_name || 'Sin cliente'}
                </option>
              ))}
            </select>
            {contractSearch.trim() && filteredContractsForSelect.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                No hay contratos que coincidan. Prueba con el ID exacto, el número de contrato o borra el filtro.
              </p>
            )}
          </div>

          {selectedContract && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Fecha del contrato (inicio)</p>
                <p className="font-medium text-gray-800">
                  {formatDate(selectedContract.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo de unidad asignada</p>
                <p className="font-medium text-gray-800">{contractUnitType || 'No definido'}</p>
              </div>
            </div>
          )}

          <FormSelect
            label="Vehículo"
            value={formData.vehicle_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, vehicle_id: e.target.value }))}
            required
            options={vehicles.map((vehicle) => ({
              value: vehicle.id,
              label: `${vehicle.license_plate || '-'} · ${vehicle.vehicle_code || ''} ${vehicle.model ? `· ${vehicle.model}` : ''}`
            }))}
          />

          <FormSelect
            label="Chofer"
            value={formData.driver_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, driver_id: e.target.value }))}
            required
            options={drivers.map((driver) => ({
              value: driver.id,
              label: `${driver.name}${driver.phone ? ` · ${driver.phone}` : ''}`
            }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Fecha asignación"
              type="date"
              value={formData.assigned_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, assigned_date: e.target.value }))}
              required
            />
            <FormInput
              label="Fecha viaje"
              type="date"
              value={formData.driving_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, driving_date: e.target.value }))}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Notas operativas de la asignación..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetModalState();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingAssignment ? 'Actualizar Asignación' : 'Guardar Asignación'}
            </Button>
          </div>
        </form>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Assignments;
