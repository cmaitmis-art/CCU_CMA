/**
 * reports.js — Routes for Report Generation & Data Export
 * 
 * WHAT THIS FILE DOES:
 * Provides endpoints for generating reports and exporting data:
 *   GET  /api/reports                    → List all saved reports
 *   POST /api/reports/generate/complaints → Generate complaint statistics report
 *   POST /api/reports/generate/mc-stats   → Generate MC statistics report
 *   GET  /api/reports/export/:type        → Export raw data (JSON download)
 *   GET  /api/reports/backup/json         → Full database backup as JSON
 * 
 * NOTE: All queries now use Sequelize ORM instead of raw SQL.
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const db = require('../db');

// Destructure all needed models
const { Report, Complaint, ManagementCorporation, McomRecord, Cfile } = db.models;

// ── GET /api/reports ─ List all saved reports ───────────────────────────────
// Returns all reports sorted by newest first.
router.get('/', async (req, res) => {
  try {
    const reports = await Report.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json(reports);
  } catch (err) {
    console.error('GET /reports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ── POST /api/reports/generate/complaints ─ Complaint report ────────────────
// Generates a statistical report of complaints within a date range.
// Optional filters: start_date, end_date, status
// Also saves the report to the database for future reference.
router.post('/generate/complaints', async (req, res) => {
  const { start_date, end_date, status } = req.body;

  try {
    // Build WHERE clause based on provided filters
    const where = {};

    if (start_date || end_date) {
      where.complaint_date = {};
      if (start_date) where.complaint_date[Op.gte] = start_date;
      if (end_date) where.complaint_date[Op.lte] = end_date;
    }

    if (status) {
      where.status = status;
    }

    // Fetch complaints with MC name joined
    const complaints = await Complaint.findAll({
      where,
      include: [{ model: ManagementCorporation, attributes: ['name'] }],
      raw: true,
      nest: true, // nests joined data under 'ManagementCorporation' key
    });

    // Flatten each row: add mc_name as a top-level field
    const rows = complaints.map((c) => ({
      ...c,
      mc_name: c.ManagementCorporation?.name || null,
    }));

    // Calculate summary statistics from the fetched rows
    const stats = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'Pending').length,
      dgmReview: rows.filter((r) => r.status === 'DGM Review').length,
      legalReview: rows.filter((r) => r.status === 'Legal Review').length,
      closed: rows.filter((r) => r.status === 'Closed').length,
      averageDaysPending: rows.length > 0
        ? Math.round(
            rows.reduce((sum, r) => {
              const days = Math.floor(
                (new Date() - new Date(r.complaint_date)) / (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }, 0) / rows.length
          )
        : 0,
    };

    // Save this report to the database for later viewing
    try {
      await Report.create({
        title: `Complaint Report - ${new Date().toISOString().split('T')[0]}`,
        report_type: 'Complaints',
        generated_by: 'System',
        data: JSON.stringify({ stats, complaints: rows }),
      });
    } catch (saveErr) {
      // Don't fail the request if saving the report fails
      console.error('Failed to save report:', saveErr.message);
    }

    res.json({ stats, complaints: rows });
  } catch (err) {
    console.error('POST /reports/generate/complaints error:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ── POST /api/reports/generate/mc-stats ─ MC statistics report ──────────────
// Returns count of Management Corporations grouped by status.
router.post('/generate/mc-stats', async (req, res) => {
  try {
    // Count MCs by status using Sequelize
    const [total, active, inactive] = await Promise.all([
      ManagementCorporation.count(),
      ManagementCorporation.count({ where: { status: 'Active' } }),
      ManagementCorporation.count({
        where: { status: { [Op.ne]: 'Active' } },
      }),
    ]);

    res.json({ total, active, inactive });
  } catch (err) {
    console.error('POST /reports/generate/mc-stats error:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ── GET /api/reports/export/:type ─ Export data as JSON download ─────────────
// Exports all rows from a table as a downloadable JSON file.
// Supported types: 'complaints', 'mc', 'mcom'
router.get('/export/:type', async (req, res) => {
  const { type } = req.params;

  try {
    let rows;
    let filename;

    // Select the right model and filename based on the export type
    switch (type) {
      case 'complaints':
        rows = await Complaint.findAll({ raw: true });
        filename = 'complaints.json';
        break;
      case 'mc':
        rows = await ManagementCorporation.findAll({ raw: true });
        filename = 'mc-records.json';
        break;
      case 'mcom':
        rows = await McomRecord.findAll({ raw: true });
        filename = 'mcom-records.json';
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type. Use: complaints, mc, or mcom' });
    }

    // Set headers so the browser treats this as a file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(rows || []);
  } catch (err) {
    console.error('GET /reports/export error:', err.message);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ── GET /api/reports/backup/json ─ Full database backup ─────────────────────
// Exports ALL tables as a single JSON payload for offline archiving.
// Includes a summary with record counts and the backup timestamp.
router.get('/backup/json', async (req, res) => {
  try {
    // Fetch all tables in parallel for speed
    const [mc, mcom, cf, complaints] = await Promise.all([
      ManagementCorporation.findAll({ raw: true }),
      McomRecord.findAll({ raw: true }),
      Cfile.findAll({ raw: true }),
      Complaint.findAll({ raw: true }),
    ]);

    const backupDate = new Date().toISOString();
    res.json({
      backup_date: backupDate,
      system: 'CMA Management System',
      version: '2026',
      summary: {
        mc_count: mc.length,
        mcom_count: mcom.length,
        cfiles_count: cf.length,
        complaints_count: complaints.length,
        total_records: mc.length + mcom.length + cf.length + complaints.length,
      },
      data: {
        management_corporations: mc,
        mcom_records: mcom,
        cfiles: cf,
        complaints: complaints,
      },
    });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

module.exports = router;
