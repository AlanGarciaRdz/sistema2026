import React, { useState, useEffect, Fragment } from 'react';
import { getQuotes, getClients, deleteQuote, createQuote, updateQuote, createContract } from '../services/api';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import QuoteCalculator from '../components/QuoteCalculator';
import Button from '../components/Button';
import { Copy } from 'lucide-react';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [editingQuoteData, setEditingQuoteData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleName, setVehicleName] = useState('');

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await getQuotes();
      setQuotes(response.data.data);
    } catch (error) {
      setToast({ message: 'Error al cargar cotizaciones', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (quote) => {
    setViewingQuote(quote);
    setSelectedStatus(quote.status || 'Pendiente');
    setEditingStatus(false);
  };

  const handleEditQuote = (quote) => {
    const quoteData = parseQuoteData(quote.notes);
    
    // Prepare data for QuoteCalculator
    setEditingQuoteData({
      id: quote.id,
      ...quoteData
    });
    
    // Close view modal and open calculator
    setViewingQuote(null);
    setIsCalculatorOpen(true);
  };

  const generateContractNumber = () => {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
  };

  const handleStatusChange = async () => {
    // If changing to "Aprobada" and wasn't already approved, ask for vehicle name
    if (selectedStatus === 'Aprobada' && viewingQuote.status !== 'Aprobada') {
      setShowVehicleModal(true);
      return;
    }

    // For other status changes, just update
    await updateQuoteStatus();
  };

  const updateQuoteStatus = async () => {
    try {
      // Update quote status
      const updateData = {
        ...viewingQuote,
        status: selectedStatus
      };

      await updateQuote(viewingQuote.id, updateData);
      
      setToast({ message: 'Estado actualizado exitosamente', type: 'success' });
      setEditingStatus(false);
      fetchQuotes();
      setViewingQuote(null);
    } catch (error) {
      console.error('Error updating status:', error);
      setToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  };

  const handleGenerateContract = async () => {
    if (!vehicleName.trim()) {
      setToast({ message: 'Por favor ingresa el nombre de la unidad', type: 'error' });
      return;
    }

    try {
      const contractNumber = generateContractNumber();
      const quoteData = parseQuoteData(viewingQuote.notes);
      
      const contractData = {
        contract_number: contractNumber,
        client_id: viewingQuote.client_id,
        quote_id: viewingQuote.id,
        start_date: viewingQuote.start_date,
        end_date: viewingQuote.end_date,
        origin: viewingQuote.origin,
        destination: viewingQuote.destination,
        event_type: viewingQuote.event_type || 'Cotización',
        itinerary: viewingQuote.itinerary,
        num_units: viewingQuote.num_units || 1,
        passenger_count: viewingQuote.passenger_count || 0,
        total_amount: viewingQuote.total_amount,
        status: 'Activo',
        notes: viewingQuote.notes,
        vehicle_name: vehicleName.trim()
      };

      const contractResponse = await createContract(contractData);
      const createdContract = contractResponse.data.data;
      
      // Update quote status to Aprobada and save calendar_event_id if available
      const updateData = {
        ...viewingQuote,
        status: 'Aprobada',
        calendar_event_id: createdContract.calendar_event_id || null
      };
      await updateQuote(viewingQuote.id, updateData);

      const successMessage = createdContract.calendar_event_id
        ? `Contrato #${contractNumber} generado y evento creado en Google Calendar`
        : `Contrato #${contractNumber} generado (evento de calendario no creado)`;

      setToast({ 
        message: successMessage, 
        type: 'success' 
      });

      setShowVehicleModal(false);
      setVehicleName('');
      setEditingStatus(false);
      fetchQuotes();
      setViewingQuote(null);
    } catch (error) {
      console.error('Error generating contract:', error);
      setToast({ message: 'Error al generar contrato: ' + error.message, type: 'error' });
    }
  };

  const handleDelete = async (quote) => {
    if (window.confirm('¿Está seguro de eliminar esta cotización?')) {
      try {
        await deleteQuote(quote.id);
        setToast({ message: 'Cotización eliminada exitosamente', type: 'success' });
        fetchQuotes();
      } catch (error) {
        setToast({ message: 'Error al eliminar cotización', type: 'error' });
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: '¡Copiado al portapapeles!', type: 'success' });
  };


  const parseQuoteData = (notes) => {
    try {
      // Try to parse as JSON first (new format)
      const data = JSON.parse(notes);
      return {
        clientName: data.client_name || '',
        days: data.days || [],
        distances: data.distances || {},
        costs: data.costs || {},
        results: data.results || null,
        agreedAmount: data.agreedAmount || '',
        whatsappClient: data.whatsapp_client || '',
        whatsappInternal: data.whatsapp_internal || '',
        manualAdjustments: data.manualAdjustments || {},
        daysNights: data.daysNights || {},
        client_id: data.client_id || null
      };
    } catch (error) {
      // Fallback for old format (text-based)
      const sections = notes.split('\n\n');
      let clientName = '';
      let whatsappClient = '';
      let whatsappInternal = '';
      
      sections.forEach(section => {
        if (section.startsWith('Cliente:')) {
          clientName = section.replace('Cliente:', '').trim();
        } else if (section.startsWith('WhatsApp Cliente:')) {
          whatsappClient = section.replace('WhatsApp Cliente:', '').trim();
        } else if (section.startsWith('WhatsApp Interno:')) {
          whatsappInternal = section.replace('WhatsApp Interno:', '').trim();
        }
      });
      
      return { 
        clientName, 
        whatsappClient, 
        whatsappInternal,
        days: [],
        distances: {},
        costs: {},
        results: null
      };
    }
  };

  const handleSaveQuote = async (quoteData) => {
    try {
      // Save ALL quote data as JSON in notes field
      const completeQuoteData = {
        client_name: quoteData.client_name,
        client_id: quoteData.client_id,
        days: quoteData.days,
        distances: quoteData.distances,
        costs: quoteData.costs,
        results: quoteData.results,
        agreedAmount: quoteData.agreedAmount,
        whatsapp_client: quoteData.whatsapp_client,
        whatsapp_internal: quoteData.whatsapp_internal,
        manualAdjustments: quoteData.manualAdjustments,
        daysNights: quoteData.daysNights
      };

      // Prepare data for API
      const apiData = {
        client_id: quoteData.client_id || null,
        origin: quoteData.days[0]?.destinations[0] || '',
        destination: quoteData.days[quoteData.days.length - 1]?.destinations[quoteData.days[quoteData.days.length - 1].destinations.length - 1] || '',
        start_date: quoteData.days[0]?.date || null,
        end_date: quoteData.days[quoteData.days.length - 1]?.date || null,
        event_type: 'Cotización',
        itinerary: JSON.stringify(quoteData.days),
        num_units: 1,
        passenger_count: quoteData.results?.quotations[0]?.capacity || 0,
        total_amount: parseFloat(quoteData.agreedAmount) || quoteData.results?.quotations[0]?.costs.total || 0,
        status: 'Pendiente',
        notes: JSON.stringify(completeQuoteData) // Save everything as JSON
      };

      // Check if editing or creating
      if (quoteData.id) {
        // Update existing quote
        await updateQuote(quoteData.id, apiData);
        setToast({ message: 'Cotización actualizada exitosamente', type: 'success' });
      } else {
        // Create new quote
        await createQuote(apiData);
        setToast({ message: 'Cotización guardada exitosamente', type: 'success' });
      }
      
      setIsCalculatorOpen(false);
      setEditingQuoteData(null);
      fetchQuotes();
    } catch (error) {
      console.error('Error saving quote:', error);
      setToast({ message: 'Error al guardar cotización', type: 'error' });
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

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Cliente', accessor: 'client_name' },
    { 
      header: 'Ruta/Itinerario', 
      render: (row) => {
        try {
          const itinerary = JSON.parse(row.itinerary || '[]');
          const allDestinations = itinerary.flatMap(day => 
            day.destinations?.filter(d => d.trim()) || []
          );
          // Remove duplicates while preserving order
          const unique = [...new Set(allDestinations)];
          const fullRoute = unique.length > 0 ? unique.join(' → ') : (row.destination || '-');
          
          // Truncate if too long
          const maxLength = 50;
          if (fullRoute.length > maxLength) {
            return (
              <span title={fullRoute} className="cursor-help">
                {fullRoute.substring(0, maxLength)}...
              </span>
            );
          }
          return fullRoute;
        } catch {
          return row.destination || '-';
        }
      }
    },
    { header: 'Fecha Inicio', render: (row) => formatDate(row.start_date) },
    { header: 'Monto Total', render: (row) => formatCurrency(row.total_amount) },
    { 
      header: 'Estado', 
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'Enviada' ? 'bg-blue-100 text-blue-800' :
          row.status === 'Aceptada' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  // Filter quotes based on search term
  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    
    // Parse itinerary and search all destinations
    let itineraryText = '';
    try {
      const itinerary = JSON.parse(quote.itinerary || '[]');
      itineraryText = itinerary.flatMap(day => 
        day.destinations?.filter(d => d.trim()) || []
      ).join(' ').toLowerCase();
    } catch {
      itineraryText = '';
    }
    
    return (
      quote.client_name?.toLowerCase().includes(search) ||
      itineraryText.includes(search) ||
      quote.destination?.toLowerCase().includes(search) ||
      quote.origin?.toLowerCase().includes(search)
    );
  });

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <Header
        title="Cotizaciones"
        buttonText="+ Nueva Cotización"
        onButtonClick={() => setIsCalculatorOpen(true)}
      />
      
      {/* Search Bar */}
      <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por cliente, destino o cualquier ciudad del itinerario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando {filteredQuotes.length} de {quotes.length} cotizaciones
          </p>
        )}
      </div>

      <Table
        columns={columns}
        data={filteredQuotes}
        onView={handleView}
        onDelete={handleDelete}
      />
      
      <QuoteCalculator
        isOpen={isCalculatorOpen}
        onClose={() => {
          setIsCalculatorOpen(false);
          setEditingQuoteData(null);
        }}
        onSave={handleSaveQuote}
        editingQuote={editingQuoteData}
      />

      {/* View Quote Modal */}
      {viewingQuote && (
        <Modal
          isOpen={viewingQuote !== null}
          onClose={() => setViewingQuote(null)}
          title={`Cotización #${viewingQuote.quote_number || viewingQuote.id}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-2 border-b pb-4">
              <div className="flex items-center gap-4">
                {!editingStatus ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Estado:</span>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        viewingQuote.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        viewingQuote.status === 'Enviada' ? 'bg-blue-100 text-blue-800' :
                        viewingQuote.status === 'Aprobada' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {viewingQuote.status}
                      </span>
                    </div>
                    <Button
                      onClick={() => setEditingStatus(true)}
                      variant="secondary"
                      size="sm"
                    >
                      Cambiar Estado
                    </Button>
                  </>
                ) : (
                  <>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Enviada">Enviada</option>
                      <option value="Aprobada">Aprobada</option>
                      <option value="Rechazada">Rechazada</option>
                    </select>
                    <Button
                      onClick={() => {
                        setEditingStatus(false);
                        setSelectedStatus(viewingQuote.status);
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleStatusChange}
                      variant="success"
                      size="sm"
                    >
                      💾 Guardar
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                onClick={() => handleEditQuote(viewingQuote)}
                variant="primary"
                size="sm"
              >
                ✏️ Editar Cotización
              </Button>
            </div>

            {/* Client Info */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">Información del Cliente</h3>
              <p className="text-gray-700">
                <strong>Cliente:</strong> {viewingQuote.client_name || parseQuoteData(viewingQuote.notes).clientName || 'No especificado'}
              </p>
            </div>

            {/* Trip Details */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">Detalles del Viaje</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Origen</p>
                  <p className="font-medium">{viewingQuote.origin || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Destino</p>
                  <p className="font-medium">{viewingQuote.destination || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Inicio</p>
                  <p className="font-medium">{formatDate(viewingQuote.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha Fin</p>
                  <p className="font-medium">{formatDate(viewingQuote.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pasajeros</p>
                  <p className="font-medium">{viewingQuote.passenger_count || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    viewingQuote.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    viewingQuote.status === 'Enviada' ? 'bg-blue-100 text-blue-800' :
                    viewingQuote.status === 'Aceptada' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {viewingQuote.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Itinerary */}
            {(() => {
              const quoteData = parseQuoteData(viewingQuote.notes);
              return quoteData.days && quoteData.days.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-2">Itinerario</h3>
                  <div className="space-y-3">
                    {quoteData.days.map((day, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {day.date ? new Date(day.date).toLocaleDateString('es-MX', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : 'Fecha por definir'}
                          </span>
                        </div>
                        <div className="ml-8">
                          {day.destinations && day.destinations.length > 0 ? (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              {day.destinations.filter(d => d.trim()).map((dest, i, arr) => (
                                <Fragment key={i}>
                                  <span className="font-medium">{dest}</span>
                                  {i < arr.length - 1 && (
                                    <span className="text-blue-600">→</span>
                                  )}
                                </Fragment>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Sin movimientos</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Distance Info */}
                  {quoteData.distances && quoteData.distances.totalKm > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Distancia Calculada (ida):</strong> {quoteData.distances.totalKm.toFixed(2)} km
                        </p>
                        <p className="text-sm">
                          <strong>Ida y regreso:</strong> {(quoteData.distances.totalKm * 2).toFixed(2)} km
                        </p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">
                          <strong>Distancia Ajustada (ida):</strong> {(quoteData.manualAdjustments?.adjustedDistance || quoteData.distances.totalKm).toFixed(2)} km
                        </p>
                        <p className="text-sm">
                          <strong>Movimientos Extras:</strong> {(quoteData.manualAdjustments?.extraMovements || 0).toFixed(2)} km
                        </p>
                        <p className="text-sm font-semibold text-blue-900 mt-1">
                          <strong>Total Real:</strong> {(quoteData.results?.totalKm || ((quoteData.manualAdjustments?.adjustedDistance || quoteData.distances.totalKm) * 2 + (quoteData.manualAdjustments?.extraMovements || 0))).toFixed(2)} km
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pricing Details */}
            {(() => {
              const quoteData = parseQuoteData(viewingQuote.notes);
              return quoteData.results && quoteData.results.quotations && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-4">Cotizaciones por Tipo de Unidad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quoteData.results.quotations.map((quote, index) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-bold text-blue-900 text-lg mb-3">{quote.vehicleType}</h4>
                        <p className="text-sm text-gray-600 mb-3">Capacidad: {quote.capacity} pasajeros</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Gasolina:</span>
                            <span className="font-medium">{formatCurrency(quote.costs.fuel)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Casetas:</span>
                            <span className="font-medium">{formatCurrency(quote.costs.tolls)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Viáticos:</span>
                            <span className="font-medium">
                              {formatCurrency(quote.costs.accommodation)}
                              {quoteData.daysNights && <span className="text-xs text-gray-600 ml-1">({quoteData.daysNights.nights} noches)</span>}
                            </span>
                          </div>
                          {quote.costs.pension > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-700">Pensión:</span>
                              <span className="font-medium">
                                {formatCurrency(quote.costs.pension)}
                                {quoteData.daysNights && <span className="text-xs text-gray-600 ml-1">({quoteData.daysNights.days} días)</span>}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-700">Renta Unidad:</span>
                            <span className="font-medium">
                              {formatCurrency(quote.costs.vehicleRental)}
                              <span className="text-xs text-gray-600 ml-1">
                                ({formatCurrency(quote.costs.vehicleRental / (quoteData.daysNights?.days || quoteData.results.days))}/día)
                              </span>
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Chofer ({quoteData.costs.driverPercentage}%):</span>
                            <span className="font-medium">{formatCurrency(quote.costs.driver)}</span>
                          </div>
                          {quote.costs.bus > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-700">Autobús (ida y regreso):</span>
                              <span className="font-medium">{formatCurrency(quote.costs.bus)}</span>
                            </div>
                          )}
                          {quote.costs.derechoPiso > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-700">Derecho de Piso:</span>
                              <span className="font-medium">{formatCurrency(quote.costs.derechoPiso)}</span>
                            </div>
                          )}
                          <div className="border-t-2 border-blue-300 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-blue-900">TOTAL:</span>
                            <span className="font-bold text-blue-900 text-lg">{formatCurrency(quote.costs.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Cost Configuration Used */}
                  {quoteData.costs && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Configuración de Costos Utilizada:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700">
                        <div><strong>Gasolina:</strong> ${quoteData.costs.fuelPricePerLiter}/litro</div>
                        <div><strong>Rendimiento:</strong> {quoteData.costs.fuelEfficiency} km/litro</div>
                        <div><strong>Casetas (ida):</strong> ${quoteData.costs.tollsOneWay}</div>
                        <div><strong>Viáticos:</strong> ${quoteData.costs.accommodationPerDay}/día</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* WhatsApp Messages */}
            {(() => {
              const quoteData = parseQuoteData(viewingQuote.notes);
              return (quoteData.whatsappClient || quoteData.whatsappInternal) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Mensajes de WhatsApp</h3>
                  
                  {quoteData.whatsappClient && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-600 text-white rounded-full p-1">
                            <Copy size={16} />
                          </div>
                          <h4 className="font-semibold text-green-900">Mensaje para Cliente</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => copyToClipboard(quoteData.whatsappClient)}
                        >
                          <Copy size={16} className="mr-1" /> Copiar
                        </Button>
                      </div>
                      <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap text-gray-800 font-sans">
                          {quoteData.whatsappClient}
                        </pre>
                      </div>
                    </div>
                  )}

                  {quoteData.whatsappInternal && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-600 text-white rounded-full p-1">
                            <Copy size={16} />
                          </div>
                          <h4 className="font-semibold text-blue-900">Mensaje Interno (Costos Detallados)</h4>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => copyToClipboard(quoteData.whatsappInternal)}
                        >
                          <Copy size={16} className="mr-1" /> Copiar
                        </Button>
                      </div>
                      <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap text-gray-800 font-sans">
                          {quoteData.whatsappInternal}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Vehicle Name Modal */}
      {showVehicleModal && (
        <Modal
          isOpen={showVehicleModal}
          onClose={() => {
            setShowVehicleModal(false);
            setVehicleName('');
            setEditingStatus(false);
          }}
          title="🚌 Seleccionar Unidad para Contrato"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>📋 Generando Contrato #{generateContractNumber()}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Se creará un evento automático en Google Calendar
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Unidad *
              </label>
              <input
                type="text"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="Ej: Autobús 1, Sprinter A, Van 3..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre se usará para buscar el calendario en Google Calendar
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Importante:</strong> Asegúrate de que existe un calendario en Google Calendar 
                con este nombre exacto.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                onClick={() => {
                  setShowVehicleModal(false);
                  setVehicleName('');
                  setEditingStatus(false);
                }}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateContract}
                variant="success"
              >
                ✅ Generar Contrato y Evento
              </Button>
            </div>
          </div>
        </Modal>
      )}
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Quotes;
