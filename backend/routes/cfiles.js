/**
 * cfiles.js — Routes for C-File (Complaint File) Management
 * 
 * WHAT THIS FILE DOES:
 * Handles CRUD and bulk operations for C-Files:
 *   GET    /api/cfiles                  → List C-files with search/filter/pagination
 *   GET    /api/cfiles/dashboard/pending → Get old pending C-files (15+ days)
 *   POST   /api/cfiles                  → Create a single C-file
 *   POST   /api/cfiles/bulk             → Bulk import/upsert C-files
 *   POST   /api/cfiles/bulk-delete      → Delete multiple C-files by file_no
 *   DELETE /api/cfiles                  → Delete ALL C-files
 *   DELETE /api/cfiles/:id              → Delete one C-file by ID
 *   PATCH  /api/cfiles/:id              → Update one C-file
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { Op } = require('sequelize');
const { backupAfter } = require('../utils/sqlbackup');

// Get the Cfile model from Sequelize
const { Cfile } = db.models;

// ── GET /api/cfiles ─ List C-files with optional filters ────────────────────
// Query params:
//   ?category=Structural  → filter by category or reason field
//   ?status=Active        → filter by status
//   ?reason=noise         → filter by reason
//   ?q=search             → search across file_no, apartment name, address, etc.
//   ?page=1&limit=100     → pagination
router.get('/', async (req, res) => {
  try {
    const { category, status, q, reason, limit = 100, page = 1 } = req.query;
    const where = {};
    const andConditions = [];

    // Category filter: searches both 'category' and 'reason' columns
    if (category && typeof category === 'string' && category.trim()) {
      const normalizedCategory = category.trim();
      andConditions.push({
        [Op.or]: [
          { category: { [Op.like]: `%${normalizedCategory}%` } },
          { reason: { [Op.like]: `%${normalizedCategory}%` } },
        ],
      });
    }

    // Text search: searches across multiple columns
    if (q) {
      const normalizedQ = q.trim();
      if (normalizedQ) {
        andConditions.push({
          [Op.or]: [
            { file_no: { [Op.like]: `%${normalizedQ}%` } },
            { name_of_apartment: { [Op.like]: `%${normalizedQ}%` } },
            { address: { [Op.like]: `%${normalizedQ}%` } },
            { complainer_details: { [Op.like]: `%${normalizedQ}%` } },
          ],
        });
      }
    }

    // Simple filters
    if (status) where.status = status;
    if (reason) where.reason = { [Op.like]: `%${reason}%` };

    // Combine all AND conditions into the WHERE clause
    if (andConditions.length) {
      where[Op.and] = andConditions;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Cfile.findAndCountAll({
      where,
      order: [['date', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      rows,
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    console.error('GET /cfiles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch C files' });
  }
});

// ── GET /api/cfiles/dashboard/pending ─ Old pending C-files ─────────────────
// Returns C-files that are 15+ days old (pending attention).
// Used on the dashboard to highlight overdue items.
router.get('/dashboard/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    // Calculate the date 15 days ago
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const pendingFiles = await Cfile.findAll({
      where: {
        date: { [Op.lte]: fifteenDaysAgo },
      },
      order: [['date', 'ASC']], // Oldest first (most urgent)
      limit,
    });
    res.json(pendingFiles);
  } catch (err) {
    console.error('GET /cfiles/dashboard/pending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending C files' });
  }
});

// ── POST /api/cfiles ─ Create a single C-file ──────────────────────────────
// Required field: file_no (must be unique)
router.post('/', async (req, res) => {
  const {
    file_no, name_of_apartment, address, date, reason,
    complainer_details, registered_ccu_file_no, remarks,
    category, title, file_type, status = 'Active',
  } = req.body;

  if (!file_no) {
    return res.status(400).json({ error: 'File number is required' });
  }

  try {
    const created_by = req.body.created_by;
    const modified_by = req.body.modified_by;
    const user_name = req.body.user_name || created_by || 'Unknown';
    const initialHistory = [{
      name: user_name,
      action: 'Added',
      time: new Date().toISOString()
    }];

    const cfile = await Cfile.create({
      file_no,
      name_of_apartment,
      address,
      date,
      reason,
      complainer_details,
      registered_ccu_file_no,
      remarks,
      category,
      title: title || name_of_apartment, // Default title to apartment name
      file_type,
      status,
      created_by,
      modified_by,
      history: JSON.stringify(initialHistory),
    });

    // Create a SQL backup after successful write
    await backupAfter(db);
    res.status(201).json(cfile);
  } catch (err) {
    console.error('POST /cfiles error:', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'File number already exists' });
    }
    res.status(500).json({ error: 'Failed to create C file' });
  }
});

// ── POST /api/cfiles/bulk ─ Bulk import C-files ─────────────────────────────
// Accepts an array of C-file records.
// For each record: INSERT if new, UPDATE if file_no already exists.
// FIX: Added proper transaction rollback on failure.
router.post('/bulk', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'No records provided' });
  }

  // Start a database transaction — ensures all-or-nothing
  const transaction = await db.sequelize.transaction();
  try {
    const results = { inserted: 0, updated: 0, failed: 0 };

    for (const rec of records) {
      try {
        if (!rec.file_no) continue; // Skip records without file_no

        const importUser = rec.user_name || rec.created_by || 'Bulk Import';
        const [cfile, created] = await Cfile.findOrCreate({
          where: { file_no: rec.file_no },
          defaults: {
            ...rec,
            history: JSON.stringify([{
              name: importUser,
              action: 'Added',
              time: new Date().toISOString()
            }])
          },
          transaction,
        });

        if (!created) {
          const modified_by = rec.modified_by || rec.user_name || 'Bulk Import Update';
          let history = [];
          try {
            history = cfile.history ? JSON.parse(cfile.history) : [];
          } catch (e) {
            history = [];
          }
          history.push({
            name: modified_by,
            action: 'Modified',
            time: new Date().toISOString()
          });
          await cfile.update({
            ...rec,
            modified_by,
            history: JSON.stringify(history)
          }, { transaction });
          results.updated++;
        } else {
          results.inserted++;
        }
      } catch (e) {
        results.failed++;
      }
    }

    // FIX: Commit only after all records processed successfully
    await transaction.commit();
    res.json({ message: 'Bulk import completed', ...results });
  } catch (err) {
    // FIX: Roll back entire transaction if something goes wrong
    await transaction.rollback();
    console.error('POST /cfiles/bulk error:', err.message);
    res.status(500).json({ error: 'Bulk import failed: ' + err.message });
  }
});

// ── POST /api/cfiles/bulk-delete ─ Delete multiple C-files by file_no ───────
router.post('/bulk-delete', async (req, res) => {
  const { file_nos } = req.body;
  if (!Array.isArray(file_nos) || file_nos.length === 0) {
    return res.status(400).json({ error: 'file_nos must be a non-empty array' });
  }

  try {
    const deleted = await Cfile.destroy({ where: { file_no: file_nos } });
    res.json({ message: 'Deleted records', deleted });
  } catch (err) {
    console.error('POST /cfiles/bulk-delete error:', err.message);
    res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

// ── DELETE /api/cfiles ─ Delete ALL C-files ─────────────────────────────────
// WARNING: This deletes every C-file in the database. Use with caution.
router.delete('/', async (req, res) => {
  try {
    const deleted = await Cfile.destroy({ where: {} });
    res.json({ message: 'All C files deleted', deleted });
  } catch (err) {
    console.error('DELETE /cfiles error:', err.message);
    res.status(500).json({ error: 'Failed to delete all C files' });
  }
});

// ── DELETE /api/cfiles/:id ─ Delete one C-file ──────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Cfile.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ error: 'C file not found' });
    }
    res.json({ message: 'C file deleted' });
  } catch (err) {
    console.error('DELETE /cfiles/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete C file' });
  }
});

// ── PATCH /api/cfiles/:id ─ Update one C-file ──────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const cfile = await Cfile.findByPk(req.params.id);
    if (!cfile) {
      return res.status(404).json({ error: 'C file not found' });
    }

    const modified_by = req.body.modified_by;
    const user_name = req.body.user_name || modified_by || 'Unknown';
    let history = [];
    try {
      history = cfile.history ? JSON.parse(cfile.history) : [];
    } catch (e) {
      history = [];
    }
    history.push({
      name: user_name,
      action: 'Modified',
      time: new Date().toISOString()
    });

    await cfile.update({
      ...req.body,
      modified_by,
      history: JSON.stringify(history)
    });
    res.json(cfile);
  } catch (err) {
    console.error('PATCH /cfiles/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update C file' });
  }
});

module.exports = router;
