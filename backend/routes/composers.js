/**
 * composers.js — Routes for Composer CRUD operations
 * 
 * WHAT THIS FILE DOES:
 * Handles all API endpoints for managing composers:
 *   GET    /api/composers      → List all composers
 *   GET    /api/composers/:id  → Get one composer by ID
 *   POST   /api/composers      → Create a new composer
 *   PUT    /api/composers/:id  → Update an existing composer
 *   DELETE /api/composers/:id  → Delete a composer
 * 
 * USES: Sequelize Composer model (not raw SQL).
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// Get the Composer model from Sequelize.
// This model maps to the 'composers' table in the database.
const { Composer } = db.models;

/**
 * Sanitize user input before saving to the database.
 * Trims whitespace from all string fields to avoid dirty data.
 * Returns a clean object with only the allowed fields.
 */
const sanitize = (body) => ({
  name: String(body.name || '').trim(),
  era: String(body.era || '').trim(),
  work: String(body.work || '').trim(),
  description: String(body.description || '').trim(),
});

// ── GET /api/composers ─ List all composers ─────────────────────────────────
// Returns all composers sorted by newest first (highest id first).
router.get('/', async (req, res) => {
  try {
    const composers = await Composer.findAll({
      order: [['id', 'DESC']],
    });
    res.json(composers);
  } catch (err) {
    console.error('GET /composers error:', err.message);
    res.status(500).json({ error: 'Unable to fetch composers' });
  }
});

// ── GET /api/composers/:id ─ Get one composer ───────────────────────────────
// Looks up a single composer by its primary key (id).
// Returns 404 if no composer exists with that id.
router.get('/:id', async (req, res) => {
  try {
    const composer = await Composer.findByPk(req.params.id);
    if (!composer) {
      return res.status(404).json({ error: 'Composer not found' });
    }
    res.json(composer);
  } catch (err) {
    console.error('GET /composers/:id error:', err.message);
    res.status(500).json({ error: 'Unable to fetch composer' });
  }
});

// ── POST /api/composers ─ Create a new composer ─────────────────────────────
// Requires at least a 'name' field in the request body.
// Returns the newly created composer with its auto-generated id.
router.post('/', async (req, res) => {
  const data = sanitize(req.body);

  // Validate: name is the only required field
  if (!data.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const composer = await Composer.create(data);
    res.status(201).json(composer);
  } catch (err) {
    console.error('POST /composers error:', err.message);
    res.status(500).json({ error: 'Unable to create composer' });
  }
});

// ── PUT /api/composers/:id ─ Update a composer ──────────────────────────────
// Replaces all fields of an existing composer.
// Returns 404 if the composer doesn't exist.
router.put('/:id', async (req, res) => {
  const data = sanitize(req.body);

  if (!data.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const composer = await Composer.findByPk(req.params.id);
    if (!composer) {
      return res.status(404).json({ error: 'Composer not found' });
    }

    // update() saves the new values to the database
    await composer.update(data);
    res.json(composer);
  } catch (err) {
    console.error('PUT /composers/:id error:', err.message);
    res.status(500).json({ error: 'Unable to update composer' });
  }
});

// ── DELETE /api/composers/:id ─ Delete a composer ───────────────────────────
// Permanently removes a composer from the database.
// Returns 404 if the composer doesn't exist.
router.delete('/:id', async (req, res) => {
  try {
    const composer = await Composer.findByPk(req.params.id);
    if (!composer) {
      return res.status(404).json({ error: 'Composer not found' });
    }

    await composer.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /composers/:id error:', err.message);
    res.status(500).json({ error: 'Unable to delete composer' });
  }
});

module.exports = router;
