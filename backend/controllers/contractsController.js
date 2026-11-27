const axios = require('axios');
const pool = require('../config/db');
const { ensureContractAdminRefs } = require('../utils/ensureContractAdminRefs');

const DEFAULT_GOOGLE_CALENDAR_NAME = 'Gua Gua';

/** Normaliza folio OC/factura: trim; vacío → null. */
const normalizeAdminRef = (value) => {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s.slice(0, 100);
};

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

const formatMoneyMx = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0
  );

const IVA_RATE_CAL = 0.16;

/** Total a cobrar (con IVA si notes.includeIva). */
const getContractAmountDueForCalendar = (row) => {
  let notes = {};
  try {
    notes = row.notes ? JSON.parse(row.notes) : {};
  } catch {
    notes = {};
  }
  const subtotal = parseFloat(row.total_amount) || 0;
  if (notes.includeIva) {
    return Math.round(subtotal * (1 + IVA_RATE_CAL) * 100) / 100;
  }
  return Math.round(subtotal * 100) / 100;
};

/** Nombre corto legible desde vehicle_code (SPRINTER-2026 → Sprinter). */
const friendlyUnitFromCode = (code) => {
  const c = String(code || '').trim();
  if (!c) return '';
  const u = c.toUpperCase();
  if (u.includes('SPRINTER')) return 'Sprinter';
  if (u.includes('CRAFTER')) return 'Crafter';
  if (u.includes('TRANSIT')) return 'Transit';
  if (u.includes('STAREX')) return 'Starex';
  if (u.includes('HIACE')) return 'Hiace';
  if (u.includes('SUBURBAN')) return 'Suburban';
  const base = c.replace(/[-_]\d{2,4}$/, '').replace(/_/g, ' ');
  return base || c;
};

const formatUnidadCalendarLabel = (parts = {}) => {
  const {
    unitTypeFromNotes,
    vehicleCode,
    plate,
    brand,
    model
  } = parts;
  const segments = [];
  const typeLabel =
    (unitTypeFromNotes && String(unitTypeFromNotes).trim()) ||
    friendlyUnitFromCode(vehicleCode) ||
    (brand && model ? `${brand} ${model}`.trim() : '') ||
    (brand || '') ||
    '';
  if (typeLabel) segments.push(String(typeLabel).trim());
  const code = String(vehicleCode || '').trim();
  if (code && typeLabel && code.toUpperCase() !== String(typeLabel).toUpperCase()) {
    segments.push(code);
  } else if (code && !typeLabel) {
    segments.push(code);
  }
  const placa = String(plate || '').trim();
  if (placa) segments.push(`Placa ${placa}`);
  return segments.length ? segments.join(' · ') : '—';
};

const resolveUnidadLabel = (row, vehicleOverride) => {
  if (vehicleOverride != null && String(vehicleOverride).trim() !== '') {
    return String(vehicleOverride).trim();
  }
  try {
    const notes = row.notes ? JSON.parse(row.notes) : {};
    const v = notes.vehicle;
    if (v && typeof v === 'object') {
      return formatUnidadCalendarLabel({
        unitTypeFromNotes: notes.unitType,
        vehicleCode: v.vehicle_code,
        plate: v.license_plate || v.plate,
        brand: v.brand,
        model: v.model
      });
    }
    if (notes.unitType) {
      const placa = row.vehicle_name || '';
      return formatUnidadCalendarLabel({
        unitTypeFromNotes: notes.unitType,
        plate: placa
      });
    }
  } catch {
    /* ignore */
  }
  return row.vehicle_name || '—';
};

/**
 * Descripción única del evento (Apps Script debe usar solo este texto).
 * Orden: contrato, cliente, origen, destino, unidad, chofer(es), precio, apartado, pendiente, itinerario.
 */
