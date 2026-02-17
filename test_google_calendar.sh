#!/bin/bash

# Script de prueba para Google Calendar Integration
# Este script prueba la conexión con Google Apps Script

echo "🧪 Probando conexión con Google Calendar Apps Script..."
echo ""

# URL del Apps Script
SCRIPT_URL="https://script.google.com/macros/s/AKfycbwxYDgipfvmqWjK_1073LaekamCe9TyWdj07Lx7KmMQ1AKAafvAmDKTOZq8iefseXnwSA/exec"

# Datos de prueba
cat > /tmp/test_calendar.json <<EOF
{
  "unidad": "Autobús 1",
  "titulo": "Contrato #2602061647 - Cliente Prueba",
  "descripcion": "Servicio de transporte de prueba",
  "fechaInicio": "2026-02-10T08:00:00",
  "fechaFin": "2026-02-15T18:00:00",
  "origen": "Guadalajara",
  "destino": "Mazatlán",
  "pasajeros": 45,
  "cliente": "Cliente de Prueba",
  "contrato": "2602061647",
  "itinerario": "Día 1 (2026-02-10): Guadalajara → Mazatlán\\nDía 2 (2026-02-11): Mazatlán → Guadalajara"
}
EOF

echo "📤 Enviando datos de prueba..."
echo ""

# Enviar solicitud
RESPONSE=$(curl -s -L -X POST "$SCRIPT_URL" \
  -H "Content-Type: application/json" \
  -d @/tmp/test_calendar.json)

echo "📥 Respuesta recibida:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Limpiar archivo temporal
rm /tmp/test_calendar.json

# Verificar respuesta
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ ¡Prueba exitosa! El evento debería estar en Google Calendar."
  echo ""
  echo "📅 Verifica en: https://calendar.google.com"
  echo "🔍 Busca el calendario: 'Autobús 1'"
  echo "📋 Evento: 'Contrato #2602061647 - Cliente Prueba'"
else
  echo "❌ Error en la prueba. Revisa:"
  echo "  1. ¿Existe el calendario 'Autobús 1' en Google Calendar?"
  echo "  2. ¿El Apps Script está desplegado correctamente?"
  echo "  3. ¿Los permisos están configurados?"
fi

echo ""
echo "Para ejecutar este test:"
echo "  chmod +x test_google_calendar.sh"
echo "  ./test_google_calendar.sh"
