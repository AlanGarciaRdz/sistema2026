import React, { useState, useEffect } from 'react';
import { getClients, getVehicles } from '../services/api';
import Modal from './Modal';
import Loading from './Loading';
import Toast from './Toast';

const ContractService = ({ isOpen, onClose, onSave, editingContract }) => {
    // Client data
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);

    // Vehicle data
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    // Driver data (you may need to add getDrivers to your API)
    const [drivers, setDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState('');

    // Trip details
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [capacity, setCapacity] = useState('');
    const [status, setStatus] = useState('scheduled'); // scheduled, in_progress, complete

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            fetchClients();
            fetchVehicles();
            // loadDrivers(); // Add this when you have the API endpoint
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Load editing contract data
    useEffect(() => {
        if (editingContract) {
            setSelectedClient(editingContract.client);
            setSelectedVehicle(editingContract.vehicle);
            setSelectedDriver(editingContract.driver || '');
            setOrigin(editingContract.origin || '');
            setDestination(editingContract.destination || '');
            setDateStart(editingContract.dateStart || '');
            setDateEnd(editingContract.dateEnd || '');
            setCapacity(editingContract.capacity || '');
            setStatus(editingContract.status || 'scheduled');
        } else {
            resetForm();
        }
    }, [editingContract, isOpen]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await getVehicles();
            setClients(response.data.data);
          } catch (error) {
            setToast({ message: 'Error al cargar vehículos', type: 'error' });
          } finally {
            setLoading(false);
          }
        };
    

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

    // Uncomment when you add the drivers API
    // const loadDrivers = async () => {
    //     try {
    //         const data = await getDrivers();
    //         setDrivers(data);
    //     } catch (error) {
    //         console.error('Error loading drivers:', error);
    //     }
    // };

    const resetForm = () => {
        setSelectedClient(null);
        setSelectedVehicle(null);
        setSelectedDriver('');
        setOrigin('');
        setDestination('');
        setDateStart('');
        setDateEnd('');
        setCapacity('');
        setStatus('scheduled');
    };

    const handleClientSelect = (e) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        setSelectedClient(client);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const contractData = {
            client: selectedClient,
            vehicle: selectedVehicle,
            driver: selectedDriver,
            origin,
            destination,
            dateStart,
            dateEnd,
            capacity,
            status
        };

        onSave(contractData);
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    {editingContract ? 'Edit Contract/Service' : 'New Contract/Service'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Client Selection */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">1. Client Information</h2>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Client *
                            </label>
                            <select
                                value={selectedClient?.id || ''}
                                onChange={handleClientSelect}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">-- Choose a client --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} - {client.phone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedClient && (
                            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                                <p className="text-sm"><strong>Name:</strong> {selectedClient.name}</p>
                                <p className="text-sm"><strong>Phone:</strong> {selectedClient.phone}</p>
                                {selectedClient.email && <p className="text-sm"><strong>Email:</strong> {selectedClient.email}</p>}
                                {selectedClient.address && <p className="text-sm"><strong>Address:</strong> {selectedClient.address}</p>}
                            </div>
                        )}
                    </div>

                    {/* Vehicle Selection */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">2. Vehicle Selection</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vehicles.map(vehicle => (
                                <div
                                    key={vehicle.id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                        selectedVehicle?.id === vehicle.id
                                            ? 'bg-blue-100 border-blue-600 shadow-lg'
                                            : 'bg-gray-50 border-gray-300 hover:border-blue-400'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-blue-900">{vehicle.type || vehicle.model}</h4>
                                        {selectedVehicle?.id === vehicle.id && (
                                            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">{vehicle.plate}</p>
                                    {vehicle.capacity && (
                                        <p className="text-sm text-gray-500">Capacity: {vehicle.capacity}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Driver Selection */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">3. Driver Assignment</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Driver (Optional)
                            </label>
                            <select
                                value={selectedDriver}
                                onChange={(e) => setSelectedDriver(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Choose a driver --</option>
                                {drivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Trip Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">4. Trip Details</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Origin *
                                </label>
                                <input
                                    type="text"
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Starting location"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Destination *
                                </label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="End location"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Start *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={dateStart}
                                    onChange={(e) => setDateStart(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date End *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={dateEnd}
                                    onChange={(e) => setDateEnd(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Capacity (Passengers)
                                </label>
                                <input
                                    type="number"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Number of passengers"
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status *
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="complete">Complete</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {editingContract ? 'Update Contract' : 'Create Contract'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ContractService;