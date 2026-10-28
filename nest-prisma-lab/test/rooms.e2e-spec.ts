import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Role } from '../src/common/enums/role.enum';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('@keyv/redis', () => ({ createKeyv: jest.fn(() => ({})) }));
jest.mock('@nestjs/observe', () => {
  class ObserveStub {}
  return {
    createObserveModule: () => ({
      ObserveModule: { forRoot: () => ({ module: ObserveStub }) },
      ObserveInstrument: undefined,
    }),
  };
});

const cacheMock = {
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(undefined),
};
 
process.env.DISABLE_THROTTLE = 'true';
jest.setTimeout(30_000);
 
describe('Rooms API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let roomId: number | undefined;
 
  const adminUsername = `e2e_admin_${Date.now()}`;
  const adminPassword = 'E2ePassw0rd!';

  const newRoom = {
    name: 'E2E Test Suite',
    description: 'Created by the e2e test',
    capacity: 987,
    price_per_night: 1234.5,
    image_url: '/images/e2e.jpg',
    is_active: true,
  };
 
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CACHE_MANAGER)
      .useValue(cacheMock)
      .compile();
 
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
 
    prisma = app.get(PrismaService, { strict: false });
 
    await prisma.users.create({
      data: {
        username: adminUsername,
        password: await bcrypt.hash(adminPassword, 10),
        role: Role.ADMIN,
      },
    });
 
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: adminUsername, password: adminPassword })
      .expect(201);
    token = login.body.access_token;
  });
 
  afterAll(async () => {
    if (roomId !== undefined) {
      await prisma.rooms.deleteMany({ where: { id: roomId } });
    }
    await prisma.users.deleteMany({ where: { username: adminUsername } });
    await app.close();
  });
 
  it('creates a room (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send(newRoom)
      .expect(201);
 
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.name).toBe(newRoom.name);
    roomId = res.body.id;
  });
 
  it('rejects creating a room without a token (401)', async () => {
    await request(app.getHttpServer()).post('/rooms').send(newRoom).expect(401);
  });
 
  it('lists rooms and includes the created room', async () => {
    const res = await request(app.getHttpServer())
      .get('/rooms?min_capacity=987&limit=100')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
 
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((r: { id: number }) => r.id === roomId)).toBe(true);
  });
 
  it('gets a single room by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
 
    expect(res.body.id).toBe(roomId);
    expect(res.body.name).toBe(newRoom.name);
    expect(res.body.capacity).toBe(newRoom.capacity);
  });
 
  it('updates a room (200)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Test Suite (updated)', capacity: 988 })
      .expect(200);
 
    expect(res.body.id).toBe(roomId);
    expect(res.body.name).toBe('E2E Test Suite (updated)');
    expect(res.body.capacity).toBe(988);
  });
 
  it('returns 404 when updating a room that does not exist', async () => {
    await request(app.getHttpServer())
      .put('/rooms/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'does not exist' })
      .expect(404);
  });
 
  it('deletes a room (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
 
  it('returns 404 for the deleted room', async () => {
    await request(app.getHttpServer())
      .get(`/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});