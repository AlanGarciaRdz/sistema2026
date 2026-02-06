import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Copy, Save } from 'lucide-react';
import Button from './Button';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { getClients } from '../services/api';

const QuoteCalculator = ({ isOpen, onClose, onSave, editingQuote }) => {
  const [days, setDays] = useState([
    { date: '', destinations: ['', ''] }
  ]);

  const [costs, setCosts] = useState({
    fuelPricePerLiter: '27',
    fuelEfficiency: '7',
    tollsOneWay: '1110',
    driverPercentage: '20',
    accommodationPerDay: '450',
    pensionPerDay: '0',
    vehicle2PerDay: '800',
    vehicle8PerDay: '1800',
    vehicle14PerDay: '3000',
    vehicle20PerDay: '5700',
    busPrice: '0',
    derechoPiso: '538',
    returnVehicle: false,
    includeBus: false,
    includeDerechoPiso: false
  });

  const [daysNights, setDaysNights] = useState({
    days: 0,
    nights: 0
  });

  const [distances, setDistances] = useState({
    totalKm: 0,
    calculating: false
  });

  const [manualAdjustments, setManualAdjustments] = useState({
    adjustedDistance: 0,
    extraMovements: 0
  });

  const [results, setResults] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('existing'); // 'existing' or 'new'
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchClients();
    } else {
      document.body.style.overflow = 'unset';

      // Reset form when closing
      if (!editingQuote) {
        setClientName('');
        setSelectedClientId('');
        setClientType('existing');
        setDays([{ date: '', destinations: ['', ''] }]);
        setDistances({ totalKm: 0, calculating: false });
        setManualAdjustments({ adjustedDistance: 0, extraMovements: 0 });
        setDaysNights({ days: 0, nights: 0 });
        setResults(null);
        setSelectedVehicles([]);
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Separate useEffect to load editing quote data AFTER clients are loaded
  useEffect(() => {
    if (isOpen && editingQuote && clients.length > 0) {
      setClientName(editingQuote.client_name || '');
      setSelectedClientId(editingQuote.client_id ? String(editingQuote.client_id) : '');
      setClientType(editingQuote.client_id ? 'existing' : 'new');
      setDays(editingQuote.days || [{ date: '', destinations: ['', ''] }]);
      setCosts(editingQuote.costs || costs);
      setDistances(editingQuote.distances || { totalKm: 0, calculating: false });
      setManualAdjustments(editingQuote.manualAdjustments || { adjustedDistance: 0, extraMovements: 0 });
      setDaysNights(editingQuote.daysNights || { days: 0, nights: 0 });
      setResults(editingQuote.results || null);

      // Auto-select all vehicles if results exist
      if (editingQuote.results?.quotations) {
        setSelectedVehicles(editingQuote.results.quotations.map((_, index) => index));
      }
    }
  }, [clients, isOpen, editingQuote]);

  const fetchClients = async () => {
    try {
      const response = await getClients();
      // Ordenar alfabéticamente por nombre
      const sortedClients = response.data.data.sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
      setClients(sortedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleClientSelection = (clientId) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      // Use company name and contact person
      const displayName = client.contact_person
        ? `${client.name} - ${client.contact_person}`
        : client.name;
      setClientName(displayName);
    }
  };

  const addDay = () => {
    setDays([...days, { date: '', destinations: ['', ''] }]);
  };

  const removeDay = (dayIndex) => {
    if (days.length > 1) {
      setDays(days.filter((_, index) => index !== dayIndex));
    }
  };

  const addDestination = (dayIndex) => {
    const newDays = [...days];
    newDays[dayIndex].destinations.push('');
    setDays(newDays);
  };

  const removeDestination = (dayIndex, destIndex) => {
    const newDays = [...days];
    if (newDays[dayIndex].destinations.length > 2) {
      newDays[dayIndex].destinations.splice(destIndex, 1);
      setDays(newDays);
    }
  };

  const updateDestination = (dayIndex, destIndex, value) => {
    const newDays = [...days];
    newDays[dayIndex].destinations[destIndex] = value;
    setDays(newDays);
  };

  const updateDayDate = (dayIndex, value) => {
    const newDays = [...days];
    newDays[dayIndex].date = value;
    setDays(newDays);
  };

  const calculateDistance = async () => {
    setDistances({ ...distances, calculating: true });

    // Collect all destinations in order
    const allDestinations = [];
    days.forEach(day => {
      day.destinations.forEach(dest => {
        if (dest.trim()) {
          allDestinations.push(dest.trim());
        }
      });
    });

    if (allDestinations.length < 2) {
      alert('Necesitas al menos 2 destinos para calcular la distancia');
      setDistances({ ...distances, calculating: false });
      return;
    }

    try {
      // TODO: Replace with actual Google Maps Distance Matrix API call
      // For now, using placeholder calculation
      const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';

      // Simulated API call (replace with actual implementation)
      // const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(allDestinations[0])}&destinations=${encodeURIComponent(allDestinations[allDestinations.length - 1])}&key=${GOOGLE_MAPS_API_KEY}`);

      // Placeholder: 100km per segment
      const estimatedKm = (allDestinations.length - 1) * 100;

      setDistances({
        totalKm: estimatedKm,
        calculating: false
      });

      // Initialize adjusted distance with calculated value
      setManualAdjustments(prev => ({
        ...prev,
        adjustedDistance: estimatedKm
      }));

      // Auto-calculate days and nights
      const totalDays = days.length;
      setDaysNights({
        days: totalDays,
        nights: totalDays > 0 ? totalDays - 1 : 0
      });

      alert(`Distancia calculada (estimada): ${estimatedKm.toFixed(2)} km\n\nNota: Necesitas configurar Google Maps API key para cálculo real.`);
    } catch (error) {
      console.error('Error calculating distance:', error);
      setDistances({ totalKm: 0, calculating: false });
      alert('Error al calcular distancia');
    }
  };

  const calculateQuote = () => {
    if (distances.totalKm === 0) {
      alert('Primero calcula la distancia');
      return;
    }

    // Ensure daysNights has values, fallback to days array length
    const totalDays = parseInt(daysNights.days) || days.length || 1;
    const totalNights = parseInt(daysNights.nights) || (totalDays > 0 ? totalDays - 1 : 0);

    // Update daysNights if it's not set
    if (!daysNights.days) {
      setDaysNights({
        days: totalDays,
        nights: totalNights
      });
    }

    // Use adjusted distance if set, otherwise use calculated distance
    const baseKm = manualAdjustments.adjustedDistance > 0
      ? manualAdjustments.adjustedDistance
      : distances.totalKm;
    const extraKm = parseFloat(manualAdjustments.extraMovements) || 0;

    // Calculate total KM considering if returning vehicle empty
    let totalKm = (baseKm * 2) + extraKm;
    if (costs.returnVehicle) {
      // If returning are 4 times the distance
      totalKm = (baseKm * 4) + extraKm;
    }

    // Fuel costs
    const litersNeeded = totalKm / parseFloat(costs.fuelEfficiency);
    const fuelCost = litersNeeded * parseFloat(costs.fuelPricePerLiter);

    // Toll costs
    const tollsCost = parseFloat(costs.tollsOneWay) * 2;

    // Accommodation (based on nights)
    const accommodationCost = parseFloat(costs.accommodationPerDay) * totalNights;

    // Pension (based on days)
    const pensionCost = parseFloat(costs.pensionPerDay) * totalDays;

    // Bus costs (if included)
    const busCost = costs.includeBus ? parseFloat(costs.busPrice) * 2 : 0; // Ida y regreso

    // Derecho de piso (if included)
    const derechoPisoCost = costs.includeDerechoPiso ? parseFloat(costs.derechoPiso) : 0;

    // Calculate for each vehicle type
    const vehicleTypes = [
      { name: 'UNIDAD DE 2', capacity: 2, dailyRate: parseFloat(costs.vehicle2PerDay) },
      { name: 'UNIDAD DE 8', capacity: 8, dailyRate: parseFloat(costs.vehicle8PerDay) },
      { name: 'UNIDAD DE 14', capacity: 14, dailyRate: parseFloat(costs.vehicle14PerDay) },
      { name: 'UNIDAD DE 20', capacity: 20, dailyRate: parseFloat(costs.vehicle20PerDay) }
    ];

    const quotations = vehicleTypes.map(vehicle => {
      const vehicleRentalCost = vehicle.dailyRate * totalDays;
      const driverPercentage = parseFloat(costs.driverPercentage) / 100;
      const driverCost = vehicleRentalCost * driverPercentage;

      const totalCosts = fuelCost + tollsCost + accommodationCost + pensionCost +
        vehicleRentalCost + driverCost + busCost + derechoPisoCost;

      return {
        vehicleType: vehicle.name,
        capacity: vehicle.capacity,
        costs: {
          fuel: fuelCost || 0,
          tolls: tollsCost || 0,
          accommodation: accommodationCost || 0,
          pension: pensionCost || 0,
          vehicleRental: vehicleRentalCost || 0,
          driver: driverCost || 0,
          bus: busCost || 0,
          derechoPiso: derechoPisoCost || 0,
          total: totalCosts || 0
        }
      };
    });

    setResults({
      days: totalDays,
      totalKm: totalKm,
      baseKm: baseKm * 2,
      extraKm,
      quotations
    });

    // Select all vehicles by default
    setSelectedVehicles(quotations.map((_, index) => index));
  };

  const toggleVehicleSelection = (index) => {
    setSelectedVehicles(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const generateClientWhatsApp = () => {
    if (!results) return;

    const itinerary = days.map((day, index) => {
      const destinations = day.destinations.filter(d => d.trim()).join(' → ');
      return `Día ${index + 1} (${day.date || 'Fecha por definir'}): ${destinations}`;
    }).join('\n');

    const selectedQuotations = results.quotations.filter((_, index) => selectedVehicles.includes(index));

    if (selectedQuotations.length === 0) {
      alert('Selecciona al menos una unidad para copiar');
      return '';
    }

    const quotesText = selectedQuotations.map(q =>
      `${q.vehicleType} (${q.capacity} pasajeros): *$${q.costs.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}*`
    ).join('\n');

    const text = `🚐 *COTIZACIÓN DE VIAJE*

👤 Cliente: ${clientName || 'Por definir'}

📍 *ITINERARIO*
${itinerary}

💰 *COTIZACIONES DISPONIBLES*
${quotesText}

📅 Duración: ${results.days} día${results.days > 1 ? 's' : ''}

✅ Incluye:
• Gasolina ida y regreso
• Casetas ida y regreso
• Operador
• Seguro de viajero

📱 ¿Tienes preguntas? Contáctanos`;

    return text;
  };

  const generateInternalWhatsApp = () => {
    if (!results) return;

    const itinerary = days.map((day, index) => {
      const destinations = day.destinations.filter(d => d.trim()).join(' → ');
      return `Día ${index + 1} (${day.date || 'Fecha'}): ${destinations}`;
    }).join('\n');

    const selectedQuotations = results.quotations.filter((_, index) => selectedVehicles.includes(index));

    if (selectedQuotations.length === 0) {
      alert('Selecciona al menos una unidad para copiar');
      return '';
    }

    const vehicleRates = {
      'UNIDAD DE 2': costs.vehicle2PerDay,
      'UNIDAD DE 8': costs.vehicle8PerDay,
      'UNIDAD DE 14': costs.vehicle14PerDay,
      'UNIDAD DE 20': costs.vehicle20PerDay
    };

    const quotesDetailed = selectedQuotations.map(q => {
      let details = `*${q.vehicleType}* (${q.capacity} pasajeros)
• Gasolina: $${q.costs.fuel.toFixed(2)}${costs.returnVehicle ? ' (solo ida)' : ''}
• Casetas: $${q.costs.tolls.toFixed(2)}
• Viáticos: $${q.costs.accommodation.toFixed(2)} (${daysNights.nights} noches)`;

      if (q.costs.pension > 0) {
        details += `\n• Pensión: $${q.costs.pension.toFixed(2)} (${daysNights.days} días)`;
      }

      details += `\n• Renta unidad: $${q.costs.vehicleRental.toFixed(2)} ($${vehicleRates[q.vehicleType]}/día)
• Chofer (${costs.driverPercentage}%): $${q.costs.driver.toFixed(2)}`;

      if (q.costs.bus > 0) {
        details += `\n• Autobús (ida y regreso): $${q.costs.bus.toFixed(2)}`;
      }

      if (q.costs.derechoPiso > 0) {
        details += `\n• Derecho de piso (aeropuerto): $${q.costs.derechoPiso.toFixed(2)}`;
      }

      details += `\n*TOTAL: $${q.costs.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}*`;
      return details;
    }).join('\n---\n');

    const text = `🔧 *COTIZACIÓN INTERNA*

Cliente: ${clientName || 'Por definir'}

*ITINERARIO*
${itinerary}

*DESGLOSE DE COSTOS*
📏 Kilometraje ida: ${results.totalKm.toFixed(2)} km
📏 Ida y regreso: ${(results.baseKm || 0).toFixed(2)} km
📅 Días de viaje: ${results.days}
⛽ Rendimiento: ${costs.fuelEfficiency} km/litro
💵 Precio gasolina: $${costs.fuelPricePerLiter}/litro

${quotesDetailed}

🔍 Validar gastos reales vs. cotización`;

    return text;
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  const handleSave = () => {
    if (!results) {
      alert('Primero genera la cotización');
      return;
    }

    const quoteData = {
      id: editingQuote?.id || null, // Include ID if editing
      client_name: clientName,
      client_id: selectedClientId || null,
      days: days,
      distances: distances,
      manualAdjustments: manualAdjustments,
      daysNights: daysNights,
      costs: costs,
      results: results,
      whatsapp_client: generateClientWhatsApp(),
      whatsapp_internal: generateInternalWhatsApp()
    };

    onSave(quoteData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
            <h2 className="text-2xl font-semibold text-gray-900">Calculadora de Cotizaciones</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Client Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cliente
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="existing"
                      checked={clientType === 'existing'}
                      onChange={(e) => setClientType(e.target.value)}
                      className="mr-2"
                    />
                    Cliente Existente
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="new"
                      checked={clientType === 'new'}
                      onChange={(e) => setClientType(e.target.value)}
                      className="mr-2"
                    />
                    Nuevo Cliente
                  </label>
                </div>
              </div>

              {clientType === 'existing' ? (
                <FormSelect
                  label="Seleccionar Cliente"
                  value={selectedClientId}
                  onChange={(e) => handleClientSelection(e.target.value)}
                  options={clients.map(client => ({
                    value: client.id,
                    label: client.contact_person
                      ? `${client.name} - ${client.contact_person}`
                      : client.name
                  }))}
                />
              ) : (
                <FormInput
                  label="Nombre del Cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Empresa ABC - Juan Pérez"
                />
              )}
            </div>

            {/* Days and Destinations */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Itinerario</h3>
                <Button onClick={addDay} size="sm" variant="primary">
                  <Plus size={16} className="mr-1" /> Agregar Día
                </Button>
              </div>

              {days.map((day, dayIndex) => (
                <div key={dayIndex} className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Día {dayIndex + 1}</h4>
                    {days.length > 1 && (
                      <button
                        onClick={() => removeDay(dayIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <FormInput
                    label="Fecha"
                    type="date"
                    value={day.date}
                    onChange={(e) => updateDayDate(dayIndex, e.target.value)}
                    className="mb-3"
                  />

                  <div className="space-y-2">
                    {day.destinations.map((dest, destIndex) => (
                      <div key={destIndex} className="flex gap-2">
                        <FormInput
                          label={destIndex === 0 ? 'Origen/Destino' : ''}
                          value={dest}
                          onChange={(e) => updateDestination(dayIndex, destIndex, e.target.value)}
                          placeholder="Ej: Guadalajara, Huamantla"
                        />
                        {day.destinations.length > 2 && (
                          <button
                            onClick={() => removeDestination(dayIndex, destIndex)}
                            className="text-red-600 hover:text-red-800 mt-7"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => addDestination(dayIndex)}
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                  >
                    <Plus size={16} className="mr-1" /> Agregar Destino
                  </Button>
                </div>
              ))}
            </div>

            {/* Cost Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Configuración de Costos</h3>

              <h4 className="text-md font-medium mb-2">Costos de Operación</h4>
              <div className="grid grid-cols-5 gap-4">
                <FormInput
                  label="Gasolina ($/litro)"
                  type="number"
                  step="0.01"
                  value={costs.fuelPricePerLiter}
                  onChange={(e) => setCosts({ ...costs, fuelPricePerLiter: e.target.value })}
                />
                <FormInput
                  label="Rendimiento (km/litro)"
                  type="number"
                  step="0.1"
                  value={costs.fuelEfficiency}
                  onChange={(e) => setCosts({ ...costs, fuelEfficiency: e.target.value })}
                />
                <FormInput
                  label="Casetas Ida ($)"
                  type="number"
                  step="0.01"
                  value={costs.tollsOneWay}
                  onChange={(e) => setCosts({ ...costs, tollsOneWay: e.target.value })}
                />
                <FormInput
                  label="Viáticos/Noche ($)"
                  type="number"
                  step="0.01"
                  value={costs.accommodationPerDay}
                  onChange={(e) => setCosts({ ...costs, accommodationPerDay: e.target.value })}
                />
                <FormInput
                  label="Pensión/Día ($)"
                  type="number"
                  step="0.01"
                  value={costs.pensionPerDay}
                  onChange={(e) => setCosts({ ...costs, pensionPerDay: e.target.value })}
                />
              </div>

              {/* Days/Nights and Driver % */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <FormInput
                  label="Días"
                  type="number"
                  value={daysNights.days}
                  onChange={(e) => setDaysNights({ ...daysNights, days: parseInt(e.target.value) || 0 })}
                />
                <FormInput
                  label="Noches"
                  type="number"
                  value={daysNights.nights}
                  onChange={(e) => setDaysNights({ ...daysNights, nights: parseInt(e.target.value) || 0 })}
                />
                <FormInput
                  label="% Chofer"
                  type="number"
                  step="1"
                  value={costs.driverPercentage}
                  onChange={(e) => setCosts({ ...costs, driverPercentage: e.target.value })}
                />
              </div>

              {/* Checkboxes and Additional Costs */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="returnVehicle"
                    checked={costs.returnVehicle}
                    onChange={(e) => setCosts({ ...costs, returnVehicle: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="returnVehicle" className="text-sm font-medium text-gray-700">
                    Regresando la unidad
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="includeBus"
                      checked={costs.includeBus}
                      onChange={(e) => setCosts({ ...costs, includeBus: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="includeBus" className="text-sm font-medium text-gray-700 block mb-1">
                        Incluir Autobús (ida y regreso)
                      </label>
                      {costs.includeBus && (
                        <input
                          type="number"
                          step="0.01"
                          value={costs.busPrice}
                          onChange={(e) => setCosts({ ...costs, busPrice: e.target.value })}
                          placeholder="Precio por trayecto"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="includeDerechoPiso"
                      checked={costs.includeDerechoPiso}
                      onChange={(e) => setCosts({ ...costs, includeDerechoPiso: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="includeDerechoPiso" className="text-sm font-medium text-gray-700 block mb-1">
                        Derecho de Piso (aeropuerto)
                      </label>
                      {costs.includeDerechoPiso && (
                        <input
                          type="number"
                          step="0.01"
                          value={costs.derechoPiso}
                          onChange={(e) => setCosts({ ...costs, derechoPiso: e.target.value })}
                          placeholder="Monto"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="text-md font-medium mt-4 mb-2">Renta de Vehículos ($/día)</h4>
              <div className="grid grid-cols-4 gap-4">
                <FormInput
                  label="Unidad 2 pax"
                  type="number"
                  step="0.01"
                  value={costs.vehicle2PerDay}
                  onChange={(e) => setCosts({ ...costs, vehicle2PerDay: e.target.value })}
                />
                <FormInput
                  label="Unidad 8 pax"
                  type="number"
                  step="0.01"
                  value={costs.vehicle8PerDay}
                  onChange={(e) => setCosts({ ...costs, vehicle8PerDay: e.target.value })}
                />
                <FormInput
                  label="Unidad 14 pax"
                  type="number"
                  step="0.01"
                  value={costs.vehicle14PerDay}
                  onChange={(e) => setCosts({ ...costs, vehicle14PerDay: e.target.value })}
                />
                <FormInput
                  label="Unidad 20 pax"
                  type="number"
                  step="0.01"
                  value={costs.vehicle20PerDay}
                  onChange={(e) => setCosts({ ...costs, vehicle20PerDay: e.target.value })}
                />
              </div>
            </div>

            {/* Calculate Distance */}
            <div className="border-t pt-6 space-y-4">
              <Button
                onClick={calculateDistance}
                variant="primary"
                disabled={distances.calculating}
              >
                {distances.calculating ? 'Calculando...' : 'Calcular Distancia'}
              </Button>

              {distances.totalKm > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold text-blue-900">
                    Distancia Calculada (solo ida): {distances.totalKm.toFixed(2)} km
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Ida y vuelta: {(distances.totalKm * 2).toFixed(2)} km
                  </p>
                </div>
              )}

              {/* Manual Adjustments - Show after distance is calculated OR when editing a quote */}
              {(distances.totalKm > 0 || editingQuote) && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                    ⚙️ Ajustes Manuales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Distancia Total Ajustada (km ida)"
                      type="number"
                      step="0.01"
                      value={manualAdjustments.adjustedDistance}
                      onChange={(e) => setManualAdjustments(prev => ({
                        ...prev,
                        adjustedDistance: parseFloat(e.target.value) || 0
                      }))}
                      placeholder={distances.totalKm ? distances.totalKm.toString() : "0"}
                    />
                    <FormInput
                      label="Movimientos Extras (km adicionales)"
                      type="number"
                      step="0.01"
                      value={manualAdjustments.extraMovements}
                      onChange={(e) => setManualAdjustments(prev => ({
                        ...prev,
                        extraMovements: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                    <p className="text-sm text-yellow-900">
                      💡 <strong>Distancia Total para Cotización:</strong>{' '}
                      <span className="font-bold text-lg">
                        {((manualAdjustments.adjustedDistance > 0 ? manualAdjustments.adjustedDistance : distances.totalKm) * 2 + (parseFloat(manualAdjustments.extraMovements) || 0)).toFixed(2)} km
                      </span>
                    </p>
                    <p className="text-xs text-yellow-800 mt-1">
                      (Ida y vuelta: {((manualAdjustments.adjustedDistance > 0 ? manualAdjustments.adjustedDistance : distances.totalKm) * 2).toFixed(2)} km + Movimientos extras: {(parseFloat(manualAdjustments.extraMovements) || 0).toFixed(2)} km)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Calculate Quote */}
            {distances.totalKm > 0 && (
              <div className="border-t pt-6">
                <Button onClick={calculateQuote} variant="success">
                  Generar Cotización
                </Button>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">Resultados de Cotización</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Haz clic en las unidades que quieres incluir en el mensaje de WhatsApp
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {results.quotations.map((quote, index) => (
                    <div
                      key={index}
                      onClick={() => toggleVehicleSelection(index)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedVehicles.includes(index)
                        ? 'bg-blue-100 border-blue-600 shadow-lg'
                        : 'bg-gray-50 border-gray-300 hover:border-blue-400'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-blue-900">{quote.vehicleType}</h4>
                        {selectedVehicles.includes(index) && (
                          <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Capacidad: {quote.capacity} pasajeros</p>
                      <div className="space-y-1 text-sm">
                        <p>Gasolina: ${(quote.costs.fuel || 0).toFixed(2)}{costs.returnVehicleEmpty && ' (ida)'}</p>
                        <p>Casetas: ${(quote.costs.tolls || 0).toFixed(2)}</p>
                        <p>Viáticos: ${(quote.costs.accommodation || 0).toFixed(2)} ({daysNights.nights || 0} noches)</p>
                        {(quote.costs.pension || 0) > 0 && (
                          <p>Pensión: ${quote.costs.pension.toFixed(2)} ({daysNights.days || 0} días)</p>
                        )}
                        <p>Renta: ${(quote.costs.vehicleRental || 0).toFixed(2)} (${((quote.costs.vehicleRental || 0) / (daysNights.days || 1)).toFixed(2)}/día)</p>
                        <p>Chofer: ${(quote.costs.driver || 0).toFixed(2)}</p>
                        {(quote.costs.bus || 0) > 0 && (
                          <p>Autobús: ${quote.costs.bus.toFixed(2)} (ida y regreso)</p>
                        )}
                        {(quote.costs.derechoPiso || 0) > 0 && (
                          <p>Derecho Piso: ${quote.costs.derechoPiso.toFixed(2)}</p>
                        )}
                        <div className="border-t pt-2 mt-2">
                          <p className="font-bold text-blue-900 text-lg">
                            Total: ${quote.costs.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* WhatsApp Copy Buttons */}
                <div className="flex gap-4 flex-wrap">
                  <Button
                    onClick={() => copyToClipboard(generateClientWhatsApp())}
                    variant="success"
                  >
                    <Copy size={18} className="mr-2" /> Copiar para Cliente
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(generateInternalWhatsApp())}
                    variant="primary"
                  >
                    <Copy size={18} className="mr-2" /> Copiar para Interno
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="secondary"
                  >
                    <Save size={18} className="mr-2" /> Guardar Cotización
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCalculator;
