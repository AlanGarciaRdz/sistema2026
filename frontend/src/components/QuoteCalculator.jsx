import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Copy, Save } from 'lucide-react';
import Button from './Button';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import { getClients } from '../services/api';
import { diffInclusiveCalendarDays } from '../utils/formatDateLocal';

/** arma `days` legacy para cotizaciones / API cuando solo hay trip simple */
function buildLegacyDays(trip) {
  const { roundTrip, dateStart, dateEnd, origin, destination } = trip;
  const dEnd = roundTrip ? dateEnd : dateStart;
  if (
    roundTrip &&
    /^(\d{4}-\d{2}-\d{2})$/.test(String(dateStart).slice(0, 10)) &&
    /^(\d{4}-\d{2}-\d{2})$/.test(String(dEnd || '').slice(0, 10))
  ) {
    return [
      { date: String(dateStart).slice(0, 10), destinations: [origin || '', destination || ''] },
      { date: String(dEnd).slice(0, 10), destinations: [destination || '', origin || ''] }
    ];
  }
  return [
    {
      date: String(dateStart || '').slice(0, 10),
      destinations: [origin || '', destination || '']
    }
  ];
}

function deriveTripFromLegacyDays(daysArr) {
  if (!daysArr?.length) {
    return {
      roundTrip: false,
      dateStart: '',
      dateEnd: '',
      origin: '',
      destination: ''
    };
  }
  const first = daysArr[0];
  const last = daysArr[daysArr.length - 1];
  const ds = Array.isArray(first.destinations) ? first.destinations : [];
  const origin = ds[0] || '';
  const destination =
    ds.length > 1 ? ds[ds.length - 1] : last?.destinations?.[last.destinations.length - 1] || '';
  const dateStart = first.date || '';
  const dateEnd = daysArr.length > 1 ? last.date || '' : '';
  const roundTrip = Boolean(daysArr.length > 1 || (dateEnd && dateEnd !== dateStart));
  return { roundTrip, dateStart, dateEnd: roundTrip ? dateEnd : '', origin, destination };
}

/** Renta diaria por tipo + checkbox «mostrar» en Resultados */
const RENT_VEHICLE_FIELDS = [
  { label: '2 pax ($/día)', rateKey: 'vehicle2PerDay', showKey: 'showQuoteVehicle2' },
  { label: '8 pax ($/día)', rateKey: 'vehicle8PerDay', showKey: 'showQuoteVehicle8' },
  { label: '14 pax ($/día)', rateKey: 'vehicle14PerDay', showKey: 'showQuoteVehicle14' },
  { label: '20 pax ($/día)', rateKey: 'vehicle20PerDay', showKey: 'showQuoteVehicle20' },
  { label: 'Suburban ($/día)', rateKey: 'suburbanPerDay', showKey: 'showQuoteSuburban' }
];

