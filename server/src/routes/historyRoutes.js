const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  getDailyHistory,
  getHistoryRange,
  upsertDailyHistory,
  checkTrainerAccess,
} = require('../services/historyService');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/history/:date?userId=...
 * Get a specific day's history
 * If userId is provided, verify trainer access to trainee
 */
router.get('/:date', async (req, res) => {
  try {
    let targetUserId = req.user.id;
    const { userId } = req.query;

    // If userId is provided, verify trainer access
    if (userId) {
      const hasAccess = await checkTrainerAccess(req.user.id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      targetUserId = userId;
    }

    const { date } = req.params;

    // Validate date format
    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const dailyHistory = await getDailyHistory(targetUserId, date);
    res.json(dailyHistory);
  } catch (error) {
    console.error('Error fetching daily history:', error);
    res.status(500).json({ error: 'Failed to fetch daily history' });
  }
});

/**
 * GET /api/history/range?startDate=...&endDate=...&userId=...
 * Get history records within a date range
 * If userId is provided, verify trainer access to trainee
 */
router.get('/range/dates', async (req, res) => {
  try {
    let targetUserId = req.user.id;
    const { startDate, endDate, userId } = req.query;

    // If userId is provided, verify trainer access
    if (userId) {
      const hasAccess = await checkTrainerAccess(req.user.id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      targetUserId = userId;
    }

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Both startDate and endDate are required' });
    }

    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Ensure startDate is before or equal to endDate
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
    }

    const history = await getHistoryRange(targetUserId, startDate, endDate);
    res.json(history);
  } catch (error) {
    console.error('Error fetching history range:', error);
    res.status(500).json({ error: 'Failed to fetch history range' });
  }
});

/**
 * POST /api/history
 * Create or update a daily history record
 * Body: { date, weight?, calorieIntake?, proteinIntake? }
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, weight, calorieIntake, proteinIntake } = req.body;

    // Validate date
    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ error: 'Valid date is required' });
    }

    // Validate at least one field is provided
    if (weight === undefined && calorieIntake === undefined && proteinIntake === undefined) {
      return res.status(400).json({ 
        error: 'At least one field (weight, calorieIntake, or proteinIntake) is required' 
      });
    }

    // Validate numeric values if provided
    if (weight !== undefined && (typeof weight !== 'number' || weight < 0)) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    if (calorieIntake !== undefined && (typeof calorieIntake !== 'number' || calorieIntake < 0)) {
      return res.status(400).json({ error: 'Calorie intake must be a positive number' });
    }

    if (proteinIntake !== undefined && (typeof proteinIntake !== 'number' || proteinIntake < 0)) {
      return res.status(400).json({ error: 'Protein intake must be a positive number' });
    }

    const dailyHistory = await upsertDailyHistory(userId, date, {
      weight,
      calorieIntake,
      proteinIntake,
    });

    res.json(dailyHistory);
  } catch (error) {
    console.error('Error saving daily history:', error);
    res.status(500).json({ error: 'Failed to save daily history' });
  }
});

module.exports = router;
