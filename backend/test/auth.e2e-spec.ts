import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

/**
 * Auth API E2E tests: register → login → protected route.
 * Requires a running database (DATABASE_URL). Use a test database in CI.
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  const baseUrl = '/auth';
  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  const password = 'SecurePass123';
  const name = 'E2E User';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return access_token and user', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/register`)
        .send({
          name,
          email: uniqueEmail,
          password,
          role: 'OWNER',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(typeof res.body.access_token).toBe('string');
          expect(res.body.access_token.length).toBeGreaterThan(0);
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toMatchObject({
            email: uniqueEmail,
            name,
            role: 'OWNER',
          });
          expect(res.body.user).toHaveProperty('id');
          expect(typeof res.body.user.id).toBe('number');
        });
    });

    it('should reject duplicate email with 409', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/register`)
        .send({
          name: 'Other',
          email: uniqueEmail,
          password: 'OtherPass123',
          role: 'OWNER',
        })
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain(uniqueEmail);
        });
    });

    it('should reject invalid payload (e.g. short password) with 400', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/register`)
        .send({
          name: 'Bad',
          email: 'bad@example.com',
          password: 'short',
          role: 'OWNER',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with registered credentials and return access_token', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/login`)
        .send({ email: uniqueEmail, password })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(uniqueEmail);
        });
    });

    it('should reject wrong password with 401', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/login`)
        .send({ email: uniqueEmail, password: 'WrongPassword' })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should reject unknown email with 401', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/login`)
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me (protected)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`${baseUrl}/login`)
        .send({ email: uniqueEmail, password });
      accessToken = (res.body as { access_token: string }).access_token;
    });

    it('should return current user when valid JWT is provided', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            email: uniqueEmail,
            name,
            role: 'OWNER',
          });
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('isActive');
          expect(res.body).toHaveProperty('createdAt');
        });
    });

    it('should return 401 when no Authorization header', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/me`)
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 401 when Bearer token is invalid', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/me`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
