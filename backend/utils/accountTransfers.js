const pool = require('../config/db');

const PAYMENT_TYPE_INTERNAL = 'Transferencia interna';
const EXPENSE_TYPE_INTERNAL = 'Transferencia entre cuentas';

function parseNotesJson(notes) {
  try {
    return JSON.parse(notes || '{}');
  } catch {
    return {};
  }
}

/** Elimina el egreso pareja de un pago de transferencia (mismo transfer_pair_id). */
async function deletePairExpenseForPayment(paymentNotes) {
  const j = parseNotesJson(paymentNotes);
  if (!j.transfer_pair_id) return;
  await pool.query(
    `DELETE FROM expenses WHERE expense_type = $1 AND (notes::jsonb->>'transfer_pair_id') = $2`,
    [EXPENSE_TYPE_INTERNAL, j.transfer_pair_id]
  );
}

/** Elimina el ingreso pareja de un egreso de transferencia. */
async function deletePairPaymentForExpense(expenseNotes) {
  const j = parseNotesJson(expenseNotes);
  if (!j.transfer_pair_id) return;
  await pool.query(
    `DELETE FROM payments WHERE payment_type = $1 AND (notes::jsonb->>'transfer_pair_id') = $2`,
    [PAYMENT_TYPE_INTERNAL, j.transfer_pair_id]
  );
}

module.exports = {
  PAYMENT_TYPE_INTERNAL,
  EXPENSE_TYPE_INTERNAL,
  parseNotesJson,
  deletePairExpenseForPayment,
  deletePairPaymentForExpense
};
