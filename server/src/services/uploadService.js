const prisma = require('../../prisma/prisma');
const fs = require('fs');
const path = require('path');

/**
 * Update user's profile picture
 * @param {string} userId - The user's ID
 * @param {string|null} profilePictureUrl - The new profile picture URL (or null to remove)
 * @returns {Promise<object>} The updated user object
 */
async function updateUserProfilePicture(userId, profilePictureUrl) {
  try {
    // Get current user to check for existing profile picture
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // Delete old profile picture file if it exists and is being replaced
    if (currentUser.profilePicture && currentUser.profilePicture !== profilePictureUrl) {
      const oldFilePath = path.join(__dirname, '../../', currentUser.profilePicture);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
          // Continue even if deletion fails
        }
      }
    }

    // Update user with new profile picture URL
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePictureUrl },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        isEmailVerified: true,
        trainerId: true,
      }
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile picture:', error);
    throw error;
  }
}

module.exports = {
  updateUserProfilePicture,
};
