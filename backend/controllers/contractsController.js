const axios = require('axios');
const pool = require('../config/db');

const DEFAULT_GOOGLE_CALENDAR_NAME = 'Gua Gua';

/** Nombre del calendario en Google Calendar (misma cuenta que ejecuta el Apps Script). */
const resolveGoogleCalendarDisplayName = () =>
  (process.env.GOOGLE_CALENDAR_NAME && String(process.env.GOOGLE_CALENDAR_NAME).trim()) ||
  DEFAULT_GOOGLE_CALENDAR_NAME;

/** Garantiza que el POST al script siempre incluya calendarioNombre (evita despliegues viejos o procesos sin reiniciar). */
const ensureCalendarioNombre = (calendarData) => {
  if (
    calendarData.calendarioNombre == null ||
    String(calendarData.calendarioNombre).trim() === ''
  ) {
    calendarData.calendarioNombre = resolveGoogleCalendarDisplayName();
  }
  return calendarData;
};

/** Texto de itinerario para Google Calendar (JSON cotización o texto libre). */
const buildItineraryText = (itinerary) => {
  let itineraryText = '';
  try {
    const itineraryData = typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary;
    if (Array.isArray(itineraryData)) {
      itineraryText = itineraryData
        .map((day, idx) => {
          const destinations = (day.destinations || [])
            .filter((d) => d && String(d).trim())
            .join(' → ');
          return `Día ${idx + 1} (${day.date || ''}): ${destinations}`;
        })
        .join('\n');
    }
  } catch {
    itineraryText = typeof itinerary === 'string' ? itinerary : '';
  }
  return itineraryText;
};

/** Offset fijo para combinar fecha DATE + hora del formulario (evita UTC medianoche). Ej. -06:00 Centro México. */
const calendarTzOffset = () => {
  const raw = process.env.CALENDAR_TZ_OFFSET;
  if (raw && /^[+-]\d{2}:\d{2}$/.test(String(raw).trim())) {
    return String(raw).trim();
  }
  return '-06:00';
};

const parseContractNotesForCalendar = (notesText) => {
  try {
    const o = typeof notesText === 'string' ? JSON.parse(notesText || '{}') : {};
    return {
      mode: o.mode === 'servicio' ? 'servicio' : 'contrato',
      departureTime: o.departureTime != null ? String(o.departureTime).trim() : '',
      returnTime: o.returnTime != null ? String(o.returnTime).trim() : '',
      serviceTime: o.serviceTime != null ? String(o.serviceTime).trim() : ''
    };
  } catch {
    return { mode: 'contrato', departureTime: '', returnTime: '', serviceTime: '' };
  }
};

