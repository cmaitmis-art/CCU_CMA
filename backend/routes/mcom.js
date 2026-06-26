/**
 * mcom.js — Routes for M.Com (Management Committee) Record Management
 * 
 * WHAT THIS FILE DOES:
 * Handles CRUD operations for M.Com records:
 *   GET    /api/mcom              → List records with search, filter, pagination
 *   GET    /api/mcom/stats/summary → Count records by status
 *   GET    /api/mcom/:id          → Get single record
 *   POST   /api/mcom              → Create new record
 *   PATCH  /api/mcom/:id          → Update a record
 *   DELETE /api/mcom/:id          → Delete a record
 *   POST   /api/mcom/bulk         → Bulk import/upsert from Excel
 *   POST   /api/mcom/bulk-delete  → Delete multiple records by file_no
 * 
 * NOTES:
 * - Uses Sequelize ORM (McomRecord model)
 * - Uses Op.like (NOT Op.iLike) because SQLite doesn't support iLike.
 */

const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const db = require('../db');

// Destructure the model once — cleaner than re-fetching in every handler
const { McomRecord } = db.models;

// ── Helper: Allowed writable columns ────────────────────────────────────────
// Whitelist of columns that can be written. Protects against mass-assignment.
const WRITABLE_COLS = [
  'reg_date', 'old_file_no', 'remark', 'new_file_no',
  'management_corporation_name', 'address', 'units', 'plan_no',
  'secretary', 'secretary_unit_no', 'treasurer', 'treasurer_unit_no',
  'renewal_period', 'agm_date',
  'agm_minutes', 'attendance', 'audited_account', 'building_insurance',
  'renewal_status', 'agm_status',
  'mc_mcom', 'engineer', 'management_assistant',
  'town', 'council', 'certificate_file_no', 'email_address',
  'awareness_date',
  // Filtering / derived columns
  'category', 'year', 'status',
  'created_by', 'modified_by',
];

/**
 * Pick only allowed keys from the request body.
 * Converts empty strings to null for clean database storage.
 */
function pickWritable(body) {
  const out = {};
  for (const col of WRITABLE_COLS) {
    if (col in body) {
      out[col] = body[col] === '' ? null : body[col];
    }
  }
  return out;
}

/**
 * Convert numeric string fields to integers.
 * Handles values like "1,200" → 1200. Invalid values become null.
 */
function coerceInts(data, ...cols) {
  for (const col of cols) {
    if (col in data) {
      const v = data[col];
      if (v === null || v === undefined || v === '') {
        data[col] = null;
        continue;
      }
      const n = parseInt(String(v).replace(/,/g, ''), 10);
      data[col] = Number.isFinite(n) ? n : null;
    }
  }
  return data;
}

/**
 * Resolve the file_no from the request body.
 * Checks body.file_no first, then falls back to new_file_no / old_file_no.
 */
function resolveFileNo(body, data) {
  if (body.file_no) return body.file_no;
  return data.new_file_no || data.old_file_no || null;
}

