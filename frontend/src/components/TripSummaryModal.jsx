import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { getPaymentsByContractNumber } from '../services/api';
import { formatDateLocal } from '../utils/formatDateLocal';
import { getContractBillingAmounts } from '../utils/contractPdfUtils';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

/** Format YYYY-MM-DD as "14 de marzo de 2026" (sin cambio de zona horaria) */
const formatDateLong = (dateStr) => {
  if (!dateStr) return '-';
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const [y, m, d] = s.split('-').map(Number);
  return `${d} de ${meses[m - 1]} de ${y}`;
};

/** Format YYYY-MM-DD as "14/03/2026" (sin cambio de zona horaria) */
const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
};

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
  const billing = row ? getContractBillingAmounts(row) : { grandTotal: 0, includeIva: false, subtotal: 0, iva: 0 };
  const total = billing.grandTotal;
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
    const startStr = row.start_date ? String(row.start_date).slice(0, 10) : '';
    const endStr = row.end_date ? String(row.end_date).slice(0, 10) : startStr;
    const fechaLong = formatDateLong(row.start_date);
    const cliente = row.client_name || notesData.contactName || '-';
    const detalles = [itinerary, uiNotes].filter(Boolean).join('\n') || 'Sin detalles';
    const pasajeros = row.passenger_count ?? '-';

    // Mapa invertido: destination_maps = origen real, origin_maps = destino real
    const mapaOrigen = destinationMaps || '';
    const mapaDestino = originMaps || '';

    setTextoCliente(
      `*Confirmación de Servicio de Transporte*\n\n` +
        `Folio: #${row.contract_number}\n` +
        `📅 Fecha: ${fechaLong}${horaSalida ? ` · ${horaSalida}` : ''}\n\n` +
        `👤 Cliente: ${cliente}\n` +
        `📞 Tel: ${clientPhone}\n\n` +
        `📍 Origen:\n${row.origin || '-'}${mapaOrigen ? `\n${mapaOrigen}` : ''}\n\n` +
        `📍 Destino:\n${row.destination || '-'}${mapaDestino ? `\n${mapaDestino}` : ''}\n\n` +
        `🕒 Horario\n` +
        `Salida: ${formatDateShort(startStr)}${horaSalida ? ` – ${horaSalida}` : ''}\n` +
        `Regreso: ${formatDateShort(endStr)}${horaRegreso ? ` – ${horaRegreso}` : ''}\n\n` +
        (pasajeros !== '-' ? `👥 Pasajeros: ${pasajeros} personas\n` : '') +
        (detalles !== 'Sin detalles' ? `🎉 Evento: ${detalles}\n\n` : '') +
        `💰 Total: ${formatCurrency(total)}\n` +
        `💵 Anticipo: ${formatCurrency(anticipo)}\n` +
        `⚠️ Pendiente: ${formatCurrency(total - anticipo)}\n\n` +
        `Por favor confirma que la información es correcta.`
    );

    const salidaStr = horaSalida ? `Salida: ${formatDateShort(startStr)} – ${horaSalida}` : null;
    const regresoStr = horaRegreso ? `Regreso: ${formatDateShort(endStr)} – ${horaRegreso}` : null;

    const lineasChofer = [
      'Confirmación de Servicio de Transporte',
      '',
      `Folio: #${row.contract_number}`,
      `📅 Fecha: ${fechaLong}`,
      '',
      `👤 Cliente: ${cliente}`,
      `📞 Tel: ${clientPhone}`,
      '',
      '📍 Origen:',
      row.origin || '-',
      mapaOrigen || null,
      '',
      '📍 Destino:',
      row.destination || '-',
      mapaDestino || null,
      '',
      '🕒 Horario',
      salidaStr,
      regresoStr,
      '',
      pasajeros !== '-' ? `👥 Pasajeros: ${pasajeros} personas` : null,
      detalles !== 'Sin detalles' ? `🎉 Evento: ${detalles}` : null,
      '',
      `💰 Total: ${formatCurrency(total)}`,
      `💵 Anticipo: ${formatCurrency(anticipo)}`,
      `⚠️ Pendiente: ${formatCurrency(total - anticipo)}`
    ].filter((x) => x !== null && x !== undefined);
    setTextoChofer(lineasChofer.join('\n'));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- row/anticipo are the intentional triggers
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
            <p className="font-medium">{formatDateLocal(row.start_date)}</p>
          </div>
          <div>
            <span className="text-gray-500">Ruta</span>
            <p className="font-medium">{row.origin || '-'} → {row.destination || '-'}</p>
          </div>
          {originMaps && (
            <div className="col-span-2">
              <span className="text-gray-500">Ubicación origen (punto de salida)</span>
              <a href={originMaps} target="_blank" rel="noopener noreferrer" className="block text-blue-600 truncate hover:underline">
                {originMaps}
              </a>
            </div>
          )}
          {destinationMaps && (
            <div className="col-span-2">
              <span className="text-gray-500">Ubicación destino (punto de llegada)</span>
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
            <span className="text-gray-500">Total{billing.includeIva ? ' (con IVA)' : ''}</span>
            <p className="font-medium">{formatCurrency(total)}</p>
            {billing.includeIva && (
              <p className="text-xs text-gray-500">
                Subtotal {formatCurrency(billing.subtotal)} + IVA {formatCurrency(billing.iva)}
              </p>
            )}
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
              rows={14}
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
              rows={14}
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
