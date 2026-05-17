-- Personal operativo y administrativo (tabla drivers): datos laborales adicionales
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS social_security_number VARCHAR(20);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS curp VARCHAR(18);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS job_title VARCHAR(200);

COMMENT ON COLUMN drivers.start_date IS 'Fecha de inicio en la empresa';
COMMENT ON COLUMN drivers.social_security_number IS 'Número de seguro social (NSS)';
COMMENT ON COLUMN drivers.curp IS 'CURP';
COMMENT ON COLUMN drivers.job_title IS 'Puesto en la empresa';
