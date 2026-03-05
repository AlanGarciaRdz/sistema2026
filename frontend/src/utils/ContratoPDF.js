// import { MoneyFormatter } from '../utils/helpers';
import rklogo from "../images/rklogo";
import conversor from "conversor-numero-a-letras-es-ar";

function Contrato(doc, info, qr, nombre_contrato) {
  console.log(info);
  
  // ============================================
  // PALETA DE COLORES MODERNA - ESTILO TICKET
  // ============================================
  const colors = {
    primary: [37, 99, 235],        // Azul vibrante
    primaryDark: [29, 78, 216],    
    accent: [14, 165, 233],        // Cyan
    success: [34, 197, 94],        // Verde
    warning: [234, 179, 8],        // Amarillo
    dark: [15, 23, 42],            // Slate oscuro
    gray: [100, 116, 139],         // Gris medio
    lightGray: [241, 245, 249],    // Gris claro
    white: [255, 255, 255]
  };

  // ============================================
  // HEADER ESTILO BOARDING PASS
  // ============================================
  
  // Banda superior con degradado simulado
  doc.setFillColor(...colors.white);
  doc.rect(0, 0, doc.internal.pageSize.width, 85, "F");
  
  // Franja decorativa
  doc.setFillColor(...colors.accent);
  doc.rect(0, 75, doc.internal.pageSize.width, 10, "F");

  // Logo
  try {
    doc.addImage(rklogo, "PNG", 20, 15, 110, 35);
  } catch (error) {
    console.log(rklogo);
  }

  // Info empresa - header compacto
  doc.setTextColor(...colors.gray);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(145, 25, "CONTRATO DE TRANSPORTE");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(145, 35, "RECORRIENDO KILOMETROS SA DE CV");
  doc.text(145, 42, "RFC: RKI180820PJA");
  doc.text(145, 49, "PERMISO: 1431RKI28092021041901000");

  // Tarjeta de folio estilo ticket
  doc.setFillColor(...colors.white);
  doc.roundedRect(380, 15, 185, 55, 5, 5, "F");
  
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(390, 25, "FECHA CONTRATO");
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.setFont("helvetica", "bold");
  doc.text(390, 35, info.fechaContrato || info.fecha_contrato || 'N/A');
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(390, 50, "FOLIO");
  doc.setFontSize(13);
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.text(390, 62, info.nombreContrato || info.nombre_contrato || 'N/A');
  doc.setFont("helvetica", "normal");

  // ============================================
  // SECCIÓN 1: PASAJERO (ESTILO TICKET)
  // ============================================
  let starty = 100;

  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, starty, 550, 45, 8, 8, "F");

  starty += 8;
  doc.setFontSize(9);
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty, "CONTRATANTE / CLIENT DETAILS");
  doc.setFont("helvetica", "normal");

  starty += 10;
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty, "NOMBRE CONTRATANTE / CONTRACTING PARTY NAME");
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty + 10, info.contactName || info.nombre_contratante || "NO ESPECIFICADO");
  doc.setFont("helvetica", "normal");

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty + 20, "TEL");
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.text(55, starty + 20, info.contactPhone || info.telefono_contratante || "N/A");

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(350, starty, "ENCARGADO / CONTACT");
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.text(350, starty+10, info.contactEncargado || info.cliente_itinerario || "N/A");

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(350, starty + 20, "TEL");
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.text(380, starty + 20, info.contactEncargadoTel || info.telefono_itinerario || "N/A");

  // ============================================
  // SECCIÓN 2: ITINERARIO (ESTILO BOARDING PASS)
  // ============================================
  starty += 40;

  doc.setFillColor(...colors.white);
  doc.roundedRect(15, starty, 550, 12, 0, 0, "F");
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty + 8, "ITINERARIO / ITINERARY");
  doc.setFont("helvetica", "normal");

  starty += 12;
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.5);
  doc.roundedRect(15, starty, 550, 110, 8, 8, "FD");

  starty += 12;

  // Destino principal
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty, "DESTINO / DESTINATION");
  doc.setFontSize(11);
  doc.setTextColor(...colors.dark);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty + 12, info.destination || info.destino_itinerario || "N/A");
  doc.setFont("helvetica", "normal");
  // Grid de información tipo boarding pass
  starty += 25;
  
  // Fila 1: Fechas y horas
  const drawInfoBox = (label, value, x, y, width = 120) => {
    doc.setFillColor(...colors.lightGray);
    doc.roundedRect(x, y, width, 25, 3, 3, "F");
    
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    doc.text(x + 5, y + 6, label);
    
    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text(x + 5, y + 16, value || "N/A");
    doc.setFont("helvetica", "normal");
  };

  drawInfoBox("SALIDA / DEPARTURE", info.fechaSalida || info.fechasalida_itinerario, 25, starty, 130);
  drawInfoBox("PRESENTARSE", info.presentarse || info.presentarse_itinerario, 165, starty, 80);
  drawInfoBox("HORA SALIDA / TIME", info.horaSalida || info.horasalida_itinerario, 285, starty, 80);
  drawInfoBox("REGRESO / RETURN", info.fechaRegreso || info.fecharegreso_itinerario, 385, starty, 85);
  drawInfoBox("HORA REGRESO / TIME", info.horaRegreso || info.horaregreso_itinerario, 480, starty, 80);

  starty += 35;

  // Dirección de salida
  doc.setFontSize(6);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty, "PUNTO DE SALIDA / PICKUP LOCATION");
  doc.setFontSize(9);
  doc.setTextColor(...colors.dark);
  let splitDireccion = doc.splitTextToSize(info.origin || info.direccionsalida_itinerario || "N/A", 350);
  doc.text(splitDireccion, 25, starty + 9);

  // Referencias
  doc.setFontSize(6);
  doc.setTextColor(...colors.gray);
  doc.text(390, starty, "REFERENCIA / LANDMARK");
  doc.setFontSize(8);
  doc.setTextColor(...colors.dark);
  let splitRef = doc.splitTextToSize(info.referencias || info.referencias_itinerario || "N/A", 165);
  doc.text(splitRef, 390, starty + 7);

  // ============================================
  // DETALLES DEL VIAJE
  // ============================================
  starty += 37;
  
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(234, 179, 8);
  doc.setLineWidth(1);
  doc.roundedRect(15, starty + 3, 550, 60, 5, 5, "FD");

  doc.setFontSize(7);
  doc.setTextColor(...colors.warning);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty + 9, "DETALLES DEL VIAJE / TRIP DETAILS");
  doc.setFont("helvetica", "normal");

  doc.setFontSize(8);
  doc.setTextColor(...colors.dark);
  const detalles = [info.detalles_itinerario, info.itineraryText, info.notes].filter(Boolean).join('\n') || "Sin detalles adicionales";
  let splitDetalles = doc.splitTextToSize(detalles, 520);
  doc.text(splitDetalles, 25, starty + 18);

  // ============================================
  // UNIDAD Y EQUIPAMIENTO (COMPACTO)
  // ============================================
  starty += 70;

  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, starty, 265, 55, 8, 8, "F");
  
  starty += 8;
  doc.setFontSize(9);
  doc.setTextColor(...colors.primary);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty, "UNIDAD / VEHICLE");
  doc.setFont("helvetica", "normal");

  starty += 10;
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty, "TIPO");
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.setFont("helvetica", "bold");
  doc.text(25, starty + 9, info.unitType || info.unidad_unidad || "N/A");
  doc.setFont("helvetica", "normal");

  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(180, starty, "CAPACIDAD");
  doc.setFontSize(10);
  doc.setTextColor(...colors.dark);
  doc.setFont("helvetica", "bold");
  doc.text(180, starty + 8, String(info.capacity ?? info.capacidad_unidad ?? "N/A"));
  doc.setFont("helvetica", "normal");

  starty += 18;
  doc.setFontSize(6);
  doc.setTextColor(...colors.gray);
  doc.text(25, starty, "INCLUYE / INCLUDES");

  starty += 10;
  doc.setFontSize(7);
  doc.setTextColor(...colors.dark);

  const equipos = [
    { label: "A/C", value: info.ACC_unidad ?? true },
    { label: "Sanitario", value: info.sanitarios_unidad },
    { label: "TV/DVD", value: info.tvdvd_unidad ?? true },
    { label: "Micrófono", value: info.microfono_unidad },
    { label: "Estéreo", value: info.estereo_unidad ?? true },
    { label: "Seguro", value: true }
  ];

  let xPos = 25;
  equipos.forEach((equipo) => {
    if (equipo.value) {
      doc.setFillColor(...colors.success);
      doc.circle(xPos, starty - 1, 2, "F");
      doc.setTextColor(...colors.dark);
      doc.text(xPos + 4, starty, equipo.label);
      xPos += 40;
    }
  });

  // ============================================
  // PAGOS (ESTILO TARJETA)
  // ============================================
  let pagoStartY = starty - 47;
  
  doc.setFillColor(...colors.primary);
  doc.roundedRect(290, pagoStartY, 275, 65, 8, 8, "F");

  pagoStartY += 8;
  doc.setTextColor(...colors.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(300, pagoStartY, "PAGOS / PAYMENT");
  doc.setFont("helvetica", "normal");

  let ClaseConversor = conversor.conversorNumerosALetras;
  let miConversor = new ClaseConversor();

  pagoStartY += 13;
  
  const drawPagoLine = (label, valor, y) => {
    doc.setFontSize(7);
    doc.setTextColor(199, 210, 254);
    doc.text(300, y, label);
    
    doc.setFontSize(11);
    doc.setTextColor(...colors.white);
    doc.setFont("helvetica", "bold");
    
    doc.text(337, y, `$${valor}`);
    
    doc.setFont("helvetica", "normal");
  };

  const totalVal = info.total ?? info.total_pagos ?? 0;
  const anticipoVal = info.anticipo ?? info.anticipo_pagos ?? Math.round(totalVal * 0.5);
  const pendienteVal = info.pendiente ?? info.pendiente_pagos ?? (totalVal - anticipoVal);
  drawPagoLine("TOTAL", totalVal, pagoStartY);
  drawPagoLine("ANTICIPO", anticipoVal, pagoStartY + 15);
  drawPagoLine("SALDO", pendienteVal, pagoStartY + 33);

  // ============================================
  // NOTA IMPORTANTE
  // ============================================
  starty += 20;
  
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(1);
  doc.roundedRect(15, starty, 550, 22, 5, 5, "FD");
  
  doc.setFontSize(7);
  doc.setTextColor(153, 27, 27);
  doc.setFont("helvetica", "bold");
  let splitImportante = doc.splitTextToSize(
    "⚠ IMPORTANTE: TRASLADO O PASEO EXTRA NO ESPECIFICADO TIENE COSTO EXTRA Y TENDRA QUE SER LIQUIDADO AL MOMENTO DE REALIZARLO DIRECTO CON EL OPERADOR",
    350
  );
  doc.text(splitImportante, 25, starty + 10);
  doc.setFont("helvetica", "normal");

  // ============================================
  // TÉRMINOS COMPACTOS
  // ============================================
  starty += 35;

  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, starty, 550, 8, 0, 0, "F");
  
  doc.setTextColor(...colors.primary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(290, starty + 6, "TÉRMINOS Y CONDICIONES", "center");
  doc.setFont("helvetica", "normal");

  starty += 8;
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.gray);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, starty, 550, 270, 5, 5, "D");

  starty += 8;
  doc.setFontSize(6.5);
  doc.setTextColor(...colors.dark);

  const terminos = [
    `PRIMERA. Objeto. El "CLIENTE" contrata los servicios de "Recorriendo kilómetros SA de CV" a fin de que este último proporcione el servicio de transportación de pasajeros que detalla en la carátula.`,
  
    `SEGUNDA. "Recorriendo kilometros SA de CV" se obliga a mantener vigente la póliza de seguro de viajero por cada una de las unidades de transporte que utilice para dar el servicio materia del presente contrato, teniendo una cobertura de hasta 5000 UMA por pasajero, misma que cubre daños causados a los pasajeros durante el uso de la unidades de transporte hasta por dicho monto.`,
  
    `TERCERA: Pago: El "CLIENTE" se compromete a apartar el servicio descrito en la cláusula primera con un 50% del total y el resto liquidarlo a más tardar un día antes del primer trayecto descrito en dicha cláusula. En caso de que "EL CLIENTE" solicite exceder el kilometraje respecto al servicio descrito en la primera cláusula, éste se obligará a liquidar previo a la realización de la extensión requerida las siguientes tarifas: Autobús Turístico de Lujo: $100 pesos por kilómetro excedido  Camion Tipo Escolar: $35 pesos por kilómetro excedido. Sprinter Mercedes Benz: $29 pesos por kilómetro excedido  Van Hiace o Urvan: $20 pesos por kilómetro excedido. Auto 4-6 plazas: $18 pesos por kilómetro excedido.`,
  
    `CUARTA. Conducta de los Usuarios. El "CLIENTE" se compromete a mantener en buen estado los interiores de las unidades y observar el buen comportamiento a bordo, así mismo, los pasajeros se abstendrán de fumar, ingerir bebidas alcohólicas o consumir enervantes o estupefacientes dentro de las unidades de "Recorriendo kilómetros SA de CV". El "CLIENTE" se obliga a indemnizar a "Recorriendo kilómetros SA de CV" de cualquier daño que ocurriera a las unidades por culpa, dolo o negligencia por parte de los pasajeros. El monto del daño será facturado por "Recorriendo kilómetros SA de CV" anexando la cotización del proveedor que lleve a cabo la reparación.`,
  
    `QUINTA. "Recorriendo kilometros SA de CV" se reserva el derecho de la subcontratación en el caso que así se requiera para cubrir un servicio y/o emergencias o imprevistos. En caso de la subcontratación para cubrir algún servicio, "Recorriendo kilómetros SA de CV" es responsable y está obligado a cumplir con el servicio estipulado en el presente contrato en igualdad de condiciones.`,
  
    `SEXTA: Derechos y Obligaciones."Recorriendo kilometros SA de CV" se obliga a: Asignar la unidad contratada en el lugar, fecha y hora estipulados en la cláusula primera.Asignar unidades en buenas condiciones mecánicas de higiene y seguridad. Reemplazar por unidades similares a las contratadas en caso de descompostura en un plazo máximo de dos veces el tiempo del recorrido del punto donde haya sucedido la descompostura respecto a la base de "Recorriendo kilómetros SA de CV" en Guadalajara.`,
  
    `"Recorriendo kilometros SA de CV" tiene el derecho de: Suspender el servicio en caso de que esté en riesgo la integridad de los pasajeros y/o de la unidad que brinda el servicio de transporte mencionando de forma enunciativa más no limitativa: Camino en mal estado, brechas angostas, tramos en reparación con alto riesgo, zonas con riesgo de delincuencia, inundaciones o deslaves, bloqueos o accidentes y demás situaciones que estén fuera del control de "Recorriendo kilómetros SA de CV". Suspender el servicio en caso de mal comportamiento dentro de la unidad de transporte por parte de los pasajeros tales como disturbios, riñas, consumo de drogas, alcohol, comportamientos inmorales, entre otros. En caso de que un pasajero o grupo de personas irrumpiera el servicio en un lugar intermedio por causas no imputables a "Recorriendo kilómetros SA de CV", el "CLIENTE" no tendrá derecho a reembolso alguno. "Recorriendo kilómetros SA de CV" no se hace responsable por objetos olvidados, perdidos o robados dentro de la unidad del servicio de transporte durante ni después del recorrido, tampoco se hace responsable por pérdidas de conexiones de vuelos o por tierra de los pasajeros. La responsabilidad de "Recorriendo kilómetros SA de CV" ante cualquier imprevisto no podrá ser superior al valor total del servicio descrito en la primera cláusula. El "CLIENTE" se obliga a: No exceder la capacidad de las unidades asignadas para el servicio descrito en la cláusula primera, en caso de hacerlo, "Recorriendo kilómetros SA de CV" no se hace responsable de ningún daño ocurrido a los pasajeros durante el servicio. Que los pasajeros se encuentren en el lugar acordado con un máximo de tolerancia de media hora de retraso respecto a la hora de salida y regreso de los lugares de origen, destino o trayectos intermedios que se visiten asignados en los detalles del servicio de la cláusula primera.`,
  
    `SÉPTIMA. Convienen ambas partes en que en el presente contrato no existe lesión, dolo, error, violencia o coacción alguna. Para todo lo relativo a la interpretación, cumplimiento y ejecución del presente contrato, las partes acuerdan someterse a la jurisdicción de los tribunales de la Ciudad de Guadalajara Jalisco, renunciando por lo tanto a cualquier fuero que pudieran tener en razón de sus domicilios actuales o futuros, señalando para recibir cualquier aviso o notificación al respecto, sus domicilios asentados en las Declaraciones de este contrato.`
  ];

  terminos.forEach((termino, index) => {
    let splitTermino = doc.splitTextToSize(termino, 530);
    doc.text(splitTermino, 25, starty);
    starty += (splitTermino.length * 7) + 4;
  
  });

  // ============================================
  // FIRMAS Y QR (ESTILO MODERNO)
  // ============================================
  
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(15, starty, 550, 60, 8, 8, "F");

  starty += 10;
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  let aceptacion = doc.splitTextToSize(
    "He leído y acepto los términos y condiciones del servicio de transporte.",
    380
  );
  doc.text(aceptacion, 25, starty);

  starty += 18;

  // Líneas de firma modernas
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1);
  doc.line(40, starty, 180, starty);
  doc.line(220, starty, 360, starty);

  // QR Code
  try {
    doc.addImage(qr, "png", 510, starty - 30, 40, 40);
    doc.setFontSize(6);
    doc.setTextColor(...colors.gray);
    doc.text(530, starty + 15, info.nombreContrato || info.nombre_contrato || "", "center");
  } catch (error) {
    console.log(qr);
  }

  starty += 8;
  doc.setFontSize(7);
  doc.setTextColor(...colors.gray);
  doc.text(110, starty, "FIRMA DEL CLIENTE", "center");
  doc.text(290, starty, "FIRMA DEL PROVEEDOR", "center");

  // Nota final compacta
  starty += 12;
  doc.setFontSize(6);
  doc.setTextColor(...colors.gray);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Anticipo 20% a la firma. Saldo una semana antes del viaje.",
    290,
    starty,
    "center"
  );
}

const exportedObject = {
  Contrato
};

export default exportedObject;