// ── GET /api/mcom ─ Paginated + filtered list ───────────────────────────────
// Query params: ?q=search &status=Active &year=2024 &category=A &page=1 &limit=20
router.get('/', async (req, res) => {
  try {
    const { q, status, year, category, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

    const where = {};

    // FIX: Changed Op.iLike → Op.like.
    // SQLite does NOT support iLike (that's PostgreSQL only).
    // SQLite's LIKE is already case-insensitive for ASCII letters.
    if (q) {
      where[Op.or] = [
        { file_no: { [Op.like]: `%${q}%` } },
        { new_file_no: { [Op.like]: `%${q}%` } },
        { old_file_no: { [Op.like]: `%${q}%` } },
        { management_corporation_name: { [Op.like]: `%${q}%` } },
        { address: { [Op.like]: `%${q}%` } },
        { secretary: { [Op.like]: `%${q}%` } },
        { treasurer: { [Op.like]: `%${q}%` } },
        { town: { [Op.like]: `%${q}%` } },
      ];
    }

    if (status) where.status = status;
    if (year) where.year = Number(year);
    if (category) where.category = { [Op.like]: `%${category}%` };

    const { rows: records, count: total } = await McomRecord.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [['id', 'DESC']],
      raw: true,
    });

    res.json({ rows: records, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('GET /mcom error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mcom/stats/summary ─ Count by status ───────────────────────────
// NOTE: Must be defined before '/:id' so Express doesn't treat "stats" as an id.
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, active, non_active, pending] = await Promise.all([
      McomRecord.count(),
      McomRecord.count({ where: { status: 'Active' } }),
      McomRecord.count({ where: { status: 'Non Active' } }),
      McomRecord.count({ where: { status: 'Pending' } }),
    ]);

    res.json({ total, active, non_active, pending });
  } catch (err) {
    console.error('GET /mcom/stats/summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/mcom/:id ─ Get single record ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record.toJSON());
  } catch (err) {
    console.error('GET /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom ─ Create new record ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    let data = pickWritable(req.body);
    coerceInts(data, 'units', 'year');

    // Resolve file_no from multiple possible sources
    data.file_no = resolveFileNo(req.body, data);

    if (!data.file_no) {
      return res.status(400).json({ error: 'file_no is required' });
    }

    const record = await McomRecord.create(data);
    res.status(201).json(record.toJSON());
  } catch (err) {
    console.error('POST /mcom error:', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Duplicate file_no' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/mcom/:id ─ Update a record ───────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    let data = pickWritable(req.body);
    coerceInts(data, 'units', 'year');

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    await record.update(data);
    res.json(record.toJSON());
  } catch (err) {
    console.error('PATCH /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/mcom ─ Delete ALL records ───────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    const deleted = await McomRecord.destroy({ where: {} });
    res.json({ message: 'All M.Com records deleted', deleted });
  } catch (err) {
    console.error('DELETE /mcom error:', err.message);
    res.status(500).json({ error: 'Failed to delete all records' });
  }
});

// ── DELETE /api/mcom/:id ─ Delete a record ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const record = await McomRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });

    await record.destroy();
    res.json({ deleted: true, id: record.id });
  } catch (err) {
    console.error('DELETE /mcom/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom/bulk ─ Bulk import/upsert ────────────────────────────────
// Accepts array of records (from Excel). Uses transaction for atomicity.
// Existing records (by file_no) are updated; new ones are inserted.
router.post('/bulk', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || !records.length) {
    return res.status(400).json({ error: 'Expected a non-empty array' });
  }

  const transaction = await db.sequelize.transaction();
  try {
    let inserted = 0;
    let updated = 0;

    for (const rawRec of records) {
      let data = pickWritable(rawRec);
      coerceInts(data, 'units', 'year');

      // Resolve file_no from multiple sources
      const file_no = rawRec.file_no || data.new_file_no || data.old_file_no;
      if (!file_no) continue; // Skip rows without a file number
      data.file_no = file_no;

      // Upsert: create if new, update if exists
      const [instance, created] = await McomRecord.findOrCreate({
        where: { file_no: data.file_no },
        defaults: data,
        transaction,
      });

      if (created) {
        inserted++;
      } else {
        await instance.update(data, { transaction });
        updated++;
      }
    }

    await transaction.commit();
    res.json({ success: true, inserted, updated });
  } catch (err) {
    // Roll back everything if any record fails
    await transaction.rollback();
    console.error('POST /mcom/bulk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/mcom/bulk-delete ─ Delete multiple records by file_no ─────────
router.post('/bulk-delete', async (req, res) => {
  const { file_nos } = req.body;
  if (!Array.isArray(file_nos) || file_nos.length === 0) {
    return res.status(400).json({ error: 'file_nos must be a non-empty array' });
  }

  try {
    const deleted = await McomRecord.destroy({ where: { file_no: file_nos } });
    res.json({ message: 'Deleted records', deleted });
  } catch (err) {
    console.error('POST /mcom/bulk-delete error:', err);
    res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

module.exports = router;
