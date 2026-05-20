import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs');

const USER_ID = 'user-1';

const mockUser = {
  id: USER_ID,
  name: 'Alice',
  email: 'alice@example.com',
  role: UserRole.TRAINEE,
  phone: null,
  profilePicture: null,
  isEmailVerified: true,
  trainerId: null,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  // ─── updateName ────────────────────────────────────────────────────────────

  describe('updateName', () => {
    it('updates the user name and returns updated user', async () => {
      const updated = { ...mockUser, name: 'Alicia' };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateName(USER_ID, 'Alicia');

      expect(result.user.name).toBe('Alicia');
      expect(result.message).toContain('updated');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: USER_ID }, data: { name: 'Alicia' } }),
      );
    });
  });

  // ─── updateProfilePicture ──────────────────────────────────────────────────

  describe('updateProfilePicture', () => {
    const newPicUrl = 'uploads/profiles/new.jpg';

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfilePicture(USER_ID, newPicUrl)).rejects.toThrow(NotFoundException);
    });

    it('deletes old profile picture file when a different one exists', async () => {
      const oldPath = 'uploads/profiles/old.jpg';
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: oldPath });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: newPicUrl });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      await service.updateProfilePicture(USER_ID, newPicUrl);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('does not delete file when user has no existing picture', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: null });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: newPicUrl });

      await service.updateProfilePicture(USER_ID, newPicUrl);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('does not delete file when new and old URLs are the same', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: newPicUrl });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: newPicUrl });

      await service.updateProfilePicture(USER_ID, newPicUrl);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('returns updated profile picture URL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: newPicUrl });

      const result = await service.updateProfilePicture(USER_ID, newPicUrl);

      expect(result.profilePicture).toBe(newPicUrl);
      expect(result.message).toContain('uploaded');
    });
  });

  // ─── removeProfilePicture ──────────────────────────────────────────────────

  describe('removeProfilePicture', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.removeProfilePicture(USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deletes the file when a profile picture exists', async () => {
      const picPath = 'uploads/profiles/pic.jpg';
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: picPath });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: null });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.removeProfilePicture(USER_ID);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('removed');
    });

    it('skips file deletion when user has no profile picture', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: null });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: null });

      await service.removeProfilePicture(USER_ID);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('does not throw when file is missing from disk', async () => {
      const picPath = 'uploads/profiles/pic.jpg';
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, profilePicture: picPath });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, profilePicture: null });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.removeProfilePicture(USER_ID)).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});
