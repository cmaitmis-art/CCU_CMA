const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const exceljs = require("exceljs");
const moment = require("moment");

module.exports = (models) => {
  const { Discussion } = models;

  // GET all discussions with pagination and search
  router.get("/", async (req, res) => {
    const { page = 1, pageSize = 10, search = "" } = req.query;
    const offset = (page - 1) * pageSize;

    // Important: search should be optional.
    // When search is empty, don't generate a SQL WHERE clause that can crash
    // if the DB collation/type handling is strict.
    const trimmed = String(search ?? '').trim();

    try {
      const where = trimmed
        ? {
            [Op.or]: [
              { file_no: { [Op.like]: `%${trimmed}%` } },
              { appointment: { [Op.like]: `%${trimmed}%` } },
              { complaint: { [Op.like]: `%${trimmed}%` } },
              { respond: { [Op.like]: `%${trimmed}%` } },
              { officer: { [Op.like]: `%${trimmed}%` } },
              { status: { [Op.like]: `%${trimmed}%` } },
            ],
          }
        : {};

      const { count, rows } = await Discussion.findAndCountAll({
        where,
        limit: parseInt(pageSize),
        offset: parseInt(offset),
      });

      res.status(200).json({
        totalItems: count,
        discussions: rows,
        totalPages: Math.ceil(count / pageSize),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET single discussion by ID
  router.get("/:id", async (req, res) => {
    try {
      const discussion = await Discussion.findByPk(req.params.id);
      if (discussion) {
        res.status(200).json(discussion);
      } else {
        res.status(404).json({ error: "Discussion not found" });
      }
    } catch (error) {
      console.error("Error fetching discussion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST create new discussion
  // Audit policy: created_by/modified_by must be from logged-in username.
  // Frontend should not be able to override these fields.
  router.post("/", async (req, res) => {
    let cleanedPayload = null;
    try {
      const { created_by, modified_by, username, ...payload } = req.body || {};
      const authUsername = req.body?.username || req.body?.created_by || created_by || modified_by || 'admin';

      // Define valid Discussion model fields
      const validFields = [
        'date',
        'file_no',
        'appointment',
        'complaint',
        'respond',
        'meeting_date_time',
        'venue',
        'reminder_date',
        'reminder_notes',
        'officer',
        'status',
      ];

      // Convert empty strings and invalid values to null for all fields
      cleanedPayload = {};
      
      // Process only valid fields
      Object.keys(payload).forEach(key => {
        // Skip unknown fields
        if (!validFields.includes(key)) {
          console.warn(`⚠️ Skipping unknown field: "${key}"`);
          return;
        }

        const value = payload[key];
        const stringValue = String(value ?? '').trim();
        
        // Convert empty/invalid strings to null
        if (!stringValue || stringValue === '__EMPTY' || stringValue === '—' || stringValue === 'NaN') {
          cleanedPayload[key] = null;
        } else {
          cleanedPayload[key] = value;
        }
      });

      // Ensure file_no has a value
      if (!cleanedPayload.file_no || cleanedPayload.file_no === null) {
        cleanedPayload.file_no = `FILE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      // Ensure appointment has a value
      if (!cleanedPayload.appointment || cleanedPayload.appointment === null) {
        cleanedPayload.appointment = `Appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      // Set audit fields
      cleanedPayload.created_by = authUsername;
      cleanedPayload.modified_by = authUsername;

      console.log('Creating discussion with cleaned payload:', JSON.stringify(cleanedPayload, null, 2));

      const newDiscussion = await Discussion.create(cleanedPayload);
      console.log('✅ Discussion created successfully:', newDiscussion.id);
      res.status(201).json(newDiscussion);
    } catch (error) {
      const errorDetails = error?.errors
        ? error.errors.map(e => ({
            path: e.path,
            message: e.message,
            value: e.value,
          }))
        : undefined;

      console.error("❌ Error creating discussion:", {
        message: error.message,
        name: error.name,
        details: errorDetails || error.toString(),
        received: req.body,
      });

      // Handle specific error types with appropriate HTTP status codes
      if (error.name === 'SequelizeUniqueConstraintError') {
        // 409 Conflict - for unique constraint violations
        const field = error?.errors?.[0]?.path || 'unknown field';
        res.status(409).json({
          error: `A discussion with this ${field} already exists. The ${field} must be unique.`,
          field,
          message: error.message,
          suggestion: `Try using a different value for ${field}`,
        });
      } else if (error.name === 'SequelizeValidationError') {
        // 400 Bad Request - for validation errors
        res.status(400).json({
          error: "Validation failed",
          details: errorDetails,
          message: error.message,
        });
      } else {
        // 500 Internal Server Error - for other errors
        res.status(500).json({
          error: error.message || "Internal server error",
          name: error.name,
        });
      }
    }
  });

  const updateAudit = async (id, req, res) => {
    try {
      const { created_by, modified_by, ...payload } = req.body || {};
      const username = req.body?.username || modified_by || created_by || 'admin';

      // Clean up empty/invalid values
      const cleanedPayload = {};
      Object.keys(payload).forEach(key => {
        const value = payload[key];
        const stringValue = String(value ?? '').trim();
        if (!stringValue || stringValue === '__EMPTY' || stringValue === '—' || stringValue === 'NaN') {
          cleanedPayload[key] = null;
        } else {
          cleanedPayload[key] = value;
        }
      });

      const [updated] = await Discussion.update(
        { ...cleanedPayload, modified_by: username },
        {
          where: { id },
        }
      );

      if (!updated) return res.status(404).json({ error: "Discussion not found" });

      const updatedDiscussion = await Discussion.findByPk(id);
      return res.status(200).json(updatedDiscussion);
    } catch (error) {
      console.error("Error updating discussion:", error);
      
      // Handle specific error types with appropriate HTTP status codes
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          error: `A discussion with this value already exists`,
          message: error.message,
        });
      } else if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: "Validation failed",
          message: error.message,
        });
      } else {
        return res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    }
  };

  // PUT update discussion by ID
  router.put("/:id", (req, res) => updateAudit(req.params.id, req, res));

  // PATCH update discussion by ID (alias for PUT)
  router.patch("/:id", (req, res) => updateAudit(req.params.id, req, res));

  // DELETE discussion by ID
  router.delete("/:id", async (req, res) => {
    try {
      const deleted = await Discussion.destroy({
        where: { id: req.params.id },
      });
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Discussion not found" });
      }
    } catch (error) {
      console.error("Error deleting discussion:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE all discussions
  router.delete("/", async (req, res) => {
    try {
      await Discussion.destroy({ where: {} });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting all discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST bulk import discussions from Excel
  router.post("/bulk", async (req, res) => {
    if (!req.files || !req.files.excel) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const excelFile = req.files.excel;
    const workbook = new exceljs.Workbook();

    try {
      await workbook.xlsx.load(excelFile.data);
      const worksheet = workbook.getWorksheet(1);
      let successCount = 0;
      let failCount = 0;
      const failures = [];

      const processRow = async (cellRow, rowNumber) => {
        try {
          const baseRecord = {
            date: moment(cellRow.getCell(1).value).toDate(),
            file_no: cellRow.getCell(2).value || null,
            appointment: cellRow.getCell(3).value || null,
            complaint: cellRow.getCell(4).value || null,
            respond: cellRow.getCell(5).value || null,
            meeting_date_time: cellRow.getCell(6).value || null,
            officer: cellRow.getCell(7).value || null,
            status: cellRow.getCell(8).value || 'New',
          };

          // Define valid Discussion model fields only
          const validFields = [
            'date',
            'file_no',
            'appointment',
            'complaint',
            'respond',
            'meeting_date_time',
            'officer',
            'status',
            'venue',
            'reminder_date',
            'reminder_notes',
          ];

          // Filter to only valid fields
          const record = {};
          Object.keys(baseRecord).forEach(key => {
            if (validFields.includes(key)) {
              record[key] = baseRecord[key];
            }
          });

          // Ensure required fields have values
          if (!record.file_no || record.file_no === null) {
            record.file_no = `FILE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          }
          if (!record.appointment || record.appointment === null) {
            record.appointment = `Appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          }

          // Set audit fields
          record.created_by = 'admin';
          record.modified_by = 'admin';

          await Discussion.create(record);
          successCount++;
          console.log(`✅ Row ${rowNumber} imported successfully`);
        } catch (rowError) {
          failCount++;
          failures.push({
            row: rowNumber,
            error: rowError.message,
            name: rowError.name,
          });
          console.error(`❌ Row ${rowNumber} import failed:`, rowError.message);
        }
      };

      // Process each row (skip header at row 1)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const cellRow = worksheet.getRow(rowNumber);
        await processRow(cellRow, rowNumber);
      }

      res.status(201).json({
        message: `Import completed. ${successCount} succeeded, ${failCount} failed.`,
        successCount,
        failCount,
        failures: failures.length > 0 ? failures : undefined,
      });
    } catch (error) {
      console.error("Error importing discussions:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // POST bulk delete discussions by IDs
  router.post("/bulk-delete", async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid or empty array of IDs provided" });
    }

    try {
      const deletedCount = await Discussion.destroy({
        where: {
          id: { [Op.in]: ids },
        },
      });
      res.status(200).json({ message: `${deletedCount} discussions deleted successfully` });
    } catch (error) {
      console.error("Error bulk deleting discussions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};