const QuoteCalculator = ({ isOpen, onClose, onSave, editingQuote }) => {
  const defaultCosts = () => ({
    fuelPricePerLiter: '29',
    fuelEfficiency: '7',
    tollsIda: '',
    tollsMultiplyReturn: false,
    driverPercentage: '20',
    accommodationPerDay: '450',
    pensionPerDay: '0',
    includePension: false,
    vehicle2PerDay: '800',
    vehicle8PerDay: '1800',
    vehicle14PerDay: '3000',
    vehicle20PerDay: '5500',
    suburbanPerDay: '2500',
    busPrice: '0',
    derechoPiso: '538',
    returnVehicle: false,
    includeBus: false,
    includeDerechoPiso: false,
    showQuoteVehicle2: true,
    showQuoteVehicle8: true,
    showQuoteVehicle14: true,
    showQuoteVehicle20: true,
    showQuoteSuburban: true
  });

  const [trip, setTrip] = useState({
    roundTrip: true,
    dateStart: '',
    dateEnd: '',
    origin: '',
    destination: ''
  });

  const [costs, setCosts] = useState(defaultCosts);

  const [daysNights, setDaysNights] = useState({ days: 1, nights: 0 });

  const [distances, setDistances] = useState({ totalKm: 0, calculating: false });

  const [manualAdjustments, setManualAdjustments] = useState({
    adjustedDistance: 0,
    extraMovements: 0
  });

  const [agreedAmount, setAgreedAmount] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('existing');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  /** v2 | v8 | v14 | v20 | suburban — entre las unidades visibles en resultados */
  const [selectedVehicleKey, setSelectedVehicleKey] = useState('v2');

  const syncDaysNightsFromTrip = useCallback((t) => {
    if (!t.roundTrip || !t.dateStart) {
      setDaysNights({ days: 1, nights: 0 });
      return;
    }
    if (!t.dateEnd) return;
    const d = diffInclusiveCalendarDays(t.dateStart, t.dateEnd);
    setDaysNights({ days: d, nights: Math.max(0, d - 1) });
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchClients();
    } else {
      document.body.style.overflow = 'unset';
      if (!editingQuote) {
        resetTransientState();
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingQuote]);

  useEffect(() => {
    if (trip.roundTrip) syncDaysNightsFromTrip(trip);
    else setDaysNights({ days: 1, nights: 0 });
  }, [trip.roundTrip, trip.dateStart, trip.dateEnd, syncDaysNightsFromTrip]);

  function resetTransientState() {
    setClientName('');
    setSelectedClientId('');
    setClientType('existing');
    setTrip({
      roundTrip: true,
      dateStart: '',
      dateEnd: '',
      origin: '',
      destination: ''
    });
    setDistances({ totalKm: 0, calculating: false });
    setManualAdjustments({ adjustedDistance: 0, extraMovements: 0 });
    setCosts(defaultCosts());
    setDaysNights({ days: 1, nights: 0 });
    setSelectedVehicleKey('v2');
    setAgreedAmount('');
    setClientSearchQuery('');
  }

  useEffect(() => {
    if (isOpen && editingQuote && clients.length > 0) {
      setClientName(editingQuote.client_name ?? editingQuote.clientName ?? '');
      setSelectedClientId(editingQuote.client_id ? String(editingQuote.client_id) : '');
      setClientType(editingQuote.client_id ? 'existing' : 'new');

      const persistedTrip = editingQuote.trip;
      let nextTrip =
        persistedTrip && typeof persistedTrip === 'object'
          ? {
              roundTrip:
                persistedTrip.roundTrip ??
                !!(persistedTrip.dateEnd && persistedTrip.dateEnd !== persistedTrip.dateStart),
              dateStart: persistedTrip.dateStart ?? '',
              dateEnd: persistedTrip.dateEnd ?? '',
              origin: persistedTrip.origin ?? '',
              destination: persistedTrip.destination ?? ''
            }
          : null;

      if (!nextTrip) {
        const legacyDays =
          editingQuote.days && editingQuote.days.length ? editingQuote.days : [];
        nextTrip = deriveTripFromLegacyDays(legacyDays);
      }
      setTrip(nextTrip);

      setCosts(() => {
        const c = editingQuote.costs || {};
        const migratedTolls =
          c.tollsIda != null && c.tollsIda !== ''
            ? String(c.tollsIda)
            : (c.tollsOneWay != null && String(c.tollsOneWay) !== '')
              ? String(c.tollsOneWay)
              : '';
        const hadLegacyTolls = c.tollsOneWay != null && String(c.tollsOneWay) !== '';
        return {
          ...defaultCosts(),
          ...c,
          tollsIda: migratedTolls,
          tollsMultiplyReturn:
            typeof c.tollsMultiplyReturn === 'boolean'
              ? c.tollsMultiplyReturn
              : hadLegacyTolls
                ? true
                : !!c.tollsMultiplyReturn,
          vehicle20PerDay: c.vehicle20PerDay ?? '5500',
          suburbanPerDay: c.suburbanPerDay ?? '2500'
        };
      });

      const distStore = editingQuote.distances || {};
      const idaKm =
        (editingQuote.manualAdjustments?.adjustedDistance > 0
          ? editingQuote.manualAdjustments.adjustedDistance
          : distStore.totalKm) || 0;
      setDistances({
        totalKm: distStore.totalKm || idaKm || 0,
        calculating: false
      });
      setManualAdjustments(
        editingQuote.manualAdjustments || {
          adjustedDistance: idaKm || 0,
          extraMovements: 0
        }
      );
      setDaysNights(editingQuote.daysNights || { days: 1, nights: 0 });

      const res = editingQuote.results || null;
      const typeToKey = {
        'UNIDAD DE 2': 'v2',
        'UNIDAD DE 8': 'v8',
        'UNIDAD DE 14': 'v14',
        'UNIDAD DE 20': 'v20',
        SUBURBAN: 'suburban'
      };
      if (res?.quotations?.length) {
        let idx =
          typeof editingQuote.selectedVehicleIndex === 'number'
            ? editingQuote.selectedVehicleIndex
            : 0;
        if (idx < 0 || idx >= res.quotations.length) idx = 0;
        const q = res.quotations[idx];
        const k = q?.quoteKey || typeToKey[q?.vehicleType] || 'v2';
        setSelectedVehicleKey(k);
      } else {
        setSelectedVehicleKey('v2');
      }

      setAgreedAmount(editingQuote.agreedAmount || '');
    }
  }, [clients, isOpen, editingQuote]);

  const fetchClients = async () => {
    try {
      const response = await getClients();
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
    const client = clients.find((c) => c.id === parseInt(clientId, 10));
    if (client) {
      const displayName = client.contact_person
        ? `${client.name} - ${client.contact_person}`
        : client.name;
      setClientName(displayName);
    }
  };

  /** KM ida efectivo (solo ida antes de aplicar ×2 o ×4) */
  const getKmOneWayEffective = () => {
    const fromAdj =
      manualAdjustments.adjustedDistance > 0
        ? manualAdjustments.adjustedDistance
        : distances.totalKm || 0;
    return Number(fromAdj) || 0;
  };

  const getTollsCost = () => {
    const ida = parseFloat(costs.tollsIda) || 0;
    return costs.tollsMultiplyReturn ? ida * 2 : ida;
  };

  const results = useMemo(() => {
    const kmOneWayEffective = (() => {
      const fromAdj =
        manualAdjustments.adjustedDistance > 0
          ? manualAdjustments.adjustedDistance
          : distances.totalKm || 0;
      return Number(fromAdj) || 0;
    })();

    if (!(kmOneWayEffective > 0)) return null;

    const totalDays =
      parseInt(daysNights.days, 10) ||
      (trip.roundTrip ? diffInclusiveCalendarDays(trip.dateStart, trip.dateEnd) || 1 : 1);
    const totalNights =
      parseInt(daysNights.nights, 10) || (totalDays > 0 ? Math.max(0, totalDays - 1) : 0);

    const km0 = kmOneWayEffective + (parseFloat(manualAdjustments.extraMovements) || 0);
    let kmFuel = km0;
    if (trip.roundTrip) {
      kmFuel = costs.returnVehicle ? km0 * 4 : km0 * 2;
    }

    const fuelEfficiency = parseFloat(costs.fuelEfficiency) || 1;
    const fuelLiters = kmFuel / fuelEfficiency;
    const fuelCost = fuelLiters * (parseFloat(costs.fuelPricePerLiter) || 0);

    const tollsCost = getTollsCost();
    const accommodationCost =
      (parseFloat(costs.accommodationPerDay) || 0) * (trip.roundTrip ? totalNights : 0);
    const pensionCost = costs.includePension
      ? (parseFloat(costs.pensionPerDay) || 0) * totalDays
      : 0;

    const busCost = costs.includeBus ? (parseFloat(costs.busPrice) || 0) * 2 : 0;

    const derechoPisoCost = costs.includeDerechoPiso ? parseFloat(costs.derechoPiso) || 0 : 0;

    const marginPctRaw = parseFloat(costs.driverPercentage);
    const marginPct = Number.isFinite(marginPctRaw) ? Math.min(99, Math.max(0, marginPctRaw)) : 20;
    const divisor = Math.max(0.01, (100 - marginPct) / 100);

    const vehicleDefs = [
      {
        quoteKey: 'v2',
        name: 'UNIDAD DE 2',
        capacity: 2,
        dailyRate: parseFloat(costs.vehicle2PerDay),
        showKey: 'showQuoteVehicle2'
      },
      {
        quoteKey: 'v8',
        name: 'UNIDAD DE 8',
        capacity: 8,
        dailyRate: parseFloat(costs.vehicle8PerDay),
        showKey: 'showQuoteVehicle8'
      },
      {
        quoteKey: 'v14',
        name: 'UNIDAD DE 14',
        capacity: 14,
        dailyRate: parseFloat(costs.vehicle14PerDay),
        showKey: 'showQuoteVehicle14'
      },
      {
        quoteKey: 'v20',
        name: 'UNIDAD DE 20',
        capacity: 20,
        dailyRate: parseFloat(costs.vehicle20PerDay),
        showKey: 'showQuoteVehicle20'
      },
      {
        quoteKey: 'suburban',
        name: 'SUBURBAN',
        capacity: 7,
        dailyRate: parseFloat(costs.suburbanPerDay),
        showKey: 'showQuoteSuburban'
      }
    ];

    const quotations = [];

    for (const def of vehicleDefs) {
      if (costs[def.showKey] === false) continue;

      const dailyRate = Number.isFinite(def.dailyRate) ? def.dailyRate : 0;
      const vehicleRentalCost = dailyRate * totalDays;
      const internalSubtotal =
        fuelCost +
        tollsCost +
        accommodationCost +
        pensionCost +
        vehicleRentalCost +
        busCost +
        derechoPisoCost;
      const clientTotal = internalSubtotal / divisor;
      const marginAmount = clientTotal - internalSubtotal;

      quotations.push({
        quoteKey: def.quoteKey,
        vehicleType: def.name,
        capacity: def.capacity,
        costs: {
          fuel: fuelCost,
          tolls: tollsCost,
          accommodation: accommodationCost,
          pension: pensionCost,
          vehicleRental: vehicleRentalCost,
          bus: busCost,
          derechoPiso: derechoPisoCost,
          internalSubtotal,
          marginPercent: marginPct,
          marginAmount,
          driver: marginAmount,
          total: clientTotal,
          clientTotal
        }
      });
    }

    return {
      days: totalDays,
      nights: totalNights,
      totalKm: kmFuel,
      kmOneWayDisplayed: kmOneWayEffective + (parseFloat(manualAdjustments.extraMovements) || 0),
      kmFuelOperational: kmFuel,
      quotations
    };
  }, [trip, costs, daysNights, distances, manualAdjustments]);

  useEffect(() => {
    const q = results?.quotations;
    if (!q?.length) return;
    setSelectedVehicleKey((prev) => (q.some((x) => x.quoteKey === prev) ? prev : q[0].quoteKey));
  }, [results]);

  const calculateDistance = async () => {
    const o = trip.origin.trim();
    const dest = trip.destination.trim();
    if (!o || !dest) {
      alert('Indica origen y destino para calcular la distancia (manual).');
      return;
    }

    setDistances((prev) => ({ ...prev, calculating: true }));

    try {
      // Distancia sólo ida: placeholder hasta Maps; siempre editable después
      const seeds = trip.origin.trim().length + trip.destination.trim().length;
      const estimatedKm =
        260 + (seeds * 7 + trip.destination.trim().length * 13) % 380;

      setDistances({ totalKm: estimatedKm, calculating: false });
      setManualAdjustments((prev) => ({ ...prev, adjustedDistance: estimatedKm }));
      alert(
        `Distancia ida (estimación): ${estimatedKm.toFixed(1)} km\n\nAjusta el km a mano si hace falta.`
      );
    } catch (error) {
      console.error(error);
      setDistances((prev) => ({ ...prev, calculating: false }));
      alert('Error al calcular distancia');
    }
  };

  const itineraryTextLines = () => {
    const o = trip.origin?.trim();
    const d = trip.destination?.trim();
    const lineRoute = `${o || '—'} → ${d || '—'}`;
    if (!trip.roundTrip) {
      return [`Traslado (solo ida): ${lineRoute}`, `Fecha: ${trip.dateStart || 'Por definir'}`];
    }
    return [
      `Viaje redondo: ${lineRoute}`,
      `Inicio: ${trip.dateStart || 'Por definir'}`,
      `Fin: ${trip.dateEnd || 'Por definir'}`
    ];
  };

  const generateClientWhatsApp = () => {
    if (!results) return '';

    const sel = results.quotations.find((q) => q.quoteKey === selectedVehicleKey);
    if (!sel) {
      alert('Elige una unidad entre los resultados.');
      return '';
    }

    const lines = itineraryTextLines();
    const txt = `${lines.join('\n')}`;

    return `🚐 *COTIZACIÓN DE VIAJE*

👤 Cliente: ${clientName || 'Por definir'}

📍 *RUTA*
${txt}

💰 ${sel.vehicleType} (${sel.capacity} pax): *$${sel.costs.total
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}*

📅 Duración: ${results.days} día${results.days > 1 ? 's' : ''}${results.nights !== undefined ? ` · ${results.nights} noches` : ''}

📱 ¿Dudas? Contáctanos`;
  };

  const generateInternalWhatsApp = () => {
    if (!results) return '';
    const q = results.quotations.find((x) => x.quoteKey === selectedVehicleKey);
    if (!q) return '';

    const lines = itineraryTextLines().join('\n');
    const d = `${lines}

📏 KM ida (ajustable): ${results.kmOneWayDisplayed?.toFixed(2) ?? '—'} km · KM efectivo combustible: ${results.kmFuelOperational?.toFixed(2)} km

*${q.vehicleType}*
• Combustible: $${q.costs.fuel.toFixed(2)}
• Casetas: $${q.costs.tolls.toFixed(2)}
• Viáticos: $${q.costs.accommodation.toFixed(2)} (${results.nights} noches)
${q.costs.pension > 0 ? `• Pensión: $${q.costs.pension.toFixed(2)}\n` : ''}• Renta: $${q.costs.vehicleRental.toFixed(2)}
${q.costs.bus > 0 ? `• Autobús: $${q.costs.bus.toFixed(2)}\n` : ''}${q.costs.derechoPiso > 0 ? `• Derecho piso: $${q.costs.derechoPiso.toFixed(2)}\n` : ''}• Margen (${q.costs.marginPercent}%): $${q.costs.marginAmount.toFixed(2)}
*TOTAL cliente: $${q.costs.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}*

🔍 Validar gastos reales`;

    return `🔧 *COTIZACIÓN INTERNA*

Cliente: ${clientName || '—'}

${d}`;
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  const handleSave = () => {
    if (!(getKmOneWayEffective() > 0)) {
      alert('Indica la distancia (km ida) antes de guardar.');
      return;
    }
    if (!results?.quotations?.length) {
      alert('Marca al menos una unidad en «Mostrar en resultados».');
      return;
    }

    const daysPayload = buildLegacyDays(trip);

    let selectedVehicleIndex =
      results.quotations.findIndex((q) => q.quoteKey === selectedVehicleKey);
    if (selectedVehicleIndex < 0) selectedVehicleIndex = 0;

    const quoteData = {
      id: editingQuote?.id ?? null,
      client_name: clientName,
      client_id: selectedClientId || null,
      trip,
      days: daysPayload,
      distances,
      manualAdjustments,
      daysNights,
      costs,
      results,
      selectedVehicleIndex,
      agreedAmount,
      whatsapp_client: generateClientWhatsApp(),
      whatsapp_internal: generateInternalWhatsApp()
    };

    onSave(quoteData);
  };

  const filteredClientSelectOptions = useMemo(() => {
    const needle = clientSearchQuery.trim().toLowerCase();
    let list = clients;
    if (needle) {
      list = clients.filter((c) => {
        const name = String(c.name || '').toLowerCase();
        const contact = String(c.contact_person || '').toLowerCase();
        const combined = contact ? `${name} - ${contact}` : name;
        return name.includes(needle) || contact.includes(needle) || combined.includes(needle);
      });
    }
    const selId = selectedClientId ? String(selectedClientId) : '';
    if (selId) {
      const selected = clients.find((c) => String(c.id) === selId);
      if (selected && !list.some((c) => String(c.id) === selId)) {
        list = [selected, ...list];
      }
    }
    return list.map((client) => ({
      value: client.id,
      label: client.contact_person ? `${client.name} - ${client.contact_person}` : client.name
    }));
  }, [clients, clientSearchQuery, selectedClientId]);

  if (!isOpen) return null;

  const kmOneWayDisplayed =
    manualAdjustments.adjustedDistance > 0
      ? manualAdjustments.adjustedDistance
      : distances.totalKm || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40" onClick={onClose} role="presentation">
      <div className="flex min-h-full justify-center sm:p-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white shadow-xl w-full max-w-[1200px] min-h-[100dvh] sm:min-h-0 sm:max-h-[95vh] sm:rounded-lg sm:border border-gray-200 flex flex-col">
          <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Calculadora de cotización</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 max-w-none">
            {/* Cliente */}
            <section className="rounded-lg border border-gray-200 p-4 bg-white">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Cliente
              </h3>
              <div className="flex flex-wrap gap-4 mb-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="existing"
                    checked={clientType === 'existing'}
                    onChange={() => setClientType('existing')}
                  />
                  Existente
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="new"
                    checked={clientType === 'new'}
                    onChange={() => {
                      setClientType('new');
                      setClientSearchQuery('');
                    }}
                  />
                  Nuevo
                </label>
              </div>
              {clientType === 'existing' ? (
                <div className="space-y-2">
                  <FormInput
                    label="Buscar cliente"
                    type="search"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Nombre o contacto…"
                  />
                  {filteredClientSelectOptions.length === 0 && clients.length > 0 && (
                    <p className="text-sm text-amber-700">
                      No hay clientes que coincidan. Borra el filtro o elige otro texto.
                    </p>
                  )}
                  {clients.length === 0 && (
                    <p className="text-sm text-gray-500">Cargando clientes…</p>
                  )}
                  <FormSelect
                    label="Cliente"
                    value={selectedClientId}
                    onChange={(e) => handleClientSelection(e.target.value)}
                    options={filteredClientSelectOptions}
                  />
                </div>
              ) : (
                <FormInput
                  label="Nombre del cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              )}
            </section>

            {/* Viaje */}
            <section className="rounded-lg border border-gray-200 p-4 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Viaje
              </h3>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={trip.roundTrip}
                  onChange={(e) =>
                    setTrip((t) => ({
                      ...t,
                      roundTrip: e.target.checked,
                      dateEnd: e.target.checked ? t.dateEnd : ''
                    }))
                  }
                />
                <span className="text-sm font-medium">Viaje redondo</span>
                <span className="text-xs text-gray-500">
                  (si no, es solo traslado de ida · 1 día / 0 noches)
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Día inicio"
                  type="date"
                  value={trip.dateStart}
                  onChange={(e) => setTrip((t) => ({ ...t, dateStart: e.target.value }))}
                />
                {trip.roundTrip && (
                  <FormInput
                    label="Día fin"
                    type="date"
                    value={trip.dateEnd}
                    onChange={(e) => setTrip((t) => ({ ...t, dateEnd: e.target.value }))}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <FormInput
                  label="Origen"
                  value={trip.origin}
                  onChange={(e) => setTrip((t) => ({ ...t, origin: e.target.value }))}
                  placeholder="Ciudad / punto de salida"
                />
                <div className="flex flex-col gap-1">
                  <FormInput
                    label="Destino"
                    value={trip.destination}
                    onChange={(e) => setTrip((t) => ({ ...t, destination: e.target.value }))}
                    placeholder="Ciudad / destino"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  onClick={calculateDistance}
                  variant="primary"
                  disabled={distances.calculating}
                >
                  {distances.calculating ? 'Calculando…' : 'Calcular distancia (estimación)'}
                </Button>
                <span className="text-xs text-gray-600">
                  Siempre puedes corregir el km a mano abajo.
                </span>
              </div>
            </section>

            {/* KM y regreso */}
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Kilometraje
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="KM (solo ida, editable)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={kmOneWayDisplayed || ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setManualAdjustments((prev) => ({
                      ...prev,
                      adjustedDistance: Number.isFinite(v) ? v : 0
                    }));
                    if (Number.isFinite(v) && v >= 0) {
                      setDistances((d) => ({ ...d, totalKm: v }));
                    }
                  }}
                />
                <FormInput
                  label="Movimientos extra (km)"
                  type="number"
                  step="0.1"
                  value={manualAdjustments.extraMovements || ''}
                  onChange={(e) =>
                    setManualAdjustments((prev) => ({
                      ...prev,
                      extraMovements: parseFloat(e.target.value) || 0
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={costs.returnVehicle}
                  onChange={(e) => setCosts({ ...costs, returnVehicle: e.target.checked })}
                />
                <span className="text-sm">
                  Regresar unidad vacía · usa ×4 sobre km ida para combustible (ida en servicio + regreso
                  vacío)
                </span>
              </label>
              {trip.roundTrip && (
                <p className="text-xs text-gray-600 mt-2">
                  Sin regreso vacío: combustible usa km ida × 2 · Con regreso vacío: × 4 · Traslado solo
                  ida: km tal cual.
                </p>
              )}
            </section>

            {/* Combustible, casetas, viáticos */}
            <section className="rounded-lg border border-gray-200 p-4 bg-white">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Combustible, casetas, viáticos
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <FormInput
                  label="Precio combustible ($/L)"
                  type="number"
                  step="0.01"
                  value={costs.fuelPricePerLiter}
                  onChange={(e) => setCosts({ ...costs, fuelPricePerLiter: e.target.value })}
                />
                <FormInput
                  label="Rendimiento (km/L)"
                  type="number"
                  step="0.1"
                  value={costs.fuelEfficiency}
                  onChange={(e) => setCosts({ ...costs, fuelEfficiency: e.target.value })}
                />
                <FormInput
                  label="Casetas registradas (solo ida) $"
                  type="number"
                  step="0.01"
                  value={costs.tollsIda}
                  onChange={(e) => setCosts({ ...costs, tollsIda: e.target.value })}
                />
                <FormInput
                  label="Viáticos / noche ($)"
                  type="number"
                  step="0.01"
                  value={costs.accommodationPerDay}
                  onChange={(e) => setCosts({ ...costs, accommodationPerDay: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={costs.tollsMultiplyReturn}
                  onChange={(e) => setCosts({ ...costs, tollsMultiplyReturn: e.target.checked })}
                />
                <span className="text-sm">Duplicar casetas ida+vuelta (×2 sobre el monto de ida)</span>
              </label>

              <div className="grid grid-cols-2 gap-3 mt-4 items-end">
                <FormInput
                  label="Días (viaje)"
                  type="number"
                  min="1"
                  value={daysNights.days || ''}
                  onChange={(e) =>
                    setDaysNights((dn) => ({ ...dn, days: parseInt(e.target.value, 10) || 1 }))
                  }
                />
                <FormInput
                  label="Noches (viáticos)"
                  type="number"
                  min="0"
                  value={daysNights.nights}
                  onChange={(e) =>
                    setDaysNights((dn) => ({ ...dn, nights: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Viaje redondo: días/noches se sugieren desde fechas · puedes ajustarlos aquí.
              </p>

              <div className="mt-4 flex flex-wrap gap-6">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="pensionCk"
                    className="mt-1"
                    checked={costs.includePension}
                    onChange={(e) => setCosts({ ...costs, includePension: e.target.checked })}
                  />
                  <div>
                    <label htmlFor="pensionCk" className="text-sm font-medium block">
                      Incluir pensión
                    </label>
                    <FormInput
                      label="Pensión / día ($)"
                      type="number"
                      step="0.01"
                      value={costs.pensionPerDay}
                      onChange={(e) => setCosts({ ...costs, pensionPerDay: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Opcionales */}
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Opcionales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="busCk"
                    className="mt-1"
                    checked={costs.includeBus}
                    onChange={(e) => setCosts({ ...costs, includeBus: e.target.checked })}
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="busCk" className="text-sm font-medium">
                      Autobús (ida y regreso)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!costs.includeBus}
                      value={costs.busPrice}
                      onChange={(e) => setCosts({ ...costs, busPrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="$ por trayecto"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="dpCk"
                    className="mt-1"
                    checked={costs.includeDerechoPiso}
                    onChange={(e) => setCosts({ ...costs, includeDerechoPiso: e.target.checked })}
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="dpCk" className="text-sm font-medium">
                      Derecho de piso
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={costs.derechoPiso}
                      onChange={(e) => setCosts({ ...costs, derechoPiso: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <FormInput
                  label="Porcentaje pago del chofer (%)"
                  type="number"
                  step="1"
                  min="0"
                  max="95"
                  value={costs.driverPercentage}
                  onChange={(e) => setCosts({ ...costs, driverPercentage: e.target.value })}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Ej. 20% → divide entre ·80 · 15% → divide entre ·85
                </p>
              </div>
            </section>

            {/* Rentas */}
            <section className="rounded-lg border border-gray-200 p-4 bg-slate-50/60">
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Renta diaria por tipo de unidad (editable)
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Marca <strong>Mostrar</strong> para incluir ese tipo en <strong>Resultados</strong> (los montos se
                actualizan al cambiar distancia, costos o días).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {RENT_VEHICLE_FIELDS.map((col) => (
                  <div key={col.rateKey} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={costs[col.showKey]}
                        onChange={(e) =>
                          setCosts((prev) => ({ ...prev, [col.showKey]: e.target.checked }))
                        }
                      />
                      <span className="text-xs font-semibold text-gray-800">Mostrar en resultados</span>
                    </label>
                    <FormInput
                      label={col.label}
                      type="number"
                      step="0.01"
                      value={costs[col.rateKey]}
                      onChange={(e) =>
                        setCosts((prev) => ({ ...prev, [col.rateKey]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            {results?.quotations?.length > 0 && (
              <section className="rounded-lg border-2 border-blue-100 p-4">
                <h3 className="text-lg font-semibold text-blue-950 mb-1">Resultados</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Elige <strong>una</strong> unidad para WhatsApp y guardado (solo un radio activo). Solo aparecen los
                  tipos que marcaste arriba.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  {results.quotations.map((quote) => {
                    const active = selectedVehicleKey === quote.quoteKey;
                    return (
                      <label
                        key={quote.quoteKey}
                        className={`border-2 rounded-lg p-4 cursor-pointer block transition-all ${
                          active ? 'bg-blue-50 border-blue-600 shadow' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <input
                            type="radio"
                            name="vehiclePick"
                            checked={active}
                            onChange={() => setSelectedVehicleKey(quote.quoteKey)}
                            className="mt-1"
                          />
                          <div>
                            <span className="font-semibold text-blue-950">{quote.vehicleType}</span>
                            <p className="text-xs text-gray-600">{quote.capacity} pasajeros</p>
                          </div>
                        </div>
                        <ul className="text-xs space-y-0.5 text-gray-800">
                          <li>Combust.: ${quote.costs.fuel.toFixed(2)}</li>
                          <li>Casetas: ${quote.costs.tolls.toFixed(2)}</li>
                          <li>Viáticos: ${quote.costs.accommodation.toFixed(2)}</li>
                          {quote.costs.pension > 0 && (
                            <li>Pensión: ${quote.costs.pension.toFixed(2)}</li>
                          )}
                          <li>Renta: ${quote.costs.vehicleRental.toFixed(2)}</li>
                          {quote.costs.bus > 0 && <li>Bus: ${quote.costs.bus.toFixed(2)}</li>}
                          {quote.costs.derechoPiso > 0 && (
                            <li>D. piso: ${quote.costs.derechoPiso.toFixed(2)}</li>
                          )}
                          <li>
                            Operador ({quote.costs.marginPercent}%): $
                            {quote.costs.marginAmount.toFixed(2)}
                          </li>
                          <li className="font-bold text-blue-900 pt-1 border-t">
                            TOTAL: $
                            {quote.costs.total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          </li>
                        </ul>
                      </label>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-green-300 bg-green-50/90 p-4 mb-4">
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Monto acordado con el cliente (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(e.target.value)}
                    className="w-full border border-green-400 rounded-lg px-3 py-2 text-lg font-semibold"
                    placeholder="Si vacío → total de la unidad seleccionada"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="success" onClick={() => copyToClipboard(generateClientWhatsApp())}>
                    <Copy size={18} className="mr-2" /> WhatsApp cliente
                  </Button>
                  <Button type="button" variant="primary" onClick={() => copyToClipboard(generateInternalWhatsApp())}>
                    <Copy size={18} className="mr-2" /> WhatsApp interno
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleSave}>
                    <Save size={18} className="mr-2" /> Guardar cotización
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCalculator;
