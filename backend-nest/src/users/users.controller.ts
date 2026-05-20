import {
  BadRequestException,
  Controller,
  Delete,
  Patch,
  Post,
  Body,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import { imageFileFilter } from '../common/multer/image-file-filter';
import { UpdateNameDto } from './dto/update-name.dto';
import { UsersService } from './users.service';

const profilePictureStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = join(process.cwd(), 'uploads', 'profiles');
    mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.id ?? 'unknown';
    cb(null, `${userId}-${Date.now()}${extname(file.originalname)}`);
  },
});

@ApiTags('users')
@ApiBearerAuth()
@UseFilters(MulterExceptionFilter)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('name')
  @ApiOperation({ summary: 'Update current user name' })
  updateName(@Body() dto: UpdateNameDto, @CurrentUser() user: RequestUser) {
    return this.usersService.updateName(user.id, dto.name);
  }

  @Post('profile-picture')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      storage: profilePictureStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload profile picture (max 5MB, images only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { profilePicture: { type: 'string', format: 'binary' } },
    },
  })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const profilePictureUrl = `/uploads/profiles/${file.filename}`;

    try {
      return await this.usersService.updateProfilePicture(user.id, profilePictureUrl);
    } catch (error) {
      // Clean up the uploaded file if the DB update fails
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
      throw error;
    }
  }

  @Delete('profile-picture')
  @ApiOperation({ summary: 'Remove profile picture' })
  removeProfilePicture(@CurrentUser() user: RequestUser) {
    return this.usersService.removeProfilePicture(user.id);
  }
}
