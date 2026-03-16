import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E tests for key flows: signup/login, create pet, match, book boarding,
 * accept, leave review, place order. Requires DATABASE_URL (test DB).
 * Marks users as emailVerified so booking/checkout (VerifiedEmailGuard) succeed.
 */
describe('Key flows (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerBookingId: number | null = null;
  const ts = Date.now();
  const ownerEmail = `owner-${ts}@example.com`;
  const hostEmail = `host-${ts}@example.com`;
  const adminEmail = `admin-${ts}@example.com`;
  const password = 'SecurePass123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

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

  async function loginAs(email: string, pass: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: pass });
    expect(res.status).toBe(200);
    return (res.body as { access_token: string }).access_token;
  }

  async function markEmailVerified(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  describe('Signup and login', () => {
    it('should register owner and login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Owner',
          email: ownerEmail,
          password,
          role: 'OWNER',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user).toMatchObject({
        email: ownerEmail,
        name: 'E2E Owner',
        role: 'OWNER',
      });
      await markEmailVerified(res.body.user.id);
    });

    it('should register host and login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Host',
          email: hostEmail,
          password,
          role: 'HOST',
        });
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email: hostEmail, role: 'HOST' });
      await markEmailVerified(res.body.user.id);
    });

    it('should register admin and login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'E2E Admin',
          email: adminEmail,
          password,
          role: 'ADMIN',
        });
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email: adminEmail, role: 'ADMIN' });
      await markEmailVerified(res.body.user.id);
    });
  });

  describe('Create pet and match', () => {
    it('should create pet as owner', async () => {
      const token = await loginAs(ownerEmail, password);
      const res = await request(app.getHttpServer())
        .post('/pets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Buddy',
          species: 'dog',
          breed: 'Labrador',
          age: 24,
          gender: 'male',
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Buddy',
        species: 'dog',
        breed: 'Labrador',
        age: 24,
        gender: 'male',
      });
      expect(res.body).toHaveProperty('id');
    });

    it('should get matches for pet (real DB; may be empty)', async () => {
      const token = await loginAs(ownerEmail, password);
      const listRes = await request(app.getHttpServer())
        .get('/pets/my?limit=5&offset=0')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      const pets = (listRes.body as { data: { id: string }[] }).data;
      if (pets.length === 0) return;
      const petId = pets[0].id;
      const matchRes = await request(app.getHttpServer())
        .get(`/pets/${petId}/matches`)
        .set('Authorization', `Bearer ${token}`);
      expect(matchRes.status).toBe(200);
      expect(Array.isArray(matchRes.body)).toBe(true);
      // Each item must be real match shape: pet, score, explanations
      if (matchRes.body.length > 0) {
        expect(matchRes.body[0]).toHaveProperty('pet');
        expect(matchRes.body[0]).toHaveProperty('score');
        expect(matchRes.body[0]).toHaveProperty('explanations');
      }
    });
  });

  describe('Boarding: profile, book, accept', () => {
    let profileId: number;
    let bookingId: number = 0;

    it('should create boarding profile as host', async () => {
      const token = await loginAs(hostEmail, password);
      const res = await request(app.getHttpServer())
        .post('/boarding/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          location: 'NYC',
          capacity: 2,
          pricePerDay: 50,
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        location: 'NYC',
        capacity: 2,
        pricePerDay: 50,
      });
      profileId = res.body.id;
    });

    it('should approve profile as admin', async () => {
      const token = await loginAs(adminEmail, password);
      const res = await request(app.getHttpServer())
        .patch(`/boarding/${profileId}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.isApproved).toBe(true);
    });

    it('should book as owner', async () => {
      const token = await loginAs(ownerEmail, password);
      const start = new Date();
      const end = new Date(Date.now() + 2 * 86400000);
      const res = await request(app.getHttpServer())
        .post(`/boarding/${profileId}/book`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      bookingId = res.body.id;
    });

    it('should accept booking as host', async () => {
      const token = await loginAs(hostEmail, password);
      const res = await request(app.getHttpServer())
        .patch(`/boarding/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'ACCEPTED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
      ownerBookingId = bookingId;
    });
  });

  describe('Leave review (completed booking)', () => {
    it('should create review when booking is completed', async () => {
      if (ownerBookingId == null) return;
      await prisma.booking.update({
        where: { id: ownerBookingId },
        data: { status: 'COMPLETED' },
      });
      const ownerToken = await loginAs(ownerEmail, password);
      const res = await request(app.getHttpServer())
        .post(`/boarding/bookings/${ownerBookingId}/review`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ rating: 5, comment: 'Great stay!' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ rating: 5, comment: 'Great stay!' });
    });
  });

  describe('Place order', () => {
    let productId: string;

    it('should create product as admin', async () => {
      const token = await loginAs(adminEmail, password);
      const res = await request(app.getHttpServer())
        .post('/store/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'E2E Dog Treats',
          price: 9.99,
          stock: 100,
          category: 'FOOD',
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'E2E Dog Treats',
        price: 9.99,
        stock: 100,
        category: 'FOOD',
      });
      expect(typeof res.body.id).toBe('string');
      productId = res.body.id;
    });

    it('should checkout as owner (place order)', async () => {
      const token = await loginAs(ownerEmail, password);
      const res = await request(app.getHttpServer())
        .post('/store/cart/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ productId, quantity: 2 }],
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PLACED');
      expect(res.body.total).toBe(9.99 * 2);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(1);
    });
  });
});
