const pool = require('../config/db');

// Get all maintenance records
const getAllMaintenance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, v.vehicle_code, v.brand, v.model, v.license_plate,
        COALESCE(v.vehicle_code, v.license_plate, 'N/A') as vehicle_label,
        pa.account_name
      FROM vehicle_maintenance m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
      ORDER BY m.maintenance_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get maintenance by ID
const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT m.*, v.vehicle_code, v.brand, v.model, v.license_plate, pa.account_name
      FROM vehicle_maintenance m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN payment_accounts pa ON m.payment_account_id = pa.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new maintenance record and register as expense when payment account + cost exist
const createMaintenance = async (req, res) => {
  try {
    const {
      vehicle_id, maintenance_date, mileage, maintenance_type,
      cost, payment_account_id, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vehicle_maintenance (
        vehicle_id, maintenance_date, mileage, maintenance_type,
        cost, payment_account_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [vehicle_id, maintenance_date, mileage || null, maintenance_type, cost || null, payment_account_id || null, notes]
    );

    const maintenance = result.rows[0];
    const costNum = cost != null && cost !== '' ? parseFloat(cost) : 0;
    const accountId = payment_account_id != null && payment_account_id !== '' ? parseInt(payment_account_id, 10) : null;

    // Registrar como egreso si hay costo (ligado a la unidad, no a contrato)
    if (costNum > 0) {
      let vehicleLabel = 'Sin unidad';
      if (vehicle_id) {
        const vResult = await pool.query(
          'SELECT vehicle_code, license_plate, brand, model FROM vehicles WHERE id = $1',
          [vehicle_id]
        );
        if (vResult.rows[0]) {
          const v = vResult.rows[0];
          vehicleLabel = v.vehicle_code || v.license_plate || `${v.brand || ''} ${v.model || ''}`.trim() || 'Sin unidad';
        }
      }
      const expenseNotes = JSON.stringify({
        maintenance_id: maintenance.id,
        vehicle_id: vehicle_id || null,
        vehicle_label: vehicleLabel,
        maintenance_type: maintenance_type || ''
      });

      await pool.query(
        `INSERT INTO expenses (
          contract_id, expense_type, amount, payment_account_id,
          business_unit, expense_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [null, 'Mantenimiento', costNum, accountId, null, maintenance_date, expenseNotes]
      );
    }

    res.status(201).json({ success: true, data: maintenance });
  } catch (error) {
    console.error('Error creating maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update maintenance record and sync linked expense
const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicle_id, maintenance_date, mileage, maintenance_type,
      cost, payment_account_id, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicle_maintenance SET
        vehicle_id = $1, maintenance_date = $2, mileage = $3, maintenance_type = $4,
        cost = $5, payment_account_id = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [vehicle_id, maintenance_date, mileage || null, maintenance_type, cost || null, payment_account_id || null, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    const maintenance = result.rows[0];

    // Actualizar o crear el egreso vinculado (buscar por maintenance_id en notes JSON)
    const expenseResult = await pool.query(
      `SELECT id FROM expenses WHERE notes IS NOT NULL AND (
        notes::text LIKE '%"maintenance_id":' || $1 || ',%' OR
        notes::text LIKE '%"maintenance_id":' || $1 || '}%'
      )`,
      [String(id)]
    );

    if (payment_account_id && cost && parseFloat(cost) > 0) {
      let vehicleLabel = 'Sin unidad';
      if (vehicle_id) {
        const vResult = await pool.query(
          'SELECT vehicle_code, license_plate, brand, model FROM vehicles WHERE id = $1',
          [vehicle_id]
        );
        if (vResult.rows[0]) {
          const v = vResult.rows[0];
          vehicleLabel = v.vehicle_code || v.license_plate || `${v.brand || ''} ${v.model || ''}`.trim() || 'Sin unidad';
        }
      }
      const expenseNotes = JSON.stringify({
        maintenance_id: parseInt(id, 10),
        vehicle_id: vehicle_id || null,
        vehicle_label: vehicleLabel,
        maintenance_type: maintenance_type || ''
      });

      if (expenseResult.rows.length > 0) {
        await pool.query(
          `UPDATE expenses SET
            amount = $1, payment_account_id = $2, expense_date = $3, notes = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5`,
          [parseFloat(cost), payment_account_id, maintenance_date, expenseNotes, expenseResult.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO expenses (
            contract_id, expense_type, amount, payment_account_id,
            business_unit, expense_date, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [null, 'Mantenimiento', parseFloat(cost), payment_account_id, null, maintenance_date, expenseNotes]
        );
      }
    } else if (expenseResult.rows.length > 0) {
      await pool.query('DELETE FROM expenses WHERE id = $1', [expenseResult.rows[0].id]);
    }

    res.json({ success: true, data: maintenance });
  } catch (error) {
    console.error('Error updating maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete maintenance record and linked expense
const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const expenseResult = await pool.query(
      `SELECT id FROM expenses WHERE notes IS NOT NULL AND (
        notes::text LIKE '%"maintenance_id":' || $1 || ',%' OR
        notes::text LIKE '%"maintenance_id":' || $1 || '}%'
      )`,
      [String(id)]
    );
    if (expenseResult.rows.length > 0) {
      await pool.query('DELETE FROM expenses WHERE id = $1', [expenseResult.rows[0].id]);
    }

    const result = await pool.query('DELETE FROM vehicle_maintenance WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found' });
    }

    res.json({ success: true, message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Sincronizar egresos: crear expense para mantenimientos con costo que no tengan egreso vinculado
const syncMaintenanceExpenses = async (req, res) => {
  try {
    const maintenanceResult = await pool.query(
      `SELECT m.*, v.vehicle_code, v.license_plate, v.brand, v.model
       FROM vehicle_maintenance m
       LEFT JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.cost IS NOT NULL AND m.cost > 0`
    );

    const expenseIds = await pool.query(
      `SELECT notes FROM expenses WHERE notes IS NOT NULL AND notes::text LIKE '%maintenance_id%'`
    );
    const existingMaintenanceIds = new Set();
    for (const row of expenseIds.rows) {
      try {
        const notes = JSON.parse(row.notes || '{}');
        if (notes.maintenance_id != null) {
          existingMaintenanceIds.add(notes.maintenance_id);
        }
      } catch {}
    }

    let created = 0;
    for (const m of maintenanceResult.rows) {
      if (existingMaintenanceIds.has(m.id)) continue;

      const vehicleLabel = m.vehicle_code || m.license_plate || `${m.brand || ''} ${m.model || ''}`.trim() || 'Sin unidad';

      const expenseNotes = JSON.stringify({
        maintenance_id: m.id,
        vehicle_id: m.vehicle_id || null,
        vehicle_label: vehicleLabel,
        maintenance_type: m.maintenance_type || ''
      });

      await pool.query(
        `INSERT INTO expenses (
          contract_id, expense_type, amount, payment_account_id,
          business_unit, expense_date, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [null, 'Mantenimiento', parseFloat(m.cost), m.payment_account_id, null, m.maintenance_date, expenseNotes]
      );
      created++;
      existingMaintenanceIds.add(m.id);
    }

    res.json({ success: true, created, message: `Se crearon ${created} egreso(s) de mantenimiento` });
  } catch (error) {
    console.error('Error syncing maintenance expenses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  syncMaintenanceExpenses
};
