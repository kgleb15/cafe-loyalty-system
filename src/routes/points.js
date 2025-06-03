const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Получение баланса пользователя
router.get('/balance', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance, name, email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Начисление или списание баллов
router.post('/points', auth, async (req, res) => {
  try {
    const { amount, type } = req.body;
    const userId = req.user.id;

    // Проверка обязательных полей
    if (!amount || !type) {
      return res.status(400).json({ message: 'Amount and type are required' });
    }

    // Проверка типа операции
    if (type !== 'add' && type !== 'subtract') {
      return res.status(400).json({ message: 'Type must be add or subtract' });
    }

    // Проверка суммы
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    // Начало транзакции
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Получение текущего баланса
      const balanceResult = await client.query(
        'SELECT balance FROM users WHERE id = $1',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      let currentBalance = balanceResult.rows[0].balance;
      let newBalance;

      // Расчет нового баланса
      if (type === 'add') {
        newBalance = currentBalance + amount;
      } else {
        // Проверка достаточности средств
        if (currentBalance < amount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: 'Insufficient balance' });
        }
        newBalance = currentBalance - amount;
      }

      // Обновление баланса пользователя
      await client.query(
        'UPDATE users SET balance = $1 WHERE id = $2',
        [newBalance, userId]
      );

      // Запись транзакции
      await client.query(
        'INSERT INTO transactions (user_id, amount, type) VALUES ($1, $2, $3)',
        [userId, amount, type]
      );

      await client.query('COMMIT');

      res.json({
        message: `Points ${type === 'add' ? 'added' : 'subtracted'} successfully`,
        newBalance
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Points error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Получение истории транзакций
router.get('/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      'SELECT id, amount, type, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;