/** Postgres DATE → YYYY-MM-DD (node-pg usa medianoche UTC para DATE). */
const dateOnlyFromPgDate = (d) => {
  if (d == null) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const day = String(x.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** "HH:MM" o "HH:MM:SS" → "HH:MM". */
const normalizeClock = (t) => {
  if (t == null || String(t).trim() === '') return null;
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

const wallDateTimeToIso = (dateStr, clockHM, tzOffset) => {
  if (!dateStr || !clockHM) return null;
  const withSec = clockHM.length === 5 ? `${clockHM}:00` : clockHM;
  return `${dateStr}T${withSec}${tzOffset}`;
};

/**
 * start_date/end_date + departureTime/returnTime/serviceTime del notes JSON (ContractService).
 */
const calendarStartEndFromRow = (row) => {
  const tz = calendarTzOffset();
  const notes = parseContractNotesForCalendar(row.notes);
  const startDay = dateOnlyFromPgDate(row.start_date);
  const endDay = dateOnlyFromPgDate(row.end_date) || startDay;
  if (!startDay) {
    return { fechaInicio: row.start_date, fechaFin: row.end_date };
  }

  const defaultStart = '09:00';
  let startClock;
  let returnClock = null;

  if (notes.mode === 'servicio') {
    startClock = normalizeClock(notes.serviceTime) || defaultStart;
  } else {
    startClock = normalizeClock(notes.departureTime) || defaultStart;
    returnClock = normalizeClock(notes.returnTime);
  }

  const fechaInicio = wallDateTimeToIso(startDay, startClock, tz);
  if (!fechaInicio) {
    return { fechaInicio: row.start_date, fechaFin: row.end_date };
  }

  let fechaFin;
  if (notes.mode === 'servicio') {
    fechaFin = new Date(new Date(fechaInicio).getTime() + 60 * 60 * 1000).toISOString();
  } else if (returnClock) {
    fechaFin = wallDateTimeToIso(endDay, returnClock, tz);
  } else if (endDay === startDay) {
    fechaFin = new Date(new Date(fechaInicio).getTime() + 60 * 60 * 1000).toISOString();
  } else {
    fechaFin = wallDateTimeToIso(endDay, '17:00', tz);
  }

  if (!fechaFin || Number.isNaN(new Date(fechaFin).getTime())) {
    fechaFin = new Date(new Date(fechaInicio).getTime() + 60 * 60 * 1000).toISOString();
  }
  if (new Date(fechaFin) <= new Date(fechaInicio)) {
    fechaFin = new Date(new Date(fechaInicio).getTime() + 60 * 60 * 1000).toISOString();
  }

  return { fechaInicio, fechaFin };
};

/**
 * Payload al Apps Script / integración (mismo shape que al crear contrato).
 * Si envías eventoId, el script debe actualizar ese evento; si no, crear uno nuevo.
 */
const buildGoogleCalendarPayload = (row, clientName, vehicleOverride) => {
  const unidad =
    vehicleOverride != null && String(vehicleOverride).trim() !== ''
      ? vehicleOverride
      : row.vehicle_name || '—';
  const calendarioNombre = resolveGoogleCalendarDisplayName();
  const { fechaInicio, fechaFin } = calendarStartEndFromRow(row);
  return {
    unidad,
    calendarioNombre,
    titulo: `#${row.contract_number} - ${clientName}`,
    descripcion: 'Servicio de transporte',
    fechaInicio,
    fechaFin,
    origen: row.origin || '',
    destino: row.destination || '',
    pasajeros: row.passenger_count || 0,
    cliente: clientName,
    contrato: row.contract_number,
    itinerario: buildItineraryText(row.itinerary)
  };
};

// Get all contracts
const getAllContracts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT co.*, c.name as client_name, c.phone as client_phone, q.quote_number
      FROM contracts co
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN quotes q ON co.quote_id = q.id
      ORDER BY co.start_date DESC NULLS LAST
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get contract by ID
const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT co.*, c.name as client_name, c.phone as client_phone, q.quote_number
      FROM contracts co
      LEFT JOIN clients c ON co.client_id = c.id
      LEFT JOIN quotes q ON co.quote_id = q.id
      WHERE co.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new contract
const createContract = async (req, res) => {
  try {
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, destination, itinerary, passenger_count, total_amount, status,
      origin_maps, destination_maps,
      notes, vehicle_name, num_units, event_type
    } = req.body;
    
    if (!contract_number) {
      return res.status(400).json({ success: false, error: 'Contract number is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO contracts (
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount, status,
        notes, num_units, event_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount,
        status || 'Agendado', notes, num_units, event_type
      ]
    );
    
    let newContract = result.rows[0];
    
    // Try to create Google Calendar event if vehicle_name is provided
    if (vehicle_name && process.env.GOOGLE_CALENDAR_SCRIPT_URL) {
      try {
        const clientResult = await pool.query('SELECT name FROM clients WHERE id = $1', [client_id]);
        const clientName = clientResult.rows[0]?.name || 'Cliente';
        const calendarData = ensureCalendarioNombre(
          buildGoogleCalendarPayload(newContract, clientName, vehicle_name)
        );

        console.log('Sending to Google Calendar:', calendarData);
        
        const calendarResponse = await axios.post(
          process.env.GOOGLE_CALENDAR_SCRIPT_URL,
          calendarData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        
        console.log('Google Calendar response:', calendarResponse.data);
        
        if (calendarResponse.data.success && calendarResponse.data.eventoId) {
          // Save the event ID in the database
          const updateResult = await pool.query(
            'UPDATE contracts SET calendar_event_id = $1 WHERE id = $2 RETURNING *',
            [calendarResponse.data.eventoId, newContract.id]
          );
          newContract = updateResult.rows[0];
          console.log('✅ Event ID saved:', calendarResponse.data.eventoId);
        }
      } catch (calendarError) {
        console.error('Error creating calendar event:', calendarError.message);
        // Don't fail the contract creation if calendar fails
      }
    }
    
    res.status(201).json({ success: true, data: newContract });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update contract
const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, origin_maps, destination, destination_maps,
      itinerary, passenger_count, total_amount, status,
      notes, num_units, event_type, vehicle_name, calendar_event_id
    } = req.body;
    
    const result = await pool.query(
      `UPDATE contracts SET
        contract_number = $1, quote_id = $2, client_id = $3, start_date = $4,
        end_date = $5, origin = $6, origin_maps = $7, destination = $8, destination_maps = $9,
        itinerary = $10, passenger_count = $11, total_amount = $12, status = $13,
        notes = $14, num_units = $15, event_type = $16, vehicle_name = $17, calendar_event_id = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount,
        status,
        notes, num_units, event_type, vehicle_name, calendar_event_id,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /contracts/:id/calendar-sync
 * Crea o actualiza evento en Google Calendar vía GOOGLE_CALENDAR_SCRIPT_URL.
 * Requiere que el Apps Script acepte opcionalmente "eventoId" (calendar_event_id del contrato):
 * - sin eventoId → crear evento y devolver { success, eventoId }
 * - con eventoId → actualizar ese evento y devolver { success, eventoId }
 */
const syncContractCalendar = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CALENDAR_SCRIPT_URL) {
      return res.status(503).json({
        success: false,
        error:
          'Calendario no configurado: define GOOGLE_CALENDAR_SCRIPT_URL en el servidor (.env)'
      });
    }

    const { id } = req.params;
    const result = await pool.query(
      `SELECT co.*, c.name AS client_name
       FROM contracts co
       LEFT JOIN clients c ON co.client_id = c.id
       WHERE co.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contrato no encontrado' });
    }

    const row = result.rows[0];
    const clientName = row.client_name || 'Cliente';
    const calendarData = ensureCalendarioNombre(
      buildGoogleCalendarPayload(row, clientName, null)
    );

    if (row.calendar_event_id) {
      calendarData.eventoId = row.calendar_event_id;
    }

    const scriptUrl = process.env.GOOGLE_CALENDAR_SCRIPT_URL || '';
    console.log('Calendar sync:', {
      calendarioNombre: calendarData.calendarioNombre,
      scriptDeployment: scriptUrl ? `…${scriptUrl.slice(-24)}` : '(sin URL)',
      eventoId: calendarData.eventoId || '(nuevo)',
      contrato: calendarData.contrato
    });

    const calendarResponse = await axios.post(
      process.env.GOOGLE_CALENDAR_SCRIPT_URL,
      calendarData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const body = calendarResponse.data;
    if (!body || !body.success) {
      return res.status(502).json({
        success: false,
        error: body?.error || 'El script de calendario no confirmó la operación'
      });
    }

    const eventoId = body.eventoId;
    if (eventoId) {
      await pool.query(
        `UPDATE contracts SET calendar_event_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [eventoId, id]
      );
    }

    const fresh = await pool.query(
      `SELECT co.*, c.name AS client_name, q.quote_number
       FROM contracts co
       LEFT JOIN clients c ON co.client_id = c.id
       LEFT JOIN quotes q ON co.quote_id = q.id
       WHERE co.id = $1`,
      [id]
    );

    const message = row.calendar_event_id
      ? 'Evento actualizado en Google Calendar'
      : 'Evento creado en Google Calendar';

    res.json({
      success: true,
      data: fresh.rows[0],
      calendarMessage: message
    });
  } catch (error) {
    console.error('syncContractCalendar:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.error ||
        error.message ||
        'Error al sincronizar con Google Calendar'
    });
  }
};

// Delete contract
const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ success: true, message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  syncContractCalendar,
  deleteContract
};