const buildCalendarDescription = (row, clientName, unidad, money = {}, driversLabel = '') => {
  const total = money.totalDue != null ? money.totalDue : getContractAmountDueForCalendar(row);
  const anticipo = money.anticipo != null ? money.anticipo : 0;
  const pendiente =
    money.pendiente != null ? money.pendiente : Math.max(0, Math.round((total - anticipo) * 100) / 100);

  const lines = [
    'CONTRATO: ' + (row.contract_number || ''),
    'CLIENTE: ' + (clientName || '—'),
    'ORIGEN: ' + (row.origin || '—'),
    'DESTINO: ' + (row.destination || '—'),
    'UNIDAD ASIGNADA: ' + (unidad || '—'),
    'CHOFER: ' + (driversLabel && String(driversLabel).trim() ? driversLabel : '—')
  ];
  lines.push(
    'PRECIO TOTAL: ' + formatMoneyMx(total),
    anticipo > 0
      ? 'APARTADO: ' + formatMoneyMx(anticipo)
      : 'APARTADO: Sin apartado',
    'PENDIENTE: ' + formatMoneyMx(pendiente)
  );

  let text = lines.join('\n');
  const itinerario = buildItineraryText(row.itinerary);
  const uiNotes = (() => {
    try {
      const n = row.notes ? JSON.parse(row.notes) : {};
      return String(n.uiNotes || '').trim();
    } catch {
      return '';
    }
  })();
  const detailBlock = [itinerario, uiNotes].filter(Boolean).join('\n\n');
  if (detailBlock) text += '\n\nITINERARIO:\n' + detailBlock;
  return text;
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
    const calendarEventMode =
      o.calendarEventMode === 'blocked' ? 'blocked' : 'dual';
    return {
      mode: o.mode === 'servicio' ? 'servicio' : 'contrato',
      departureTime: o.departureTime != null ? String(o.departureTime).trim() : '',
      returnTime: o.returnTime != null ? String(o.returnTime).trim() : '',
      serviceTime: o.serviceTime != null ? String(o.serviceTime).trim() : '',
      calendarEventMode
    };
  } catch {
    return {
      mode: 'contrato',
      departureTime: '',
      returnTime: '',
      serviceTime: '',
      calendarEventMode: 'dual'
    };
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

const addOneHourToClock = (clockHM) => {
  const n = normalizeClock(clockHM) || '09:00';
  const m = n.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '10:00';
  let h = parseInt(m[1], 10) + 1;
  const min = parseInt(m[2], 10);
  if (h >= 24) h = 23;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

/** Fin ~1 h después en hora local (mismo formato que fechaInicio, compatible con Apps Script). */
const wallEndOneHourAfter = (dateStr, startClock, tzOffset) =>
  wallDateTimeToIso(dateStr, addOneHourToClock(startClock), tzOffset);

const epochFromWallIso = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
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
    fechaFin = wallEndOneHourAfter(startDay, startClock, tz);
  } else if (returnClock) {
    fechaFin = wallDateTimeToIso(endDay, returnClock, tz);
  } else if (endDay === startDay) {
    fechaFin = wallEndOneHourAfter(startDay, startClock, tz);
  } else {
    fechaFin = wallDateTimeToIso(endDay, '17:00', tz);
  }

  if (!fechaFin || Number.isNaN(new Date(fechaFin).getTime())) {
    fechaFin = wallEndOneHourAfter(startDay, startClock, tz);
  }
  if (new Date(fechaFin) <= new Date(fechaInicio)) {
    fechaFin = wallEndOneHourAfter(startDay, startClock, tz);
  }

  return { fechaInicio, fechaFin };
};

const parseCalendarScriptResponse = (data) => {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
};

/**
 * Contrato: usa departureTime/returnTime y calendarEventMode (dual, blocked, o salida sola).
 * Servicio: un evento con serviceTime.
 */
