import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getPaymentsByContractNumber } from '../services/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('es-MX') : '-');

const TripSummaryModal = ({ isOpen, onClose, row }) => {
  const [anticipo, setAnticipo] = useState(0);
  const [textoCliente, setTextoCliente] = useState('');
  const [textoChofer, setTextoChofer] = useState('');
  const [copied, setCopied] = useState(null);

  const notesData = (() => {
    try {
      return row?.notes ? JSON.parse(row.notes) : {};
    } catch {
      return {};
    }
  })();

  const clientPhone = row?.client_phone || notesData.contactPhone || '-';
  const unitType = notesData.unitType || '-';
  const assignedUnit =
    row?.vehicle_name ||
    notesData.vehicle?.license_plate ||
    notesData.vehicle?.vehicle_code ||
    notesData.vehicle?.plate ||
    '-';
  const total = parseFloat(row?.total_amount) || 0;
  const originMaps = row?.origin_maps || '';
  const destinationMaps = row?.destination_maps || '';
  const itinerary = row?.itinerary || '';
  const uiNotes = notesData.uiNotes ?? notesData.notes ?? '';
  const horaSalida = notesData.departureTime || notesData.serviceTime || '';
  const horaRegreso = notesData.returnTime || '';

  useEffect(() => {
    if (!isOpen || !row?.contract_number) return;
    getPaymentsByContractNumber(row.contract_number)
      .then((res) => {
        const payments = res?.data?.data || [];
        const sum = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        setAnticipo(sum);
      })
      .catch(() => setAnticipo(0));
  }, [isOpen, row?.contract_number]);

  useEffect(() => {
    if (!row) return;
    const fecha = formatDate(row.start_date);
    const ruta = `${row.origin || '-'} → ${row.destination || '-'}`;
    const cliente = row.client_name || notesData.contactName || '-';
    const detalles = [itinerary, uiNotes].filter(Boolean).join('\n') || 'Sin detalles';

    setTextoCliente(
      `*Resumen del servicio - Contrato #${row.contract_number}*\n\n` +
        `Cliente: ${cliente}\n` +
        `Fecha: ${fecha}${horaSalida ? ` · ${horaSalida}` : ''}\n` +
        `Ruta: ${ruta}\n` +
        (originMaps ? `Origen: ${originMaps}\n` : '') +
        (destinationMaps ? `Destino: ${destinationMaps}\n` : '') +
        `Unidad: ${unitType}${assignedUnit !== '-' ? ` (${assignedUnit})` : ''}\n` +
        `Total: ${formatCurrency(total)} · Apartado: ${formatCurrency(anticipo)}\n` +
        (detalles !== 'Sin detalles' ? `\nDetalles:\n${detalles}` : '') +
        `\n\nPor favor confirma que la información es correcta.`
    );

    const fechaRegreso = formatDate(row.end_date || row.start_date);
    const salidaStr = horaSalida ? `Salida: ${fecha} ${horaSalida}` : null;
    const regresoStr = horaRegreso ? `Regreso: ${fechaRegreso} ${horaRegreso}` : null;

    const lineasChofer = [
      `#${row.contract_number} · ${fecha}`,
      `Cliente: ${cliente}`,
      `Tel: ${clientPhone}`,
      ruta,
      assignedUnit !== '-' ? `Unidad: ${assignedUnit}` : null,
      salidaStr,
      regresoStr,
      originMaps ? `Origen: ${originMaps}` : null,
      destinationMaps ? `Destino: ${destinationMaps}` : null,
      `Total: ${formatCurrency(total)}`,
      `Anticipo: ${formatCurrency(anticipo)}`,
      `Pendiente: ${formatCurrency(total - anticipo)}`
    ].filter(Boolean);
    setTextoChofer(lineasChofer.join('\n'));
  }, [row, anticipo]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!row) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resumen del viaje" size="lg">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">No. contrato</span>
            <p className="font-medium">{row.contract_number}</p>
          </div>
          <div>
            <span className="text-gray-500">Cliente</span>
            <p className="font-medium">{row.client_name || notesData.contactName || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Fecha inicio</span>
            <p className="font-medium">{formatDate(row.start_date)}</p>
          </div>
          <div>
            <span className="text-gray-500">Ruta</span>
            <p className="font-medium">{row.origin || '-'} → {row.destination || '-'}</p>
          </div>
          {originMaps && (
            <div className="col-span-2">
              <span className="text-gray-500">Ubicación origen</span>
              <a href={originMaps} target="_blank" rel="noopener noreferrer" className="block text-blue-600 truncate hover:underline">
                {originMaps}
              </a>
            </div>
          )}
          {destinationMaps && (
            <div className="col-span-2">
              <span className="text-gray-500">Ubicación destino</span>
              <a href={destinationMaps} target="_blank" rel="noopener noreferrer" className="block text-blue-600 truncate hover:underline">
                {destinationMaps}
              </a>
            </div>
          )}
          <div>
            <span className="text-gray-500">Tipo unidad</span>
            <p className="font-medium">{unitType}</p>
          </div>
          <div>
            <span className="text-gray-500">Unidad asignada</span>
            <p className="font-medium">{assignedUnit}</p>
          </div>
          <div>
            <span className="text-gray-500">Total</span>
            <p className="font-medium">{formatCurrency(total)}</p>
          </div>
          <div>
            <span className="text-gray-500">Apartado</span>
            <p className="font-medium">{formatCurrency(anticipo)}</p>
          </div>
          {(itinerary || uiNotes) && (
            <div className="col-span-2">
              <span className="text-gray-500">Notas / Itinerario</span>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs">
                {[itinerary, uiNotes].filter(Boolean).join('\n\n') || '-'}
              </p>
            </div>
          )}
        </div>

        {/* Text for client */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Para cliente (WhatsApp)</label>
          <div className="flex gap-2">
            <textarea
              readOnly
              value={textoCliente}
              rows={6}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono bg-gray-50"
            />
            <button
              onClick={() => handleCopy(textoCliente, 'cliente')}
              className="px-3 py-2 h-fit text-sm font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200"
            >
              {copied === 'cliente' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Text for driver */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Para chofer</label>
          <div className="flex gap-2">
            <textarea
              readOnly
              value={textoChofer}
              rows={8}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono bg-gray-50"
            />
            <button
              onClick={() => handleCopy(textoChofer, 'chofer')}
              className="px-3 py-2 h-fit text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {copied === 'chofer' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TripSummaryModal;
