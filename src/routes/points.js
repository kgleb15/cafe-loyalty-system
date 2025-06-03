const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Add or subtract points
router.post('/points', authenticateToken, async (req, res, next) => {
  try {
    const { amount, type } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!amount || !['add', 'subtract'].includes(type)) {
      return res.status(400).json({ error: 'Valid amount and type (add/subtract) are required' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current balance
      const [users] = await connection.query(
        'SELECT balance FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'User not found' });
      }

      const currentBalance = users[0].balance;
      const pointsAmount = parseInt(amount);
      
      // Calculate new balance
      let newBalance;
      if (type === 'add') {
        newBalance = currentBalance + pointsAmount;
      } else {
        // Check if user has enough points
        if (currentBalance < pointsAmount) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: 'Insufficient points balance' });
        }
        newBalance = currentBalance - pointsAmount;
      }

      // Update user balance
      await connection.query(
        'UPDATE users SET balance = ? WHERE id = ?',
        [newBalance, userId]
      );

      // Record transaction
      const transactionAmount = type === 'add' ? pointsAmount : -pointsAmount;
      await connection.query(
        'INSERT INTO transactions (user_id, amount, type, created_at) VALUES (?, ?, ?, NOW())',
        [userId, transactionAmount, type]
      );

      await connection.commit();
      connection.release();

      res.json({
        message: `Points ${type === 'add' ? 'added' : 'subtracted'} successfully`,
        newBalance
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Get user balance
router.get('/balance', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [users] = await pool.query(
      'SELECT balance FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: users[0].balance
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const [transactions] = await pool.query(
      'SELECT id, amount, type, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );

    res.json({
      transactions,
      pagination: {
        total: countResult[0].total,
        limit,
        offset
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;