const pool = require('../config/db');

// Get all quotes
const getAllQuotes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.*, c.name as client_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get quote by ID
const getQuoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT q.*, c.name as client_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create new quote
const createQuote = async (req, res) => {
  try {
    const {
      quote_number, client_id, start_date, end_date, origin, destination,
      event_type, itinerary, num_units, passenger_count, total_amount,
      status, valid_until, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO quotes (
        quote_number, client_id, start_date, end_date, origin, destination,
        event_type, itinerary, num_units, passenger_count, total_amount,
        status, valid_until, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        quote_number, client_id, start_date, end_date, origin, destination,
        event_type, itinerary, num_units, passenger_count, total_amount,
        status || 'Pendiente', valid_until, notes
      ]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update quote
const updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quote_number, client_id, start_date, end_date, origin, destination,
      event_type, itinerary, num_units, passenger_count, total_amount,
      status, valid_until, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE quotes SET
        quote_number = $1, client_id = $2, start_date = $3, end_date = $4,
        origin = $5, destination = $6, event_type = $7, itinerary = $8,
        num_units = $9, passenger_count = $10, total_amount = $11,
        status = $12, valid_until = $13, notes = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        quote_number, client_id, start_date, end_date, origin, destination,
        event_type, itinerary, num_units, passenger_count, total_amount,
        status, valid_until, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete quote
const deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM quotes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    
    res.json({ success: true, message: 'Quote deleted successfully' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote
};
