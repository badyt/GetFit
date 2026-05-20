import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { MulterExceptionFilter } from '../common/filters/multer-exception.filter';
import { imageFileFilter } from '../common/multer/image-file-filter';
import { AdminService } from './admin.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateFoodDto } from './dto/create-food.dto';

const foodStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'food');
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`);
  },
});

const exerciseStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'uploads', 'exercises');
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`);
  },
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseFilters(MulterExceptionFilter)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard counts (users, foods, exercises)' })
  async getStats() {
    const data = await this.adminService.getStats();
    return { success: true, data };
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional role filter and search' })
  async getUsers(@Query() query: AdminUsersQueryDto) {
    const data = await this.adminService.getUsers(query);
    return { success: true, data };
  }

  @Patch('users/:id/promote')
  @ApiOperation({ summary: 'Promote a trainee to trainer' })
  async promoteUser(@Param('id') id: string) {
    const result = await this.adminService.promoteUser(id);
    return { success: true, ...result };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user (cannot delete yourself)' })
  async deleteUser(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const result = await this.adminService.deleteUser(user.id, id);
    return { success: true, ...result };
  }

  // ─── Foods ──────────────────────────────────────────────────────────────────

  @Get('foods')
  @ApiOperation({ summary: 'List all food items' })
  async getFoods() {
    const data = await this.adminService.getFoods();
    return { success: true, data };
  }

  @Post('foods')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: foodStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Create a food item (with optional image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'caloriesPer100g', 'proteinPer100g'],
      properties: {
        name: { type: 'string' },
        caloriesPer100g: { type: 'number' },
        proteinPer100g: { type: 'number' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async createFood(
    @Body() dto: CreateFoodDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/food/${file.filename}` : null;
    try {
      const data = await this.adminService.createFood(dto, imageUrl);
      return { success: true, data };
    } catch (error) {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path);
      throw error;
    }
  }

  @Delete('foods/:id')
  @ApiOperation({ summary: 'Delete a food item (cascades to all meal plans using it)' })
  async deleteFood(@Param('id') id: string) {
    const result = await this.adminService.deleteFood(id);
    return { success: true, ...result };
  }

  // ─── Exercise Categories ────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all exercise categories with exercise counts' })
  async getCategories() {
    const data = await this.adminService.getCategories();
    return { success: true, data };
  }

  // ─── Exercises ──────────────────────────────────────────────────────────────

  @Get('exercises')
  @ApiOperation({ summary: 'List all exercises with their category' })
  async getExercises() {
    const data = await this.adminService.getExercises();
    return { success: true, data };
  }

  @Post('exercises')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: exerciseStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Create an exercise (with optional image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string', description: 'Use an existing category by ID' },
        categoryName: { type: 'string', description: 'Find or create a category by name' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async createExercise(
    @Body() dto: CreateExerciseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/exercises/${file.filename}` : null;
    try {
      const data = await this.adminService.createExercise(dto, imageUrl);
      return { success: true, data };
    } catch (error) {
      if (file?.path && existsSync(file.path)) unlinkSync(file.path);
      throw error;
    }
  }

  @Delete('exercises/:id')
  @ApiOperation({ summary: 'Delete an exercise (cascades to all workout plans using it)' })
  async deleteExercise(@Param('id') id: string) {
    const result = await this.adminService.deleteExercise(id);
    return { success: true, ...result };
  }
}
