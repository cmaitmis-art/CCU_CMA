const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../backend/data/cma.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening DB:', err.message);
    process.exit(1);
  }
  
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
    if (err) {
      console.error('Error reading tables:', err.message);
      process.exit(1);
    }
    console.log('Tables in database:', tables.map(t => t.name));
    db.close();
  });
});
