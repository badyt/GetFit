const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const prisma = require('../../prisma/prisma');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * PUT /api/user/update-name
 * Update user's name
 */
router.put('/update-name', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicture: true,
        isEmailVerified: true,
        trainerId: true,
      }
    });

    res.json({
      message: 'Name updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating name:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

module.exports = router;
