const jwt = require('jsonwebtoken');
const { pool } = require('../database');

module.exports = async (req, res, next) => {
  try {
    // Получение токена из заголовка
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.substring(7);

    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Проверка существования пользователя
    const result = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Добавление информации о пользователе в запрос
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};