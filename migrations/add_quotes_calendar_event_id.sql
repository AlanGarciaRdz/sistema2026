-- Add calendar_event_id column to quotes table
-- This allows tracking Google Calendar events from quotes too

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255);

COMMENT ON COLUMN quotes.calendar_event_id IS 'Google Calendar event ID if contract was generated';
