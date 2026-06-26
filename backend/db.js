/**
 * db.js — Database Connection Module
 * 
 * This file sets up the SQLite database connection using Sequelize ORM.
 * 
 * WHAT THIS FILE DOES:
 * 1. Creates the 'data' folder if it doesn't exist
 * 2. Connects to the SQLite database file (cma.db)
 * 3. Loads all Sequelize models (tables) from the models/ folder
 * 4. Syncs the database schema (creates tables if missing)
 * 5. Seeds default data (complaint categories + default users)
 * 6. Exports everything other files need: { sequelize, models, ready, dbPath }
 * 
 * NOTE: We use Sequelize as the ONLY database driver. No raw sqlite3 calls.
 * This keeps the code consistent — all queries go through Sequelize models.
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const initializeModels = require('./models');

// ── Step 1: Ensure the 'data' directory exists ──────────────────────────────
// The SQLite database file lives inside backend/data/cma.db.
// We create the folder on startup so the app works on a fresh clone.
const dataDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ── Step 2: Create the Sequelize connection ─────────────────────────────────
// 'storage' tells Sequelize where to put the SQLite file on disk.
// 'logging: false' silences the SQL query logs in the console.
const dbPath = path.join(dataDir, 'cma.db');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

// ── Step 3: Load all model definitions ──────────────────────────────────────
// initializeModels() reads each model file (users, complaints, etc.),
// registers them with Sequelize, and sets up foreign key relationships.
const models = initializeModels(sequelize);

// ── Step 4: Authenticate, sync schema, and seed default data ────────────────
// 'ready' is a Promise that resolves when the database is fully set up.
// Other files (like index.js) wait for this before starting the server.
const ready = sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection authenticated');
    // sync() creates any missing tables based on model definitions.
    // It does NOT drop or alter existing tables — safe for production.
    return sequelize.sync();
  })
  .then(async () => {
    console.log('✅ Database schema synced (tables created/verified)');
    
    // List all models that were created
    console.log('📋 Models loaded:', Object.keys(models).join(', '));
    
    // Verify critical tables exist
    const criticalTables = ['discussions', 'complaints', 'composers', 'users'];
    const qi = sequelize.getQueryInterface();
    
    for (const table of criticalTables) {
      try {
        const tableInfo = await qi.describeTable(table);
        console.log(`✅ Table '${table}' verified:`, Object.keys(tableInfo).slice(0, 3).join(', '), '...');
      } catch (err) {
        console.warn(`⚠️  Table '${table}' check failed:`, err.message);
      }
    }
    
    // ── SQLite schema fix (idempotent) ─────────────────────────────────────
    // Problem: existing deployments may have created tables before the
    // Sequelize models included audit columns (`created_by`, `modified_by`).
    // Sequelize sync() won't add missing columns to an existing table.
    // Fix: perform safe ALTER TABLE additions for multiple tables.
    // NOTE: Discussion table also needs audit columns.
    const auditColumnsTables = [
      'cfiles',
      'mcom_records',
      'management_corporations',
      'complaints',
      'discussions',
      'report_documents',
    ];

    // ── MC UI fields schema fix (idempotent) ─────────────────────────────
    // Some UI columns are not present in older DBs.
    // We add them safely if missing.
    // NOTE: SQLite supports ALTER TABLE ADD COLUMN (no type enforcement needed).
    const mcFieldsToEnsure = [
      // RegistrationForm.jsx: services
      'services_lift', 'services_fire_agreement', 'services_generator_agreement', 'services_insurance',

      // RegistrationForm.jsx: parcel breakdown and council members
      'non_res_shops', 'non_res_office', 'non_res_hotel', 'council_members',

      // RegistrationForm.jsx: facilities
      'fac_common_parking', 'fac_accessory_car_parcel', 'fac_roof_top', 'fac_gym',
      'fac_swimming_pool', 'fac_penth_house', 'fac_restaurant', 'fac_super_market',
      'fac_garden', 'fac_sauna', 'fac_salon', 'fac_golf_tennis', 'fac_day_care',

      // RegistrationForm.jsx: mgmt company
      'mgmt_company_controlled', 'mgmt_company_name', 'mgmt_company_contact',

      // RegistrationForm.jsx: contacts
      'secretary_contact', 'secretary_email', 'treasurer_contact', 'treasurer_email',

      // Checklist columns + note
      'approval_note',

      // checklist: check + fields
      'cl_reg_condo_plan',
      'cl_parcels_total', 'cl_parcels_residential', 'cl_parcels_office', 'cl_parcels_shops', 'cl_parcels_hotels', 'cl_parcels_service',
      'cl_services_facilities',
      'cl_written_assurance',

      'cl_photocopy_condo_plan', 'cl_photocopy_condo_plan_date',
      'cl_cma_certificate', 'cl_cma_certificate_no', 'cl_cma_certificate_date',
      'cl_declaration', 'cl_declaration_no', 'cl_declaration_date',
      'cl_agm_minutes', 'cl_agm_minutes_date',
      'cl_attendance', 'cl_attendance_total', 'cl_attendance_physically', 'cl_attendance_proxy',
      'cl_insurance', 'cl_insurance_from', 'cl_insurance_to',
      'cl_owners_list',
      'cl_constitution',
      'cl_bylaws',
      'cl_additional_bylaws',
      'cl_checked_by',
      'cl_checked_date',

      // page-count blanks
      'cl_parcels_total_pg', 'cl_parcels_residential_pg', 'cl_parcels_office_pg', 'cl_parcels_shops_pg', 'cl_parcels_hotels_pg', 'cl_parcels_service_pg',
      'cl_services_facilities_pg', 'cl_written_assurance_pg',
      'cl_photocopy_condo_plan_pg', 'cl_cma_certificate_pg', 'cl_declaration_pg', 'cl_agm_minutes_pg', 'cl_attendance_pg',
      'cl_insurance_pg', 'cl_owners_list_pg', 'cl_constitution_pg', 'cl_bylaws_pg', 'cl_additional_bylaws_pg',

      // RegistrationForm.jsx boolean
      'written_assurance_fulfilled',
    ];

    for (const col of mcFieldsToEnsure) {
      try {
        const describe = await sequelize.getQueryInterface().describeTable('management_corporations');
        if (!Object.prototype.hasOwnProperty.call(describe, col)) {
          await sequelize.query(`ALTER TABLE management_corporations ADD COLUMN ${col} TEXT;`, { raw: true });
        }
      } catch (err) {
        // If table doesn't exist yet, skip; sequelize.sync() will create it.
        const msg = String(err?.message || '');
        if (/no such table/i.test(msg) || /does not exist/i.test(msg)) continue;
        throw err;
      }
    }

    for (const tableName of auditColumnsTables) {
      try {
        const qi = sequelize.getQueryInterface();
        const describe = await qi.describeTable(tableName);

        const hasCreatedBy = Object.prototype.hasOwnProperty.call(describe, 'created_by');
        const hasModifiedBy = Object.prototype.hasOwnProperty.call(describe, 'modified_by');
        const hasCreatedAt = Object.prototype.hasOwnProperty.call(describe, 'created_at');
        const hasUpdatedAt = Object.prototype.hasOwnProperty.call(describe, 'updated_at');
        const hasHistory = Object.prototype.hasOwnProperty.call(describe, 'history');

        // Support both naming variants:
        // - discussions uses created_by/modified_by/history
        // - some other tables may use created_by/updated_by/deleted_by
        if (!hasCreatedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN created_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasModifiedBy) {
          // prefer modified_by if schema expects it
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN modified_by TEXT;`, {
            raw: true,
          });
        }

        // If the model uses updated_by/deleted_by, ensure they exist too.
        const hasUpdatedBy = Object.prototype.hasOwnProperty.call(describe, 'updated_by');
        const hasDeletedBy = Object.prototype.hasOwnProperty.call(describe, 'deleted_by');

        if (!hasUpdatedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN updated_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasDeletedBy) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN deleted_by TEXT;`, {
            raw: true,
          });
        }
        if (!hasCreatedAt) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN created_at DATETIME;`, {
            raw: true,
          });
        }
        if (!hasUpdatedAt) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME;`, {
            raw: true,
          });
        }
        if (!hasHistory) {
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN history TEXT;`, {
            raw: true,
          });
        }
      } catch (err) {
        const msg = String(err?.message || '');
        const tableMissing = /no such table/i.test(msg) || /does not exist/i.test(msg);
        // If a table doesn't exist yet, let sequelize.sync() handle it.
        if (!tableMissing) throw err;
      }
    }

    // ── Remove UNIQUE constraints/indexes from discussions table (if they exist) ─────
    // SQLite doesn't support DROP CONSTRAINT, so we must remove uniqueness in a robust way.
    // Strategy:
    // 1) Drop UNIQUE indexes (easy + safe)
    // 2) If UNIQUE still exists (likely UNIQUE table constraints), rebuild the table.
    //
    // This fixes bulk-import failures like:
    // "Failed to import any rows. A discussion with this unknown field already exists."
    try {
      const uniqueItemsQuery = `
        SELECT name, type, sql
        FROM sqlite_master
        WHERE tbl_name='discussions'
          AND sql IS NOT NULL
          AND UPPER(sql) LIKE '%UNIQUE%'
      `;

      const uniqueIndexQuery = `
        SELECT name, sql
        FROM sqlite_master
        WHERE type='index'
          AND tbl_name='discussions'
      `;

      const uniqueItemsRows = await sequelize.query(uniqueItemsQuery, { raw: true });
      const uniqueItems = (uniqueItemsRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));

      if (uniqueItems.length === 0) {
        console.log('✅ No UNIQUE constraints/indexes detected on discussions.');
      } else {
        console.warn(`⚠️ Detected UNIQUE constraint(s)/index(es) on discussions (${uniqueItems.length}). Attempting cleanup...`);

        // 1) Drop UNIQUE indexes
        const uniqueIndexRows = await sequelize.query(uniqueIndexQuery, { raw: true });
        const uniqueIndexes = (uniqueIndexRows || [])
          .filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'))
          .map(r => r?.name)
          .filter(name => typeof name === 'string' && name.trim().length > 0);

        if (uniqueIndexes.length > 0) {
          console.log(`Found ${uniqueIndexes.length} UNIQUE index(es). Dropping...`);
          for (const indexName of uniqueIndexes) {
            try {
              await sequelize.query(
                `DROP INDEX IF EXISTS "${indexName.replace(/"/g, '""')}";`,
                { raw: true }
              );
              console.log(`Dropped unique index: ${indexName}`);
            } catch (dropErr) {
              console.warn(`Could not drop unique index ${indexName}:`, dropErr.message);
            }
          }
        } else {
          console.log('No UNIQUE indexes found to drop.');
        }

        // 2) Re-check; if still present, rebuild table.
        const remainingItemsRows = await sequelize.query(uniqueItemsQuery, { raw: true });
        const remainingItems = (remainingItemsRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));

        if (remainingItems.length > 0) {
          console.warn(`⚠️ UNIQUE still detected (${remainingItems.length}) after index drop. Rebuilding discussions table...`);

          // Rename old (if discussions_old already exists, drop it to keep rebuild idempotent)
          await sequelize.query(`DROP TABLE IF EXISTS discussions_old;`, { raw: true });
          await sequelize.query(`ALTER TABLE discussions RENAME TO discussions_old;`, { raw: true });

          // Recreate discussions table using Sequelize model definition
          await models.Discussion.sync({ force: false });


          // Copy data across for common columns
          const oldColsInfo = await sequelize.getQueryInterface().describeTable('discussions_old');
          const newColsInfo = await sequelize.getQueryInterface().describeTable('discussions');

          const commonCols = Object.keys(newColsInfo).filter(c => Object.prototype.hasOwnProperty.call(oldColsInfo, c));

          if (commonCols.length === 0) {
            throw new Error('Rebuild failed: no common columns between discussions_old and discussions');
          }

          const colsSql = commonCols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');
          const selectSql = commonCols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');

          await sequelize.query(
            `INSERT INTO discussions (${colsSql}) SELECT ${selectSql} FROM discussions_old;`,
            { raw: true }
          );

          await sequelize.query(`DROP TABLE discussions_old;`, { raw: true });

          console.log('✅ discussions table rebuild completed.');
        } else {
          console.log('✅ UNIQUE constraints removed after index drop.');
        }
      }

      // Final verification logging
      const finalRows = await sequelize.query(uniqueItemsQuery, { raw: true });
      const finalUnique = (finalRows || []).filter(r => typeof r?.sql === 'string' && r.sql.toUpperCase().includes('UNIQUE'));
      if (finalUnique.length > 0) {
        console.warn('⚠️ After cleanup, UNIQUE constraints/indexes still detected on discussions:', finalUnique.map(u => u?.name).filter(Boolean));
      } else {
        console.log('🎯 Final check: no UNIQUE constraints/indexes detected on discussions.');
      }
    } catch (err) {
      console.warn('Warning: Could not check/remove/rebuild UNIQUE constraints from discussions table:', err.message);
      // Don't fail the entire database initialization for this
    }


    // ── Seed default complaint categories (only if they don't already exist). ─
    const defaultCategories = [
      { name: 'Structural',   description: 'Building structural issues' },
      { name: 'Plumbing',     description: 'Water and plumbing problems' },
      { name: 'Electrical',   description: 'Electrical system issues' },
      { name: 'Common Area',  description: 'Common area maintenance' },
      { name: 'Noise',        description: 'Noise complaints' },
      { name: 'Parking',      description: 'Parking related issues' },
      { name: 'Other',        description: 'Other issues' },
    ];

    for (const cat of defaultCategories) {
      await models.ComplaintCategory.findOrCreate({
        where: { name: cat.name },
        defaults: cat,
      });
    }

    // ── Seed default users (only if they don't already exist). ────────────
    const defaultUsers = [
      { username: 'admin', password: 'admin123', name: 'Admin User', role: 'Admin', email: 'admin@cma.lk' },
      { username: 'dgm', password: 'dgm123', name: 'DGM Officer', role: 'DGM', email: 'dgm@cma.lk' },
      { username: 'legal', password: 'legal123', name: 'Legal Officer', role: 'LegalOfficer', email: 'legal@cma.lk' },
    ];

    for (const user of defaultUsers) {
      await models.User.findOrCreate({
        where: { username: user.username },
        defaults: user,
      });
    }

    console.log('✅ Database initialization complete!');
    console.log(`📁 Database file: ${dbPath}`);
  })
  .catch((err) => {
    // If anything fails during setup, log details and exit.
    // The server should NOT start with a broken database.
    console.error('Database initialization failed:');
    console.error('  name:', err?.name);
    console.error('  message:', err?.message);
    console.error('  stack:', err?.stack);
    process.exit(1);
  });

// ── Step 5: Export the database object ──────────────────────────────────────
// Other files import this and use:
//   db.models.Complaint — to query the complaints table
//   db.sequelize        — for transactions or raw queries
//   db.ready            — to wait for setup before starting the server
//   db.dbPath           — used by the backup utility to find the .db file
module.exports = {
  sequelize,
  models,
  ready,
  dbPath,
};