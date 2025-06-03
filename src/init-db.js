const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Чтение SQL-скрипта
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Выполнение SQL-скрипта
    await pool.query(schemaSql);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };