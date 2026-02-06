const prisma = require('../../prisma/prisma');

/**
 * Get a specific day's history for a user
 * @param {string} userId - The user ID
 * @param {Date} date - The date to fetch
 * @returns {Promise<object|null>} The daily history record or null
 */
async function getDailyHistory(userId, date) {
  try {
    const dailyHistory = await prisma.dailyHistory.findUnique({
      where: {
        userId_date: {
          userId,
          date: new Date(date),
        },
      },
    });
    return dailyHistory;
  } catch (error) {
    console.error('Error fetching daily history:', error);
    throw error;
  }
}

/**
 * Get history records for a user within a date range
 * @param {string} userId - The user ID
 * @param {Date} startDate - The start date of the range
 * @param {Date} endDate - The end date of the range
 * @returns {Promise<Array>} Array of daily history records
 */
async function getHistoryRange(userId, startDate, endDate) {
  try {
    const history = await prisma.dailyHistory.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
    return history;
  } catch (error) {
    console.error('Error fetching history range:', error);
    throw error;
  }
}

/**
 * Create or update a daily history record
 * @param {string} userId - The user ID
 * @param {Date} date - The date
 * @param {object} data - The data to save (weight, calorieIntake, proteinIntake)
 * @returns {Promise<object>} The created/updated daily history record
 */
async function upsertDailyHistory(userId, date, data) {
  try {
    const { weight, calorieIntake, proteinIntake } = data;
    
    const dailyHistory = await prisma.dailyHistory.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(date),
        },
      },
      update: {
        weight: weight !== undefined ? weight : undefined,
        calorieIntake: calorieIntake !== undefined ? calorieIntake : undefined,
        proteinIntake: proteinIntake !== undefined ? proteinIntake : undefined,
      },
      create: {
        userId,
        date: new Date(date),
        weight: weight || null,
        calorieIntake: calorieIntake || null,
        proteinIntake: proteinIntake || null,
      },
    });
    
    return dailyHistory;
  } catch (error) {
    console.error('Error upserting daily history:', error);
    throw error;
  }
}

/**
 * Check if a trainer has access to a trainee's data
 * @param {number} trainerId - The trainer's user ID
 * @param {number} traineeId - The trainee's user ID
 * @returns {Promise<boolean>} True if trainer has access, false otherwise
 */
async function checkTrainerAccess(trainerId, traineeId) {
  try {
    // Check if the trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: {
        id: traineeId,
        trainerId: trainerId,
      },
    });
    
    return !!trainee;
  } catch (error) {
    console.error('Error checking trainer access:', error);
    throw error;
  }
}

module.exports = {
  getDailyHistory,
  getHistoryRange,
  upsertDailyHistory,
  checkTrainerAccess,
};
