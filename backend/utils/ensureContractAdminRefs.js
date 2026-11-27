const pool = require('../config/db');

let ready = false;

/** Idempotente: folios OC/factura en contratos aunque no se haya corrido el SQL a mano. */
async function ensureContractAdminRefs() {
  if (ready) return;
  await pool.query(`
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS purchase_order_ref VARCHAR(100),
      ADD COLUMN IF NOT EXISTS invoice_ref VARCHAR(100)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contracts_purchase_order_ref
      ON contracts (purchase_order_ref)
      WHERE purchase_order_ref IS NOT NULL AND purchase_order_ref <> ''
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contracts_invoice_ref
      ON contracts (invoice_ref)
      WHERE invoice_ref IS NOT NULL AND invoice_ref <> ''
  `);
  ready = true;
}

module.exports = { ensureContractAdminRefs };
