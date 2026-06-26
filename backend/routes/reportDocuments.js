const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const db = require('../db');

const { ReportDocument } = db.models;

const uploadsDir = path.resolve(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Basic file-type whitelist (frontend accepts */*, but we restrict to common types)
const ALLOWED_EXT = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf',
]);

function fileExt(fileName) {
  return path.extname(fileName || '').replace('.', '').toLowerCase();
}

// POST /api/reports/documents
// Body: multipart/form-data (files)
router.post('/documents', async (req, res) => {
  try {
    if (!req.files || !req.files.files) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const rawFiles = req.files.files;
    const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

    const created = [];

    for (const f of files) {
      const ext = fileExt(f.name);
      if (ALLOWED_EXT.size && !ALLOWED_EXT.has(ext)) {
        // Skip disallowed file types
        continue;
      }

      const base = path.basename(f.name || 'file', path.extname(f.name || ''));
      const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
      const stamp = Date.now();
      const finalName = `${safeBase}_${stamp}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const absolutePath = path.join(uploadsDir, finalName);

      // Save file contents
      await fs.promises.writeFile(absolutePath, f.data);

      const relPath = `uploads/reports/${finalName}`;

      const doc = await ReportDocument.create({
        file_name: f.name,
        mime_type: f.mimetype,
        size: f.size,
        storage_path: relPath,
      });

      created.push({
        id: doc.id,
        name: doc.file_name,
        size: doc.size,
        mime_type: doc.mime_type,
        url: `/uploads/reports/${finalName}`,
        uploadedAt: doc.created_at,
      });
    }

    if (!created.length) {
      return res.status(400).json({
        error: 'No allowed file types uploaded',
        allowed_extensions: Array.from(ALLOWED_EXT),
      });
    }

    res.status(201).json({ uploaded: created });
  } catch (err) {
    console.error('POST /reports/documents error:', err.message);
    res.status(500).json({ error: 'Failed to save documents' });
  }
});

// GET /api/reports/documents
router.get('/documents', async (req, res) => {
  try {
    const docs = await ReportDocument.findAll({ order: [['created_at', 'DESC']] });
    res.json(
      docs.map((d) => ({
        id: d.id,
        name: d.file_name,
        size: d.size,
        mime_type: d.mime_type,
        url: `/uploads/reports/${path.basename(d.storage_path)}`,
        uploadedAt: d.created_at,
      }))
    );
  } catch (err) {
    console.error('GET /reports/documents error:', err.message);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DELETE /api/reports/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await ReportDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete file from disk (best-effort)
    try {
      const absolute = path.resolve(__dirname, '..', doc.storage_path);
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    } catch (e) {
      // ignore
    }

    await doc.destroy();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /reports/documents/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;

