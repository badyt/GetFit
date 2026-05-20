/**
 * E2E tests — full HTTP pipeline with mocked DB and email.
 *
 * These tests verify: guards, pipes, exception filter, validation, and routing.
 * PrismaService and EmailService are overridden so no real DB or SMTP is needed.
 */

// Must be set before AppModule is loaded so ConfigModule validation passes
process.env['DATABASE_URL'] = 'postgresql://localhost/test_getfit';
process.env['JWT_SECRET'] = 'e2e-test-secret-that-is-at-least-32-characters';
process.env['JWT_EXPIRES_IN'] = '1h';
process.env['APP_URL'] = 'http://localhost:3001';
process.env['EMAIL_USER'] = 'test@example.com';
process.env['EMAIL_PASSWORD'] = 'test-password';
process.env['NODE_ENV'] = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';

// ─── Shared mocks ────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  food: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  exercise: { findMany: jest.fn() },
  exerciseCategory: { findMany: jest.fn(), count: jest.fn() },
  mealPlan: { findUnique: jest.fn() },
  workoutPlan: { findUnique: jest.fn() },
  trainerInvite: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  dailyHistory: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  $transaction: jest.fn(),
};

const mockEmail = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendTrainerInviteEmail: jest.fn().mockResolvedValue(undefined),
};

// ─── Setup ───────────────────────────────────────────────────────────────────

describe('GetFit API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(EmailService)
      .useValue(mockEmail)
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEmail.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmail.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function makeToken(id: string, role: UserRole): string {
    return jwtService.sign({ id, role });
  }

  // ─── Public endpoints ──────────────────────────────────────────────────────

  describe('GET /api/auth/health', () => {
    it('returns 200 with status ok — no auth required', () => {
      return request(app.getHttpServer())
        .get('/api/auth/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('GET /api/catalog/foods', () => {
    it('returns 200 with food list wrapped in success envelope — no auth required', async () => {
      mockPrisma.food.findMany.mockResolvedValue([
        { id: 'f1', name: 'Oats', caloriesPer100g: 350, proteinPer100g: 13, image: null },
      ]);

      const res = await request(app.getHttpServer()).get('/api/catalog/foods').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].name).toBe('Oats');
    });
  });

  describe('GET /api/catalog/exercises', () => {
    it('returns 200 with exercise categories wrapped in success envelope — no auth required', async () => {
      mockPrisma.exerciseCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Legs', exercises: [] },
      ]);

      const res = await request(app.getHttpServer()).get('/api/catalog/exercises').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Auth guard ────────────────────────────────────────────────────────────

  describe('JWT guard', () => {
    it('returns 401 for protected endpoint without token', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('returns 401 for protected endpoint with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('allows access with valid JWT', async () => {
      const token = makeToken('user-1', UserRole.TRAINEE);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: UserRole.TRAINEE,
        profilePicture: null,
        isEmailVerified: true,
        createdAt: new Date(),
        trainerId: null,
        trainer: null,
      });

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ─── Role guard ────────────────────────────────────────────────────────────

  describe('Roles guard', () => {
    it('returns 403 when trainee accesses trainer-only endpoint', async () => {
      const traineeToken = makeToken('trainee-1', UserRole.TRAINEE);
      await request(app.getHttpServer())
        .get('/api/trainer/trainees')
        .set('Authorization', `Bearer ${traineeToken}`)
        .expect(403);
    });

    it('returns 403 when trainer accesses trainee-only endpoint', async () => {
      const trainerToken = makeToken('trainer-1', UserRole.TRAINER);
      await request(app.getHttpServer())
        .get('/api/meal-plans/my')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(403);
    });

    it('allows trainer to access trainer endpoints', async () => {
      const trainerToken = makeToken('trainer-1', UserRole.TRAINER);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/api/trainer/trainees')
        .set('Authorization', `Bearer ${trainerToken}`)
        .expect(200);
    });
  });

  // ─── Validation pipe ───────────────────────────────────────────────────────

  describe('ValidationPipe', () => {
    it('returns 400 when register body is missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'short' })
        .expect(400);
    });

    it('returns 400 when extra unknown fields are sent', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'pass123', hackerField: 'inject' })
        .expect(400);
    });
  });

  // ─── Auth flow ─────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('returns 201 and token on successful registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        name: 'Bob',
        email: 'bob@example.com',
        role: UserRole.TRAINEE,
        isEmailVerified: false,
        profilePicture: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('bob@example.com');
    });

    it('returns 409 when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'bob@example.com' });

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name: 'Bob', email: 'bob@example.com', password: 'password123' })
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 404 when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'pass123' })
        .expect(404);
    });
  });

  // ─── GlobalExceptionFilter error shape ────────────────────────────────────

  describe('GlobalExceptionFilter', () => {
    it('error responses include statusCode, timestamp, and path', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me').expect(401);
      expect(res.body).toMatchObject({
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/api/auth/me',
      });
    });

    it('returns 404 for unknown routes', async () => {
      await request(app.getHttpServer()).get('/api/nonexistent-route').expect(404);
    });
  });
});
