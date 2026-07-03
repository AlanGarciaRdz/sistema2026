/**
 * Google Apps Script — calendario de contratos (backend contractsController).
 *
 * Soporta:
 *   - eventos[]: uno o dos eventos (salida + regreso en días distintos)
 *   - eventoId en cada ítem → actualizar; si no existe → crear
 *
 * Desplegar como app web: POST, ejecutar como tú, acceso "Cualquiera".
 * Tras editar este archivo, crea una NUEVA implementación en Apps Script.
 */

var CALENDARIO_FALLBACK = 'Gua Gua';

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonOut({ success: false, error: 'Sin cuerpo POST' });
    }

    var datos = JSON.parse(e.postData.contents);
    Logger.log('Datos recibidos: ' + JSON.stringify(datos, null, 2));

    var nombreCalendario = '';
    if (datos.calendarioNombre != null && String(datos.calendarioNombre).trim() !== '') {
      nombreCalendario = String(datos.calendarioNombre).trim();
    } else {
      nombreCalendario = CALENDARIO_FALLBACK;
    }

    var calendario = buscarCalendarioPorNombre(nombreCalendario);
    if (!calendario) {
      return jsonOut({
        success: false,
        error: 'No se encontró el calendario: "' + nombreCalendario + '"'
      });
    }

    if (datos.eventos && datos.eventos.length) {
      return procesarListaEventos(datos.eventos, calendario);
    }

    return procesarEventoLegacy(datos, calendario);
  } catch (error) {
    Logger.log('Error: ' + error);
    return jsonOut({
      success: false,
      error: error.toString ? error.toString() : String(error)
    });
  }
}

function procesarListaEventos(eventos, calendario) {
  var ids = [];
  var mensajes = [];
  var eventoSalidaId = null;
  var eventoRegresoId = null;

  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i];
    var resultado = crearOActualizarEvento(calendario, ev);
    if (!resultado.success) {
      return jsonOut(resultado);
    }
    ids.push(resultado.eventoId);
    mensajes.push(resultado.mensaje);

    var kind = (ev.kind || ev.etiqueta || '').toLowerCase();
    if (kind === 'departure' || kind === 'salida') {
      eventoSalidaId = resultado.eventoId;
    } else if (kind === 'return' || kind === 'regreso') {
      eventoRegresoId = resultado.eventoId;
    }
  }

  if (!eventoSalidaId && ids.length) eventoSalidaId = ids[0];
  if (!eventoRegresoId && ids.length > 1) eventoRegresoId = ids[1];

  return jsonOut({
    success: true,
    eventoId: eventoSalidaId,
    eventoSalidaId: eventoSalidaId,
    eventoRegresoId: eventoRegresoId,
    calendarioUsado: calendario.getName(),
    mensaje: mensajes.join('; ')
  });
}

/**
 * Apps Script (Rhino) no parsea bien ISO con offset (-06:00). Preferir fechaInicioMs/fechaFinMs.
 */
