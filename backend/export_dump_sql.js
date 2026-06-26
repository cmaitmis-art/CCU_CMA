/**
 * export_dump_sql.js — Standalone Script to Export DB to SQL
 *
 * WHAT THIS FILE DOES:
 * Exports the SQLite database contents to a .sql file.
 * This is a CLI script, not used by the running server.
 *
 * Usage:
 *   node backend/export_dump_sql.js
 *
 * Output:
 *   backend/data_dumps/cma.db.dump.sql
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeSqlString(s) {
  if (s === null || s === undefined) return 'NULL';
  if (typeof s === 'number') return Number.isFinite(s) ? String(s) : 'NULL';
  if (Buffer.isBuffer(s)) return `X'${s.toString('hex')}'`;
  // SQLite escapes single quotes by doubling them
  return `'${String(s).replace(/'/g, "''")}'`;
}

// FIX: Added proper identifier escaping
function escapeSqlIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function run(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, function (err) {
      if (err) reject(err);
      else resolve(this);
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

async function dumpDatabase({ dbFile, outFile }) {
  const db = new sqlite3.Database(dbFile);
  try {
    const tables = await all(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );

    let out = '';
    out += `-- Dump generated from ${dbFile}\n`;
    out += `-- Generation time: ${new Date().toISOString()}\n`;
    out += `\n\nPRAGMA foreign_keys = OFF;\n\n`;

    // Schema
    for (const t of tables) {
      const table = t.name;
      const row = await all(db, `SELECT sql FROM sqlite_master WHERE type='table' AND name = ${escapeSqlString(table)};`);
      const createSql = row[0] && row[0].sql;
      if (createSql) {
        out += `-- Table: ${table}\n`;
        out += `${createSql};\n\n`;
      }
    }

    // Data
    for (const t of tables) {
      const table = t.name;
      const escapedTable = escapeSqlIdentifier(table);

      // FIX: Use proper identifier escaping instead of string escaping for table names
      const cols = await all(db, `PRAGMA table_info(${escapedTable});`);
      const colNames = cols.map(c => c.name);

      out += `-- Data for: ${table}\n`;
      const rows = await all(db, `SELECT * FROM ${escapedTable};`);
      
      for (const r of rows) {
        const values = colNames.map(c => escapeSqlString(r[c]));
        const escapedCols = colNames.map(escapeSqlIdentifier);
        out += `INSERT INTO ${escapedTable} (${escapedCols.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      out += `\n`;
    }

    ensureDir(path.dirname(outFile));
    fs.writeFileSync(outFile, out, 'utf8');
    console.log('Exported:', outFile);
  } finally {
    db.close();
  }
}

(async () => {
  const root = path.resolve(__dirname);
  const dataDir = path.join(root, 'data');
  const dumpsDir = path.join(root, 'data_dumps');

  // FIX: Removed reference to composers.db since everything is in cma.db
  const db1 = path.join(dataDir, 'cma.db');

  ensureDir(dumpsDir);

  if (fs.existsSync(db1)) {
    await dumpDatabase({ dbFile: db1, outFile: path.join(dumpsDir, 'cma.db.dump.sql') });
  } else {
    console.warn('Missing db file:', db1);
  }

})();
