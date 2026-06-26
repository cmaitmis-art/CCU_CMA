/**
 * sqlbackup.js — Automated Database Backup Utility
 * 
 * WHAT THIS FILE DOES:
 * Creates a raw .sql text dump of the SQLite database.
 * This is useful for manual restores or migrations.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DEFAULT_BACKUP_PATH = path.resolve(__dirname, '../data/cma_backup.sql');

/**
 * Escapes values for insertion into SQL statements.
 * Example: "O'Connor" -> "'O''Connor'"
 */
function escapeSqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Escapes identifiers (like table or column names) to prevent SQL injection.
 * In SQLite, identifiers are wrapped in double quotes.
 * Example: user-data -> "user-data"
 */
function escapeSqlIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function all(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function closeDb(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Creates the actual SQL dump file.
 */
async function createSqlBackup(dbPath, backupPath = DEFAULT_BACKUP_PATH) {
  const dir = path.dirname(backupPath);
  ensureDir(dir);

  const tempPath = `${backupPath}.tmp`;
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

  const db = await openDatabase(dbPath);
  try {
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );

    let dump = '';
    dump += `-- Dump generated from ${dbPath}\n`;
    dump += `-- Generation time: ${new Date().toISOString()}\n\n`;
    dump += 'PRAGMA foreign_keys = OFF;\n\n';

    // 1. Dump table schemas
    for (const { name: table } of tables) {
      // For string comparison in the WHERE clause, use single quotes (escapeSqlValue)
      const row = await all(db, `SELECT sql FROM sqlite_master WHERE type='table' AND name = ${escapeSqlValue(table)};`);
      const createSql = row[0] && row[0].sql;
      if (createSql) {
        dump += `-- Table: ${table}\n${createSql};\n\n`;
      }
    }

    // 2. Dump table data
    for (const { name: table } of tables) {
      // FIX: Use escapeSqlIdentifier for PRAGMA and SELECT statements.
      // Previously, this used escapeSqlValue which wrapped the table name in single quotes,
      // causing a syntax error. PRAGMA and FROM require unquoted or double-quoted identifiers.
      const escapedTable = escapeSqlIdentifier(table);
      
      const cols = await all(db, `PRAGMA table_info(${escapedTable});`);
      const colNames = cols.map((col) => col.name);
      if (!colNames.length) continue;

      dump += `-- Data for: ${table}\n`;
      const rows = await all(db, `SELECT * FROM ${escapedTable};`);
      for (const row of rows) {
        const values = colNames.map((colName) => escapeSqlValue(row[colName]));
        const escapedCols = colNames.map(escapeSqlIdentifier);
        dump += `INSERT INTO ${escapedTable} (${escapedCols.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      dump += '\n';
    }

    // Write to a temp file first, then rename to avoid corrupted partial files
    fs.writeFileSync(tempPath, dump, 'utf8');
    fs.renameSync(tempPath, backupPath);
    return backupPath;
  } finally {
    await closeDb(db);
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }
}

/**
 * Convenience function called by routes after a successful write.
 * Triggers a backup using the current database path.
 */
async function backupAfter(dbInstance) {
  // Extract path from our new db.js export object
  const dbPath = dbInstance?.dbPath || dbInstance?.sequelize?.options?.storage;
  if (!dbPath) {
    console.error('SQL backup failed: missing dbPath');
    return null;
  }

  try {
    const savedPath = await createSqlBackup(dbPath);
    console.log('SQL backup saved:', savedPath);
    return savedPath;
  } catch (err) {
    console.error('SQL backup failed:', err.message || err);
    return null;
  }
}

module.exports = {
  createSqlBackup,
  backupAfter,
  DEFAULT_BACKUP_PATH,
};