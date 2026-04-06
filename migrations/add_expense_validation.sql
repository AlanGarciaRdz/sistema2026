-- Gastos del portal chofer: validación administrativa
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'approved';
UPDATE expenses SET validation_status = 'approved' WHERE validation_status IS NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS driver_payment_method VARCHAR(40);

COMMENT ON COLUMN expenses.validation_status IS 'approved | pending | rejected (pending = chofer, falta validar)';
COMMENT ON COLUMN expenses.driver_payment_method IS 'Efectivo | Depósito | Transferencia (reportado por chofer)';
