import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getClients, getVehicles } from '../services/api';
import Modal from './Modal';
import Loading from './Loading';
import Toast from './Toast';
import { buildPdfInfoFromForm, calcIvaAmounts, generateContractPdf } from '../utils/contractPdfUtils';

const UNIT_TYPES = [
    'Autobus',
    'Sprinter / Crafter',
    'Van Hiace / Urvan / Transit',
    'Mini Van',
    'Suburban',
    'Auto 4-6 plazas',
  ];

  const generateContractNumber = () => {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
  };

const ContractService = ({
  isOpen,
  onClose,
  onSave,
  editingContract,
  assignedDriverNames = []
}) => {

    // ── mode & folio ──
    const [mode, setMode] = useState('contrato');
    const [folio, setFolio] = useState(() => generateContractNumber());
  
    // Client data
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);

    // Vehicle data
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);


        // ── shared fields ──
    const [contactName,  setContactName]  = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [origin,       setOrigin]       = useState('');
    const [originMaps,   setOriginMaps]   = useState('');
    const [referencias,  setReferencias]  = useState('');
    const [destination,  setDestination]  = useState('');
    const [destinationMaps, setDestinationMaps] = useState('');
    const [itineraryText, setItineraryText] = useState('');
    const [unitType,     setUnitType]     = useState(UNIT_TYPES[2]);
    const [total,        setTotal]        = useState('');
    const [includeIva,   setIncludeIva]   = useState(false);
    /** Solo administración (no aparece en PDF cliente). Para $/km: monto cotizado ÷ km. */
    const [adminKm,     setAdminKm]      = useState('');
    const [notes,        setNotes]        = useState('');
    const [status,       setStatus]       = useState('scheduled'); // + quote_sent, purchase_order, invoice_sent

    // ── contrato-only ──
    const [departure,     setDeparture]     = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [returnDate,    setReturnDate]    = useState('');
    const [returnTime,    setReturnTime]    = useState('');
    const [capacity,      setCapacity]      = useState('');

    // ── servicio-only ──
    const [serviceDate, setServiceDate] = useState('');
    const [serviceTime, setServiceTime] = useState('');
    

    
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

    const loadedEditIdRef = useRef(null);
    useEffect(() => {
        if (editingContract && isOpen) {
          const loadKey = editingContract.id ?? editingContract.folio ?? 'copy';
          if (loadedEditIdRef.current !== loadKey) {
            loadedEditIdRef.current = loadKey;
            setMode(editingContract.mode || 'contrato');
            setSelectedClient(editingContract.client || null);
            setSelectedVehicle(editingContract.vehicle || null);
            setContactName(editingContract.contactName || '');
            setContactPhone(editingContract.contactPhone || '');
            setOrigin(editingContract.origin || '');
            setOriginMaps(editingContract.originMaps || '');
            setReferencias(editingContract.referencias || '');
            setDestination(editingContract.destination || '');
            setDestinationMaps(editingContract.destinationMaps || '');
            setItineraryText(editingContract.itineraryText || '');
            setUnitType(editingContract.unitType || UNIT_TYPES[2]);
            setTotal(editingContract.total ?? '');
            setIncludeIva(Boolean(editingContract.includeIva));
            setAdminKm(
              editingContract.adminKm != null && editingContract.adminKm !== ''
                ? String(editingContract.adminKm)
                : ''
            );
            setNotes(editingContract.notes ?? '');
            setStatus(editingContract.status || 'scheduled');
            setDeparture(editingContract.departure || '');
            setDepartureTime(editingContract.departureTime || '');
            setReturnDate(editingContract.returnDate || '');
            setReturnTime(editingContract.returnTime || '');
            setCapacity(editingContract.capacity || '');
            setServiceDate(editingContract.serviceDate || '');
            setServiceTime(editingContract.serviceTime || '');
            setFolio(
              String(editingContract.folio || editingContract.contract_number || '').trim() ||
                generateContractNumber()
            );
          }
        } else {
          loadedEditIdRef.current = null;
          if (!editingContract) resetForm();
        }
      }, [editingContract, isOpen]);

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
        setContactName('');
        setContactPhone('');
        setOrigin('');
        setOriginMaps('');
        setReferencias('');
        setDestination('');
        setDestinationMaps('');
        setItineraryText('');
        setUnitType(UNIT_TYPES[2]);
        setTotal('');
        setIncludeIva(false);
        setAdminKm('');
        setNotes('');
        setStatus('scheduled');
        setDeparture('');
        setDepartureTime('');
        setReturnDate('');
        setReturnTime('');
        setCapacity('');
        setServiceDate('');
        setServiceTime('');
        setFolio(generateContractNumber());
    };

    const handleClientSelect = (e) => {
        const clientId = e.target.value;
        const client = clients.find((c) => String(c.id) === String(clientId)) || null;
        setSelectedClient(client);

        // Autofill contractor/contact fields from the selected client
        if (client) {
          setContactName(client.name || '');
          setContactPhone(client.phone || '');
        }
    };

    const handleVehicleSelect = (e) => {
        const vehicleId = e.target.value;
        const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId)) || null;
        setSelectedVehicle(vehicle);
        
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const folioTrim = String(folio || '').trim();
        if (!folioTrim) {
          setToast({ message: 'El folio es obligatorio', type: 'error' });
          return;
        }
        const base = {
        folio: folioTrim,
        mode,
        client: selectedClient,
        vehicle: selectedVehicle,
        contactName,
        contactPhone,
        origin,
        originMaps,
        referencias,
        destination,
        destinationMaps,
        itineraryText,
        unitType,
        total: parseFloat(total) || 0,
        includeIva,
        adminKm: String(adminKm || '').trim() === '' ? null : Number(String(adminKm).replace(',', '.')),
        notes,
        status,
        };
        const payload = mode === 'contrato'
        ? { ...base, departure, departureTime, returnDate, returnTime, capacity: parseInt(capacity) || null }
        : { ...base, serviceDate, serviceTime };

        onSave(payload);
        resetForm();
        onClose();
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleGeneratePdf = async () => {
    try {
      const folioTrim = String(folio || '').trim() || editingContract?.folio || editingContract?.contract_number || generateContractNumber();
      const info = await buildPdfInfoFromForm({
        mode,
        folio: folioTrim,
        contactName,
        contactPhone,
        origin,
        originMaps,
        referencias,
        destination,
        destinationMaps,
        itineraryText,
        notes,
        unitType,
        capacity,
        total,
        includeIva,
        departure,
        departureTime,
        returnDate,
        returnTime,
        serviceDate,
        serviceTime,
        selectedClient
      });
      await generateContractPdf(info);
      setToast({ message: 'PDF generado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al generar PDF', type: 'error' });
    }
  };

  

    return (
        <>
        <Modal isOpen={isOpen} onClose={handleClose}>

        {/* HEADER */}
        <div className="mb-1">
          <h1 className="text-base font-semibold text-gray-900">
            {editingContract
              ? (mode === 'contrato' ? 'Editar contrato' : 'Editar servicio')
              : (mode === 'contrato' ? 'Nuevo contrato'  : 'Nuevo servicio')}
          </h1>
          <label className="mt-2 flex flex-col gap-1 max-w-xs">
            <span className="text-[11px] font-medium text-gray-500">Folio</span>
            <input
              type="text"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              required
              autoComplete="off"
              className="font-mono text-xs font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 tracking-wider focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              placeholder="Número de contrato"
            />
          </label>
        </div>

        {/* TABS */}
        <div className="flex gap-1 border-b border-gray-100 mt-4 mb-5">
          <button
            type="button"
            onClick={() => setMode('contrato')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 border-x-0 border-t-0 bg-transparent transition-colors cursor-pointer ${
              mode === 'contrato'
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Contrato foráneo
          </button>
          <button
            type="button"
            onClick={() => setMode('servicio')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 border-x-0 border-t-0 bg-transparent transition-colors cursor-pointer ${
              mode === 'servicio'
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            Servicio local
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* CLIENTE */}
          <div className="flex flex-col gap-3">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Seleccionar cliente existente</label>
              <select
                value={selectedClient?.id || ''}
                onChange={handleClientSelect}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition appearance-none cursor-pointer"
              >
                <option value="">— Buscar cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>
              {selectedClient && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
                  <span><strong className="text-gray-700">Tel:</strong> {selectedClient.phone}</span>
                  {selectedClient.email   && <span><strong className="text-gray-700">Email:</strong> {selectedClient.email}</span>}
                  {selectedClient.address && <span><strong className="text-gray-700">Dir:</strong> {selectedClient.address}</span>}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">
                  Contratante / nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo o empresa"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Teléfono</label>
                <input
                  type="tel"
                  placeholder="10 dígitos"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                />
              </div>
            </div>

          </div>

          <hr className="border-gray-100" />

          {/* ITINERARIO */}
          <div className="grid grid-cols-2 gap-3">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Origen <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Punto de salida"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Destino <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Punto de llegada"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Referencia / Landmark (opcional)</label>
              <input
                type="text"
                placeholder="Ej: Entre Coyul y Almendra, por el Mercado de Abastos"
                value={referencias}
                onChange={(e) => setReferencias(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Ubicación Origen (Google Maps)</label>
              <input
                type="text"
                placeholder="Pega enlace o dirección de Google Maps (opcional)"
                value={originMaps}
                onChange={(e) => setOriginMaps(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Ubicación Destino (Google Maps)</label>
              <input
                type="text"
                placeholder="Pega enlace o dirección de Google Maps (opcional)"
                value={destinationMaps}
                onChange={(e) => setDestinationMaps(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Itinerario (opcional)</label>
              <textarea
                rows={3}
                placeholder="Texto libre del itinerario (ciudades, horarios, notas de ruta, etc.)"
                value={itineraryText}
                onChange={(e) => setItineraryText(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition resize-y"
              />
            </div>

            {mode === 'contrato' ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Fecha salida <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={departure}
                    onChange={e => setDeparture(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Hora salida <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Fecha regreso</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Hora regreso</label>
                  <input
                    type="time"
                    value={returnTime}
                    onChange={e => setReturnTime(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">
                    Fecha del servicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={e => setServiceDate(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500">Hora</label>
                  <input
                    type="time"
                    value={serviceTime}
                    onChange={e => setServiceTime(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                  />
                </div>
              </>
            )}

          </div>

          <hr className="border-gray-100" />

          {/* UNIDAD */}
          <div className="grid grid-cols-2 gap-3">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Seleccionar vehículo</label>
              <select
                value={selectedVehicle?.id || ''}
                onChange={handleVehicleSelect}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition appearance-none cursor-pointer"
              >
                <option value="">— Seleccionar —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v.license_plate || v.plate || '-')}{v.vehicle_code ? ` · ${v.vehicle_code}` : ''}{v.model ? ` · ${v.model}` : ''}{v.vehicle_type ? ` · ${v.vehicle_type}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Tipo de unidad <span className="text-red-500">*</span>
              </label>
              <select
                value={unitType}
                onChange={e => setUnitType(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition appearance-none cursor-pointer"
              >
                {UNIT_TYPES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>

            {mode === 'contrato' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Capacidad (pasajeros)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Núm. pasajeros"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition appearance-none cursor-pointer"
              >
                <option value="quote_sent">Cotización enviada</option>
                <option value="purchase_order">Orden de compra</option>
                <option value="invoice_sent">Factura enviada</option>
                <option value="scheduled">Programado</option>
                <option value="in_progress">En curso</option>
                <option value="complete">Completado</option>
                <option value="pending_collect">Por cobrar</option>
                <option value="pending_pay">Por pagar</option>
              </select>
            </div>

            {editingContract && assignedDriverNames.length > 0 && (
              <div className="col-span-2 flex flex-col gap-1.5 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2.5">
                <span className="text-xs font-medium text-violet-900">
                  Choferes asignados (desde Asignaciones)
                </span>
                <ul className="text-sm text-violet-950 list-disc list-inside space-y-0.5">
                  {assignedDriverNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <Link
                  to="/assignments"
                  className="text-xs font-medium text-violet-700 hover:text-violet-900 underline underline-offset-2"
                >
                  Gestionar en Asignaciones →
                </Link>
              </div>
            )}
            {editingContract && assignedDriverNames.length === 0 && (
              <div className="col-span-2 text-xs text-gray-500">
                Chofer / unidad operativa: créalo en{' '}
                <Link to="/assignments" className="text-violet-700 font-medium hover:underline">
                  Asignaciones
                </Link>
                .
              </div>
            )}

          </div>

          <hr className="border-gray-100" />

          {/* PAGO + NOTAS */}
          <div className="grid grid-cols-2 gap-3">

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Total del servicio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={total}
                  onChange={e => setTotal(e.target.value)}
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg pl-6 pr-3 py-2 font-medium text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition"
                />
              </div>
              <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeIva}
                  onChange={(e) => setIncludeIva(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs text-gray-700">Incluir IVA (16% del precio)</span>
              </label>
              {includeIva && (parseFloat(total) || 0) > 0 && (() => {
                const { subtotal, iva, grandTotal } = calcIvaAmounts(total, true);
                return (
                  <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
                    Subtotal ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} + IVA $
                    {iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ={' '}
                    <span className="font-semibold text-gray-900">
                      ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>{' '}
                    en PDF y saldo a pagar
                  </p>
                );
              })()}
            </div>

            <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-800 mb-2">Interno · no aparece en PDF cliente</p>
              <div className="flex flex-col gap-1 max-w-xs">
                <label className="text-xs font-medium text-slate-600">
                  Kilómetros del servicio (administrativo)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ej. 400"
                  value={adminKm}
                  onChange={(e) => setAdminKm(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-900/10"
                />
                <p className="text-[11px] text-slate-500 leading-snug">
                  Precio cotizado dividido entre km puede servir como referencia de lista. Otra vista útil es
                  cobrado dividido entre km (realizado). En rutas repetitivas algunas empresas comparan también
                  costo/km vs ingreso/km y el margen objetivo por servicio (no hay una sola fórmula oficial).
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-medium text-gray-500">Detalles del viaje</label>
              <textarea
                placeholder="Indicaciones, paradas intermedias, restricciones…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition resize-y min-h-[72px]"
              />
            </div>

          </div>

          {/* FOOTER */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer flex items-center gap-2 touch-manipulation min-h-[44px]"
              title="Generar PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Generar PDF
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                {editingContract
                  ? (mode === 'contrato' ? 'Actualizar contrato' : 'Actualizar servicio')
                  : (mode === 'contrato' ? 'Crear contrato'      : 'Crear servicio')}
              </button>
            </div>
          </div>

        </form>
      </Modal>
      {loading && <Loading />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
    );
}

export default ContractService;