const buildCalendarEventSpecs = (row, clientName, vehicleOverride, money = {}, driversLabel = '') => {
  const unidad = resolveUnidadLabel(row, vehicleOverride);
  const notes = parseContractNotesForCalendar(row.notes);
  const startDay = dateOnlyFromPgDate(row.start_date);
  const endDay = dateOnlyFromPgDate(row.end_date) || startDay;
  const tz = calendarTzOffset();
  const baseDesc = buildCalendarDescription(row, clientName, unidad, money, driversLabel);
  const contrato = row.contract_number;

  const spec = (kind, suffix, fechaInicio, fechaFin, eventoId, ubicacion, etiqueta) => ({
    kind,
    eventoId: eventoId ? String(eventoId).trim() : '',
    titulo: `#${contrato} - ${suffix} - ${clientName}`,
    fechaInicio,
    fechaFin,
    fechaInicioMs: epochFromWallIso(fechaInicio),
    fechaFinMs: epochFromWallIso(fechaFin),
    // Descripción completa una sola vez (el Apps Script no debe reconstruirla)
    descripcion: baseDesc,
    ubicacion: ubicacion || '',
    contrato,
    cliente: clientName,
    unidad,
    pasajeros: row.passenger_count || 0,
    origen: row.origin || '',
    destino: row.destination || '',
    itinerario: '',
    etiqueta
  });

  const defaultStart = '09:00';

  if (!startDay) {
    const { fechaInicio, fechaFin } = calendarStartEndFromRow(row);
    return [
      spec('single', 'Servicio', fechaInicio, fechaFin, row.calendar_event_id, row.origin, 'Servicio')
    ];
  }

  if (notes.mode === 'servicio') {
    const clock = normalizeClock(notes.serviceTime) || defaultStart;
    const fi = wallDateTimeToIso(startDay, clock, tz);
    const ff = wallEndOneHourAfter(startDay, clock, tz);
    return [
      spec('single', 'Servicio', fi, ff, row.calendar_event_id, row.origin, 'Servicio')
    ];
  }

  const depClock = normalizeClock(notes.departureTime) || defaultStart;
  const retClock = normalizeClock(notes.returnTime);
  const effectiveRetClock = retClock || '17:00';

  if (notes.calendarEventMode === 'blocked') {
    const fi = wallDateTimeToIso(startDay, depClock, tz);
    let ff = wallDateTimeToIso(endDay, effectiveRetClock, tz);
    if (!ff || Number.isNaN(new Date(ff).getTime())) {
      ff = wallEndOneHourAfter(startDay, depClock, tz);
    }
    if (new Date(ff) <= new Date(fi)) {
      ff = wallEndOneHourAfter(startDay, depClock, tz);
    }
    return [
      spec(
        'blocked',
        'Viaje',
        fi,
        ff,
        row.calendar_event_id,
        row.origin,
        'Unidad bloqueada'
      )
    ];
  }

  if (notes.calendarEventMode === 'dual') {
    const fiSalida = wallDateTimeToIso(startDay, depClock, tz);
    const ffSalida = wallEndOneHourAfter(startDay, depClock, tz);
    const fiRegreso = wallDateTimeToIso(endDay, effectiveRetClock, tz);
    const ffRegreso = wallEndOneHourAfter(endDay, effectiveRetClock, tz);
    return [
      spec('departure', 'Salida', fiSalida, ffSalida, row.calendar_event_id, row.origin, 'Salida'),
      spec(
        'return',
        'Regreso',
        fiRegreso,
        ffRegreso,
        row.calendar_return_event_id,
        row.destination,
        'Regreso'
      )
    ];
  }

  const fi = wallDateTimeToIso(startDay, depClock, tz);
  const ff = wallEndOneHourAfter(startDay, depClock, tz);
  return [
    spec('single', 'Salida', fi, ff, row.calendar_event_id, row.origin, 'Salida')
  ];
};

const buildGoogleCalendarPayload = (row, clientName, vehicleOverride, money = {}, driversLabel = '') => {
  const unidad = resolveUnidadLabel(row, vehicleOverride);
  const specs = buildCalendarEventSpecs(row, clientName, vehicleOverride, money, driversLabel);
  const first = specs[0];
  return ensureCalendarioNombre({
    calendarioNombre: resolveGoogleCalendarDisplayName(),
    unidad,
    modoEventos: specs.length > 1 ? 'dual' : 'single',
    eventos: specs,
    // Compatibilidad con Apps Script legacy (sin array eventos)
    titulo: first?.titulo,
    fechaInicio: first?.fechaInicio,
    fechaFin: first?.fechaFin,
    fechaInicioMs: first?.fechaInicioMs,
    fechaFinMs: first?.fechaFinMs,
    descripcion: first?.descripcion,
    origen: first?.origen,
    destino: first?.destino,
    pasajeros: first?.pasajeros,
    cliente: first?.cliente,
    contrato: first?.contrato,
    itinerario: '',
    eventoId: first?.eventoId || ''
  });
};

