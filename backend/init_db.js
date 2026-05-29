const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDatabase() {
  const sqlPath = path.join(__dirname, '..', 'database', 'diet_clean.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    multipleStatements: true
  });

  console.log('Connected to MySQL server.');
  await connection.query(sql);
  console.log('Database initialized successfully!');

  const [tables] = await connection.query('USE diet_plan; SHOW TABLES');
  console.log('\nTables created:');
  tables.forEach(t => console.log('  -', Object.values(t)[0]));

  const [count] = await connection.query('SELECT COUNT(*) as count FROM food_items');
  console.log(`\nPreloaded foods: ${count[0].count}`);

  await connection.end();
  console.log('\nDone!');
}

initDatabase().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});