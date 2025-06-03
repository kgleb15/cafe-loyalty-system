const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('./database');
const { initializeDatabase } = require('./init-db');
const authRoutes = require('./routes/auth');
const pointsRoutes = require('./routes/points');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', pointsRoutes);

// Простой маршрут для проверки работоспособности
app.get('/', (req, res) => {
  res.json({ message: 'Cafe Loyalty API is running' });
});

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    // Подключение к базе данных
    await connectToDatabase();
    
    // Инициализация таблиц
    await initializeDatabase();
    
    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();