const postGoogleCalendarPayload = async (calendarData) => {
  const calendarResponse = await axios.post(
    process.env.GOOGLE_CALENDAR_SCRIPT_URL,
    calendarData,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    }
  );
  const parsed = parseCalendarScriptResponse(calendarResponse.data);
  if (!parsed) {
    const preview =
      typeof calendarResponse.data === 'string'
        ? calendarResponse.data.slice(0, 200)
        : JSON.stringify(calendarResponse.data).slice(0, 200);
    throw new Error(
      `Respuesta inválida del Apps Script (¿URL de implementación incorrecta?): ${preview}`
    );
  }
  return parsed;
};

/** Un evento en formato legacy (un POST = un evento en Calendar). */
const buildSingleEventPayload = (spec, calendarioNombre, unidad) =>
  ensureCalendarioNombre({
    calendarioNombre,
    unidad,
    titulo: spec.titulo,
    fechaInicio: spec.fechaInicio,
    fechaFin: spec.fechaFin,
    fechaInicioMs: spec.fechaInicioMs,
    fechaFinMs: spec.fechaFinMs,
    // Texto completo ya armado; no enviar itinerario suelto para evitar duplicados en Apps Script viejo
    descripcion: spec.descripcion,
    ubicacion: spec.ubicacion,
    origen: '',
    destino: '',
    pasajeros: '',
    cliente: '',
    contrato: '',
    itinerario: '',
    eventoId: spec.eventoId || '',
    kind: spec.kind,
    etiqueta: spec.etiqueta,
    useFullDescription: true
  });

const persistCalendarIds = async (contractId, body, dualMode) => {
  const salidaId = body.eventoSalidaId || body.eventoId || null;
  const regresoId = dualMode ? body.eventoRegresoId || null : null;

  if (dualMode) {
    await pool.query(
      `UPDATE contracts SET
         calendar_event_id = $1,
         calendar_return_event_id = $2,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [salidaId, regresoId, contractId]
    );
  } else {
    await pool.query(
      `UPDATE contracts SET
         calendar_event_id = $1,
         calendar_return_event_id = NULL,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [salidaId, contractId]
    );
  }
};

const resolveDriversLabelFromNotes = (row) => {
  try {
    const notes = row.notes ? JSON.parse(row.notes) : {};
    const names = [];
    if (Array.isArray(notes.assignments)) {
      for (const a of notes.assignments) {
        if (a?.driver_name) names.push(String(a.driver_name).trim());
      }
    }
    if (notes.assignment?.driver_name) {
      names.push(String(notes.assignment.driver_name).trim());
    }
    if (notes.chofer) {
      names.push(String(notes.chofer).trim());
    }
    return [...new Set(names.filter(Boolean))].join(', ');
  } catch {
    return '';
  }
};

