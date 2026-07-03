-- Segundo evento de Google Calendar (regreso) para viajes de varios días

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS calendar_return_event_id VARCHAR(255);

COMMENT ON COLUMN contracts.calendar_return_event_id IS
  'Google Calendar event ID del regreso (evento separado del día de salida)';