function parseEventDate(obj, which) {
  var msKey = which === 'start' ? 'fechaInicioMs' : 'fechaFinMs';
  var isoKey = which === 'start' ? 'fechaInicio' : 'fechaFin';
  if (obj[msKey] != null && !isNaN(Number(obj[msKey]))) {
    return new Date(Number(obj[msKey]));
  }
  var raw = obj[isoKey];
  if (raw == null || String(raw).trim() === '') return null;

  var d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  var s = String(raw).trim();
  var m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2}|Z)?$/
  );
  if (m) {
    var rebuilt =
      m[1] +
      '-' +
      m[2] +
      '-' +
      m[3] +
      'T' +
      m[4] +
      ':' +
      m[5] +
      ':' +
      (m[6] || '00') +
      (m[7] || '');
    d = new Date(rebuilt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function crearOActualizarEvento(calendario, ev) {
  var fechaInicio = parseEventDate(ev, 'start');
  var fechaFin = parseEventDate(ev, 'end');
  if (!fechaInicio || !fechaFin) {
    return {
      success: false,
      error:
        'fechaInicio o fechaFin no válidas en evento ' +
        (ev.etiqueta || ev.kind || '') +
        ' (inicio=' +
        (ev.fechaInicio || ev.fechaInicioMs) +
        ', fin=' +
        (ev.fechaFin || ev.fechaFinMs) +
        ')'
    };
  }

  if (fechaFin <= fechaInicio) {
    fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);
  }

  var titulo = ev.titulo || 'Contrato ' + (ev.contrato || '');
  var descripcion = ev.descripcion || '';
  var ubicacion = ev.ubicacion || ev.origen || '';
  var eventoId = ev.eventoId != null ? String(ev.eventoId).trim() : '';

  if (eventoId) {
    var existente = obtenerEventoPorId(eventoId, calendario);
    if (existente) {
      existente.setTitle(titulo);
      existente.setTime(fechaInicio, fechaFin);
      existente.setDescription(descripcion);
      existente.setLocation(ubicacion);
      return {
        success: true,
        eventoId: existente.getId(),
        mensaje: (ev.etiqueta || titulo) + ' actualizado'
      };
    }
    Logger.log('No se encontró eventoId para actualizar: ' + eventoId + ', se creará nuevo');
  }

  var nuevo = calendario.createEvent(titulo, fechaInicio, fechaFin, {
    description: descripcion,
    location: ubicacion
  });

  return {
    success: true,
    eventoId: nuevo.getId(),
    mensaje: (ev.etiqueta || titulo) + ' creado'
  };
}

/** Busca evento en todos los calendarios del usuario (más confiable que solo calendario local). */
function obtenerEventoPorId(eventoId, calendario) {
  try {
    var global = CalendarApp.getEventById(eventoId);
    if (global) return global;
  } catch (e1) {
    Logger.log('CalendarApp.getEventById: ' + e1);
  }
  try {
    return calendario.getEventById(eventoId);
  } catch (e2) {
    Logger.log('calendario.getEventById: ' + e2);
  }
  return null;
}

function procesarEventoLegacy(datos, calendario) {
  var fechaInicio = parseEventDate(datos, 'start');
  var fechaFin = parseEventDate(datos, 'end');
  if (!fechaInicio || !fechaFin) {
    return jsonOut({
      success: false,
      error:
        'fechaInicio o fechaFin no válidas (legacy). Redespliega el Apps Script con soporte eventos[]'
    });
  }

  var unidadTxt = (datos.unidad != null && String(datos.unidad).trim() !== '')
    ? String(datos.unidad).trim()
    : '-';

  var descripcion = [
    'CONTRATO: ' + (datos.contrato || ''),
    'CLIENTE: ' + (datos.cliente || ''),
    'UNIDAD: ' + unidadTxt,
    'PASAJEROS: ' + (datos.pasajeros != null ? datos.pasajeros : ''),
    'ORIGEN: ' + (datos.origen || ''),
    'DESTINO: ' + (datos.destino || '')
  ].join('\n');

  if (datos.itinerario) descripcion += '\n\nITINERARIO:\n' + datos.itinerario;
  if (datos.descripcion) descripcion += '\n\n' + datos.descripcion;

  var ev = {
    titulo: datos.titulo || ('Contrato ' + (datos.contrato || '')),
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    fechaInicioMs: datos.fechaInicioMs,
    fechaFinMs: datos.fechaFinMs,
    descripcion: descripcion.trim(),
    ubicacion: datos.origen || '',
    eventoId: datos.eventoId || '',
    etiqueta: 'Servicio'
  };

  var resultado = crearOActualizarEvento(calendario, ev);
  if (!resultado.success) {
    return jsonOut(resultado);
  }

  return jsonOut({
    success: true,
    eventoId: resultado.eventoId,
    eventoSalidaId: resultado.eventoId,
    eventoRegresoId: null,
    calendarioUsado: calendario.getName(),
    mensaje: resultado.mensaje
  });
}

function buscarCalendarioPorNombre(nombre) {
  var porNombre = CalendarApp.getCalendarsByName(nombre);
  if (porNombre && porNombre.length) return porNombre[0];

  var todos = CalendarApp.getAllCalendars();
  var busqueda = nombre.toLowerCase().trim();
  for (var i = 0; i < todos.length; i++) {
    if (todos[i].getName().toLowerCase().trim() === busqueda) return todos[i];
  }
  return null;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