const resolveVehicleOverrideForCalendar = async (row, vehicleOverride) => {
  if (vehicleOverride != null && String(vehicleOverride).trim() !== '') {
    const ov = String(vehicleOverride).trim();
    if (ov.includes('·') || ov.includes('(')) return ov;
    try {
      const notes = row.notes ? JSON.parse(row.notes) : {};
      return formatUnidadCalendarLabel({
        unitTypeFromNotes: notes.unitType,
        vehicleCode: notes.vehicle?.vehicle_code,
        plate: ov,
        brand: notes.vehicle?.brand,
        model: notes.vehicle?.model
      });
    } catch {
      return ov;
    }
  }

  let notesUnitType = '';
  let notesVehicle = null;
  try {
    const notes = row.notes ? JSON.parse(row.notes) : {};
    notesUnitType = notes.unitType || '';
    notesVehicle = notes.vehicle || null;
  } catch {
    /* ignore */
  }

  try {
    const vRes = await pool.query(
      `SELECT v.license_plate, v.vehicle_code, v.brand, v.model, v.vehicle_type
       FROM assignments a
       INNER JOIN vehicles v ON v.id = a.vehicle_id
       WHERE a.contract_id = $1
       ORDER BY a.driving_date DESC NULLS LAST, a.id DESC
       LIMIT 1`,
      [row.id]
    );
    const v = vRes.rows[0];
    if (v) {
      return formatUnidadCalendarLabel({
        unitTypeFromNotes: notesUnitType || v.vehicle_type,
        vehicleCode: v.vehicle_code,
        plate: v.license_plate,
        brand: v.brand,
        model: v.model
      });
    }
  } catch {
    /* ignore */
  }

  if (notesVehicle || notesUnitType || row.vehicle_name) {
    return formatUnidadCalendarLabel({
      unitTypeFromNotes: notesUnitType,
      vehicleCode: notesVehicle?.vehicle_code,
      plate: notesVehicle?.license_plate || notesVehicle?.plate || row.vehicle_name,
      brand: notesVehicle?.brand,
      model: notesVehicle?.model
    });
  }

  return null;
};

