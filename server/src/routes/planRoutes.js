const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get trainee's meal plan
router.get('/meal', async (req, res) => {
  try {
    const userId = req.user.id;

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { userId },
      include: {
        mealDays: {
          include: {
            meals: {
              include: {
                food: true,
              },
            },
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    res.json(mealPlan);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

// Get specific meal day details
router.get('/meal/day/:dayOfWeek', async (req, res) => {
  try {
    const userId = req.user.id;
    const dayOfWeek = parseInt(req.params.dayOfWeek);

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { userId },
    });

    if (!mealPlan) {
      return res.json(null);
    }

    const mealDay = await prisma.mealDay.findUnique({
      where: {
        mealPlanId_dayOfWeek: {
          mealPlanId: mealPlan.id,
          dayOfWeek,
        },
      },
      include: {
        meals: {
          include: {
            food: true,
          },
        },
      },
    });

    res.json(mealDay);
  } catch (error) {
    console.error('Error fetching meal day:', error);
    res.status(500).json({ error: 'Failed to fetch meal day' });
  }
});

// Get trainee's workout plan
router.get('/workout', async (req, res) => {
  try {
    const userId = req.user.id;

    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { userId },
      include: {
        workoutDays: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    res.json(workoutPlan);
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

// Get specific workout day details
router.get('/workout/day/:dayOfWeek', async (req, res) => {
  try {
    const userId = req.user.id;
    const dayOfWeek = parseInt(req.params.dayOfWeek);

    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { userId },
    });

    if (!workoutPlan) {
      return res.json(null);
    }

    const workoutDay = await prisma.workoutDay.findUnique({
      where: {
        workoutPlanId_dayOfWeek: {
          workoutPlanId: workoutPlan.id,
          dayOfWeek,
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    res.json(workoutDay);
  } catch (error) {
    console.error('Error fetching workout day:', error);
    res.status(500).json({ error: 'Failed to fetch workout day' });
  }
});

module.exports = router;
