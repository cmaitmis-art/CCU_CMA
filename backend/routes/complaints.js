/**
 * complaints.js — Routes for Complaint Management
 * 
 * WHAT THIS FILE DOES:
 * Manages the full lifecycle of a complaint:
 *   1. Citizen files a complaint        → POST /api/complaints
 *   2. Admin assigns it to DGM          → PATCH /:id/assign-dgm
 *   3. DGM approves/rejects             → PATCH /:id/dgm-approval
 *   4. If approved, assign Legal Officer → PATCH /:id/assign-legal
 *   5. Legal Officer resolves it         → PATCH /:id/resolve
 * 
 * Also provides:
 *   - List with pagination/filtering    → GET /
 *   - Dashboard pending list            → GET /dashboard/pending
 *   - Statistics summary                → GET /stats/summary
 *   - Get single complaint              → GET /:id
 *   - Update status                     → PATCH /:id/status
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { Op } = require('sequelize');

// Destructure all needed models from db.models.
// FIX: ComplaintCategory was missing before — caused a crash when
// fetching complaints with 'include: [ComplaintCategory]'.
const { Complaint, ComplaintApproval, ComplaintCategory, ManagementCorporation } = db.models;

/**
 * Calculate how many days a complaint has been pending.
 * Takes a plain complaint object and adds/updates the 'days_pending' field.
 * 
 * HOW IT WORKS:
 * - Subtracts complaint_date from today to get milliseconds
 * - Divides by (1000 * 60 * 60 * 24) to convert ms → days
 * - Uses Math.floor to round down (3.7 days → 3 days)
 */
const addDaysPending = (complaint) => ({
  ...complaint,
  days_pending: Math.floor(
    (new Date() - new Date(complaint.complaint_date)) / (1000 * 60 * 60 * 24)
  ),
});

// List of columns to return when querying complaints.
// This prevents exposing any internal/sensitive columns accidentally.
const complaintAttributes = [
  'id', 'complaint_no', 'mc_id', 'category_id',
  'complainant_name', 'complainant_email', 'complainant_phone',
  'complaint_date', 'subject', 'description',
  'status', 'priority', 'days_pending',
  'assigned_to_dgm', 'dgm_assigned_date', 'dgm_approval_status', 'dgm_notes',
  'legal_officer_assigned', 'legal_officer_date', 'legal_officer_notes',
  'resolution_date', 'resolution_notes',
  'created_at', 'updated_at',
];

