const { Pool } = require('pg');
require('dotenv').config();

// Создаем пул подключений к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Функция для проверки подключения к базе данных
const connectToDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

module.exports = { pool, connectToDatabase };