const syncRowToGoogleCalendar = async (row, clientName, vehicleOverride) => {
  const resolvedVehicle = await resolveVehicleOverrideForCalendar(row, vehicleOverride);

  const [paidRes, driversRes] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM payments WHERE contract_id = $1`,
      [row.id]
    ),
    pool.query(
      `SELECT DISTINCT d.name
       FROM assignments a
       INNER JOIN drivers d ON d.id = a.driver_id
       WHERE a.contract_id = $1 AND d.name IS NOT NULL AND TRIM(d.name) <> ''
       ORDER BY d.name`,
      [row.id]
    )
  ]);
  const totalDue = getContractAmountDueForCalendar(row);
  const anticipo = parseFloat(paidRes.rows[0]?.total) || 0;
  const pendiente = Math.max(0, Math.round((totalDue - anticipo) * 100) / 100);
  const money = { totalDue, anticipo, pendiente };
  const driversFromDb = driversRes.rows.map((r) => r.name).filter(Boolean).join(', ');
  const driversLabel = driversFromDb || resolveDriversLabelFromNotes(row);

  const calendarData = buildGoogleCalendarPayload(
    row,
    clientName,
    resolvedVehicle,
    money,
    driversLabel
  );
  const specs = calendarData.eventos;
  const dualMode = specs.length > 1;
  const calendarioNombre = calendarData.calendarioNombre;
  const unidad = calendarData.unidad;

  const messages = [];
  let eventoSalidaId = null;
  let eventoRegresoId = null;

  // Un POST por evento (compatible con Apps Script legacy y nuevo useFullDescription).
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const singlePayload = buildSingleEventPayload(spec, calendarioNombre, unidad);
    console.log(`Calendar sync event ${i + 1}/${specs.length}:`, {
      kind: spec.kind,
      eventoId: spec.eventoId || '(nuevo)',
      fechaInicio: spec.fechaInicio,
      fechaFin: spec.fechaFin,
      fechaInicioMs: spec.fechaInicioMs,
      fechaFinMs: spec.fechaFinMs
    });

    const body = await postGoogleCalendarPayload(singlePayload);
    console.log(`Calendar sync response ${i + 1}:`, body);

    if (!body || !body.success) {
      throw new Error(
        body?.error ||
          `Calendario falló en evento ${spec.etiqueta || spec.kind || i + 1}`
      );
    }

    const eventId = body.eventoId || body.eventoSalidaId;
    messages.push(body.mensaje || `${spec.etiqueta || spec.kind} OK`);

    if (spec.kind === 'return') {
      eventoRegresoId = eventId;
    } else {
      eventoSalidaId = eventId;
    }
  }

  const aggregatedBody = {
    success: true,
    eventoId: eventoSalidaId,
    eventoSalidaId,
    eventoRegresoId: dualMode ? eventoRegresoId : null,
    mensaje: messages.join('; ')
  };

  await persistCalendarIds(row.id, aggregatedBody, dualMode);

  return {
    body: aggregatedBody,
    dualMode,
    message:
      aggregatedBody.mensaje ||
      (row.calendar_event_id || row.calendar_return_event_id
        ? dualMode
          ? 'Eventos de salida y regreso actualizados en Google Calendar'
          : 'Evento actualizado en Google Calendar'
        : dualMode
          ? 'Eventos de salida y regreso creados en Google Calendar'
          : 'Evento creado en Google Calendar')
  };
};

// Get all contracts
const getAllContracts = async (req, res) => {
  try {
    await ensureContractAdminRefs();
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
    await ensureContractAdminRefs();
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, destination, itinerary, passenger_count, total_amount, status,
      origin_maps, destination_maps,
      notes, vehicle_name, num_units, event_type,
      purchase_order_ref, invoice_ref
    } = req.body;
    
    if (!contract_number) {
      return res.status(400).json({ success: false, error: 'Contract number is required' });
    }

    const poRef = normalizeAdminRef(purchase_order_ref);
    const invRef = normalizeAdminRef(invoice_ref);
    
    const result = await pool.query(
      `INSERT INTO contracts (
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount, status,
        notes, num_units, event_type, purchase_order_ref, invoice_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount,
        status || 'Agendado', notes, num_units, event_type,
        poRef, invRef
      ]
    );
    
    let newContract = result.rows[0];

    if (vehicle_name && process.env.GOOGLE_CALENDAR_SCRIPT_URL) {
      try {
        const clientResult = await pool.query('SELECT name FROM clients WHERE id = $1', [client_id]);
        const clientName = clientResult.rows[0]?.name || 'Cliente';
        await syncRowToGoogleCalendar(newContract, clientName, vehicle_name);
        const updateResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [newContract.id]);
        newContract = updateResult.rows[0];
      } catch (calendarError) {
        console.error('Error creating calendar event on create:', calendarError.message);
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
    await ensureContractAdminRefs();
    const { id } = req.params;
    const {
      contract_number, quote_id, client_id, start_date, end_date,
      origin, origin_maps, destination, destination_maps,
      itinerary, passenger_count, total_amount, status,
      notes, num_units, event_type, vehicle_name, calendar_event_id, calendar_return_event_id,
      purchase_order_ref, invoice_ref
    } = req.body;

    const existing = await pool.query(
      'SELECT calendar_event_id, calendar_return_event_id, purchase_order_ref, invoice_ref FROM contracts WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const prev = existing.rows[0];
    const finalCalendarEventId =
      calendar_event_id !== undefined ? calendar_event_id : prev.calendar_event_id;
    const finalCalendarReturnEventId =
      calendar_return_event_id !== undefined
        ? calendar_return_event_id
        : prev.calendar_return_event_id;
    const finalPoRef =
      purchase_order_ref !== undefined
        ? normalizeAdminRef(purchase_order_ref)
        : prev.purchase_order_ref;
    const finalInvRef =
      invoice_ref !== undefined ? normalizeAdminRef(invoice_ref) : prev.invoice_ref;
    
    const result = await pool.query(
      `UPDATE contracts SET
        contract_number = $1, quote_id = $2, client_id = $3, start_date = $4,
        end_date = $5, origin = $6, origin_maps = $7, destination = $8, destination_maps = $9,
        itinerary = $10, passenger_count = $11, total_amount = $12, status = $13,
        notes = $14, num_units = $15, event_type = $16, vehicle_name = $17,
        calendar_event_id = $18, calendar_return_event_id = $19,
        purchase_order_ref = $20, invoice_ref = $21,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *`,
      [
        contract_number, quote_id, client_id, start_date, end_date,
        origin, origin_maps, destination, destination_maps,
        itinerary, passenger_count, total_amount,
        status,
        notes, num_units, event_type, vehicle_name,
        finalCalendarEventId, finalCalendarReturnEventId,
        finalPoRef, finalInvRef,
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

    const calendarData = buildGoogleCalendarPayload(row, clientName, null);
    console.log('Calendar sync:', {
      calendarioNombre: calendarData.calendarioNombre,
      modoEventos: calendarData.modoEventos,
      eventos: calendarData.eventos.map((e) => ({
        kind: e.kind,
        eventoId: e.eventoId || '(nuevo)',
        fechaInicio: e.fechaInicio,
        fechaFin: e.fechaFin,
        fechaInicioMs: e.fechaInicioMs,
        fechaFinMs: e.fechaFinMs
      }))
    });

    const { message } = await syncRowToGoogleCalendar(row, clientName, null);

    const fresh = await pool.query(
      `SELECT co.*, c.name AS client_name, q.quote_number
       FROM contracts co
       LEFT JOIN clients c ON co.client_id = c.id
       LEFT JOIN quotes q ON co.quote_id = q.id
       WHERE co.id = $1`,
      [id]
    );

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

const ALLOWED_CONTRACT_STATUSES = [
  'Cotización enviada',
  'Orden de compra',
  'Factura enviada',
  'Agendado',
  'En proceso',
  'Realizado',
  'Por cobrar',
  'Por pagar',
  'Cancelado'
];

/**
 * PATCH /contracts/bulk-status
 * Body: { ids: number[], status: string }
 */
const bulkUpdateContractStatus = async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    const idList = Array.isArray(ids)
      ? [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
      : [];

    if (idList.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere al menos un id de contrato' });
    }
    if (!status || !ALLOWED_CONTRACT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Estado inválido. Use uno de: ${ALLOWED_CONTRACT_STATUSES.join(', ')}`
      });
    }

    const result = await pool.query(
      `UPDATE contracts
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2::int[])
       RETURNING id, contract_number, status`,
      [status, idList]
    );

    res.json({
      success: true,
      data: result.rows,
      updated: result.rowCount,
      requested: idList.length
    });
  } catch (error) {
    console.error('Error bulk updating contract status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /contracts/bulk-refs
 * Body: { ids: number[], purchase_order_ref?: string|null, invoice_ref?: string|null }
 * Solo actualiza los campos presentes en el body (permite vaciar con "").
 */
const bulkUpdateContractRefs = async (req, res) => {
  try {
    await ensureContractAdminRefs();
    const { ids, purchase_order_ref, invoice_ref } = req.body || {};
    const idList = Array.isArray(ids)
      ? [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
      : [];

    if (idList.length === 0) {
      return res.status(400).json({ success: false, error: 'Se requiere al menos un id de contrato' });
    }

    const hasPo = Object.prototype.hasOwnProperty.call(req.body || {}, 'purchase_order_ref');
    const hasInv = Object.prototype.hasOwnProperty.call(req.body || {}, 'invoice_ref');
    if (!hasPo && !hasInv) {
      return res.status(400).json({
        success: false,
        error: 'Indique purchase_order_ref y/o invoice_ref'
      });
    }

    const sets = [];
    const params = [];
    let p = 1;
    if (hasPo) {
      sets.push(`purchase_order_ref = $${p++}`);
      params.push(normalizeAdminRef(purchase_order_ref));
    }
    if (hasInv) {
      sets.push(`invoice_ref = $${p++}`);
      params.push(normalizeAdminRef(invoice_ref));
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(idList);

    const result = await pool.query(
      `UPDATE contracts
       SET ${sets.join(', ')}
       WHERE id = ANY($${p}::int[])
       RETURNING id, contract_number, purchase_order_ref, invoice_ref`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      updated: result.rowCount,
      requested: idList.length
    });
  } catch (error) {
    console.error('Error bulk updating contract refs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllContracts,
  getContractById,
  createContract,
  updateContract,
  bulkUpdateContractStatus,
  bulkUpdateContractRefs,
  syncContractCalendar,
  deleteContract
};