// ── GET /api/complaints ─ Paginated list with optional status filter ────────
// Query params:
//   ?status=Pending  → filter by status
//   ?page=1&limit=10 → pagination
//   ?sort=asc|desc   → sort order by created_at
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 10, sort = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause: only add status filter if provided
    const where = status ? { status } : {};

    const total = await Complaint.count({ where });
    const complaints = await Complaint.findAll({
      where,
      order: [['created_at', sort === 'asc' ? 'ASC' : 'DESC']],
      limit: Number(limit),
      offset: Number(offset),
      attributes: complaintAttributes,
      // JOIN with ManagementCorporation and ComplaintCategory tables
      // to include the MC name and category name in the response.
      include: [
        { model: ManagementCorporation, attributes: ['name'] },
        { model: ComplaintCategory, attributes: ['name'] },
      ],
    });

    // Transform each row: add days_pending and flatten joined names
    res.json({
      complaints: complaints.map((complaint) => {
        const plain = complaint.get({ plain: true });
        return {
          ...addDaysPending(plain),
          mc_name: plain.ManagementCorporation?.name || null,
          category_name: plain.ComplaintCategory?.name || null,
        };
      }),
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (err) {
    console.error('GET /complaints error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// ── POST /api/complaints ─ Create a new complaint ───────────────────────────
// Required fields: complainant_name, subject
// Auto-generates a unique complaint number like "CMP-2026-1718617000123"
router.post('/', async (req, res) => {
  const {
    mc_id, category_id, complainant_name, complainant_email, complainant_phone,
    subject, description, complaint_date, priority = 'Normal',
  } = req.body;

  // Validate required fields
  if (!complainant_name || !subject) {
    return res.status(400).json({ error: 'Name and subject required' });
  }

  // FIX: Previously used Math.random() which could produce duplicates.
  // Now uses Date.now() (millisecond timestamp) for uniqueness.
  const complaint_no = `CMP-${new Date().getFullYear()}-${Date.now()}`;

  try {
    // created_by / modified_by must come from logged-in user
    const created_by = req.body.created_by;
    const modified_by = req.body.modified_by;

    const complaint = await Complaint.create({
      complaint_no,
      mc_id,
      category_id,
      complainant_name,
      complainant_email,
      complainant_phone,
      subject,
      description,
      // Use provided date, or default to today's date (YYYY-MM-DD format)
      complaint_date: complaint_date || new Date().toISOString().split('T')[0],
      priority,
      status: 'Pending',
      created_by,
      modified_by,
    });

    res.status(201).json({ id: complaint.id, complaint_no });
  } catch (err) {
    console.error('POST /complaints error:', err.message);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// ── PATCH /api/complaints/:id/status ─ Update complaint status ──────────────
// Used by admin to manually change status (e.g., "Pending" → "Open")
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });

  try {
    const modified_by = req.body.modified_by;

    const [updated] = await Complaint.update(
      { status, modified_by },
      { where: { id: req.params.id } }
    );

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Complaint status updated' });
  } catch (err) {
    console.error('PATCH /complaints/:id/status error:', err.message);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// ── PATCH /api/complaints/:id/assign-dgm ─ Assign complaint to DGM ─────────
// When a complaint is assigned to DGM, its status changes to "DGM Review".
router.patch('/:id/assign-dgm', async (req, res) => {
  const { assigned_to_dgm } = req.body;
  if (!assigned_to_dgm) return res.status(400).json({ error: 'DGM required' });

  try {
    const modified_by = req.body.modified_by;

    const [updated] = await Complaint.update(
      {
        assigned_to_dgm,
        dgm_assigned_date: new Date().toISOString(),
        status: 'DGM Review',
        modified_by,
      },
      { where: { id: req.params.id } }
    );

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Assigned to DGM' });
  } catch (err) {
    console.error('PATCH /complaints/:id/assign-dgm error:', err.message);
    res.status(500).json({ error: 'Failed to assign DGM' });
  }
});

// ── PATCH /api/complaints/:id/dgm-approval ─ DGM approves or rejects ───────
// If DGM approves → status becomes "Legal Review" (goes to Legal Officer)
// If DGM rejects → status becomes "Rejected"
// Also creates an approval record in complaint_approvals for audit trail.
router.patch('/:id/dgm-approval', async (req, res) => {
  const { dgm_approval_status, dgm_notes } = req.body;
  if (!dgm_approval_status) {
    return res.status(400).json({ error: 'Approval status required' });
  }

  try {
    // Determine next status based on DGM's decision
    const status = dgm_approval_status === 'Approved' ? 'Legal Review' : 'Rejected';

    const modified_by = req.body.modified_by;

    const [updated] = await Complaint.update(
      { dgm_approval_status, dgm_notes, status, modified_by },
      { where: { id: req.params.id } }
    );

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });

    // Create an audit trail record in the complaint_approvals table
    await ComplaintApproval.create({
      complaint_id: req.params.id,
      approved_by: req.body.dgm_officer || 'DGM',
      approval_type: 'DGM',
      approval_status: dgm_approval_status,
      notes: dgm_notes,
    });

    res.json({ message: 'DGM approval recorded' });
  } catch (err) {
    console.error('PATCH /complaints/:id/dgm-approval error:', err.message);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

// ── PATCH /api/complaints/:id/assign-legal ─ Assign to Legal Officer ────────
router.patch('/:id/assign-legal', async (req, res) => {
  const { legal_officer_assigned } = req.body;
  if (!legal_officer_assigned) {
    return res.status(400).json({ error: 'Legal officer required' });
  }

  try {
    const modified_by = req.body.modified_by;

    const [updated] = await Complaint.update(
      {
        legal_officer_assigned,
        legal_officer_date: new Date().toISOString(),
        modified_by,
      },
      { where: { id: req.params.id } }
    );

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Assigned to legal officer' });
  } catch (err) {
    console.error('PATCH /complaints/:id/assign-legal error:', err.message);
    res.status(500).json({ error: 'Failed to assign legal officer' });
  }
});

// ── PATCH /api/complaints/:id/resolve ─ Legal Officer resolves complaint ────
// Sets status to "Closed" and records the resolution date/notes.
router.patch('/:id/resolve', async (req, res) => {
  const { resolution_notes } = req.body;

  try {
    const modified_by = req.body.modified_by;

    const [updated] = await Complaint.update(
      {
        status: 'Closed',
        resolution_notes,
        resolution_date: new Date().toISOString(),
        modified_by,
      },
      { where: { id: req.params.id } }
    );

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ message: 'Complaint resolved and closed' });
  } catch (err) {
    console.error('PATCH /complaints/:id/resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve complaint' });
  }
});

// ── GET /api/complaints/dashboard/pending ─ Recent pending complaints ───────
// Returns the 5 most recent complaints that are still in progress.
// Used on the dashboard to show what needs attention.
router.get('/dashboard/pending', async (req, res) => {
  try {
    const rows = await Complaint.findAll({
      where: {
        // Include complaints in any "in progress" status
        status: { [Op.in]: ['Pending', 'DGM Review', 'Legal Review'] },
      },
      include: [{ model: ManagementCorporation, attributes: ['name'] }],
      order: [['complaint_date', 'DESC']],
      limit: 5,
    });

    // Flatten the ManagementCorporation join into a simple mc_name field
    res.json((rows || []).map((row) => {
      const complaint = row.get({ plain: true });
      return {
        ...complaint,
        mc_name: complaint.ManagementCorporation?.name || null,
      };
    }));
  } catch (err) {
    console.error('GET /complaints/dashboard/pending error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pending complaints' });
  }
});

// ── GET /api/complaints/stats/summary ─ Complaint count by status ───────────
// Returns how many complaints exist in each status.
// Used for dashboard summary cards and charts.
router.get('/stats/summary', async (req, res) => {
  try {
    // Run all counts in parallel for speed
    const [total, pending, dgmReview, legalReview, closed, open] = await Promise.all([
      Complaint.count(),
      Complaint.count({ where: { status: 'Pending' } }),
      Complaint.count({ where: { status: 'DGM Review' } }),
      Complaint.count({ where: { status: 'Legal Review' } }),
      Complaint.count({ where: { status: 'Closed' } }),
      Complaint.count({ where: { status: 'Open' } }),
    ]);

    res.json({ total, pending, dgmReview, legalReview, closed, open });
  } catch (err) {
    console.error('GET /complaints/stats/summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaint statistics' });
  }
});

// ── GET /api/complaints/:id ─ Get single complaint by ID ────────────────────
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id, {
      attributes: complaintAttributes,
    });

    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Return with calculated days_pending
    res.json(addDaysPending(complaint.get({ plain: true })));
  } catch (err) {
    console.error('GET /complaints/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

module.exports = router;
