const db = require('../backend/db');
db.ready.then(async () => {
  const qi = db.sequelize.getQueryInterface();
  try {
    const info = await qi.describeTable('discussions');
    console.log('Discussions table exists! Schema columns:', Object.keys(info));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}).catch((err) => {
  console.error('Database ready failed:', err.message);
  process.exit(1);
});
