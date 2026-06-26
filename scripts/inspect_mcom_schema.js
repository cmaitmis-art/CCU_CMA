const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'backend', 'data', 'cma.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('DB open error:', err.message); process.exit(1); }
});

function printSchema() {
  db.all("PRAGMA table_info('mcom_records')", (err, rows) => {
    if (err) { console.error('PRAGMA error:', err.message); process.exit(1); }
    if (!rows || rows.length === 0) {
      console.log('Table `mcom_records` does not exist or has no columns.');
      process.exit(0);
    }
    console.log('mcom_records schema:');
    rows.forEach(r => console.log(`${r.cid}: ${r.name} ${r.type} (notnull=${r.notnull}) pk=${r.pk}`));

    db.get("SELECT COUNT(*) as cnt FROM mcom_records", (e, res) => {
      if (e) {
        console.error('COUNT error:', e.message);
      } else {
        console.log('Row count:', res.cnt);
      }
      db.close();
    });
  });
}

printSchema();
