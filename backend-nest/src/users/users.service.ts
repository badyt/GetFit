import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  profilePicture: true,
  isEmailVerified: true,
  trainerId: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateName(userId: string, name: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: USER_SELECT,
    });

    return { message: 'Name updated successfully', user: updatedUser };
  }

  async updateProfilePicture(userId: string, profilePictureUrl: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    if (!currentUser) throw new NotFoundException('User not found');

    if (currentUser.profilePicture && currentUser.profilePicture !== profilePictureUrl) {
      this.deleteFile(currentUser.profilePicture);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePictureUrl },
      select: USER_SELECT,
    });

    return {
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePictureUrl,
      user: updatedUser,
    };
  }

  async removeProfilePicture(userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    if (!currentUser) throw new NotFoundException('User not found');

    if (currentUser.profilePicture) {
      this.deleteFile(currentUser.profilePicture);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
      select: USER_SELECT,
    });

    return { message: 'Profile picture removed successfully', user: updatedUser };
  }

  private deleteFile(relativePath: string): void {
    const filePath = join(process.cwd(), relativePath);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        this.logger.warn(`Failed to delete file at ${filePath}`, error);
      }
    }
  }
}
