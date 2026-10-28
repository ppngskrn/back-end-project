import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ToggleCacheInterceptor } from '../common/interceptors/toggle-cache.interceptor';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
 
describe('RoomsController (integration, service mocked)', () => {
  let app: INestApplication;
 
  const roomsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    disable: jest.fn(),
    enable: jest.fn(),
  };
  const cacheMock = { del: jest.fn() };
 
  const room = {
    id: 1,
    name: 'Deluxe Ocean View',
    description: 'King bed, balcony',
    capacity: 2,
    price_per_night: '1500.50',
    image_url: '/images/room101.jpg',
    is_active: true,
    created_at: '2026-10-26T01:00:00.000Z',
    updated_at: '2026-10-26T01:00:00.000Z',
  };
 
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        { provide: RoomsService, useValue: roomsServiceMock },
        { provide: CACHE_MANAGER, useValue: cacheMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(ToggleCacheInterceptor)
      .useValue({ intercept: (_ctx: unknown, next: { handle: () => unknown }) => next.handle() })
      .compile();
 
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });
 
  beforeEach(() => {
    jest.resetAllMocks();
  });
 
  afterAll(async () => {
    await app.close();
  });
 
  describe('POST /rooms', () => {
    const body = { name: 'Deluxe Ocean View', capacity: 2, price_per_night: 1500.5 };
 
    it('calls service.create and returns the created room', async () => {
      roomsServiceMock.create.mockResolvedValue(room);
 
      const res = await request(app.getHttpServer()).post('/rooms').send(body);
 
      expect(res.status).toBe(201);
      expect(res.body).toEqual(room);
      expect(roomsServiceMock.create).toHaveBeenCalledWith(body);
      expect(cacheMock.del).toHaveBeenCalledWith('/rooms');
    });
 
    it('returns 400 and does not call the service when the body is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/rooms')
        .send({ capacity: 'two' });
 
      expect(res.status).toBe(400);
      expect(roomsServiceMock.create).not.toHaveBeenCalled();
    });
  });
 
  describe('GET /rooms', () => {
    const list = {
      data: [room],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
 
    it('calls service.findAll with default paging and returns the list', async () => {
      roomsServiceMock.findAll.mockResolvedValue(list);
 
      const res = await request(app.getHttpServer()).get('/rooms');
 
      expect(res.status).toBe(200);
      expect(res.body).toEqual(list);
      expect(roomsServiceMock.findAll).toHaveBeenCalledWith({
        isActive: undefined,
        minCapacity: undefined,
        page: 1,
        limit: 10,
      });
    });
 
    it('passes query parameters to the service', async () => {
      roomsServiceMock.findAll.mockResolvedValue(list);
 
      await request(app.getHttpServer())
        .get('/rooms?is_active=true&min_capacity=2&page=2&limit=5')
        .expect(200);
 
      expect(roomsServiceMock.findAll).toHaveBeenCalledWith({
        isActive: true,
        minCapacity: 2,
        page: 2,
        limit: 5,
      });
    });
 
    it('returns 400 for a non-numeric page', async () => {
      const res = await request(app.getHttpServer()).get('/rooms?page=abc');
 
      expect(res.status).toBe(400);
      expect(roomsServiceMock.findAll).not.toHaveBeenCalled();
    });
  });
 
  describe('GET /rooms/:id', () => {
    it('returns the room when it exists', async () => {
      roomsServiceMock.findOne.mockResolvedValue(room);
 
      const res = await request(app.getHttpServer()).get('/rooms/1');
 
      expect(res.status).toBe(200);
      expect(res.body).toEqual(room);
      expect(roomsServiceMock.findOne).toHaveBeenCalledWith(1);
    });
 
    it('returns 404 when the service throws NotFoundException', async () => {
      roomsServiceMock.findOne.mockRejectedValue(
        new NotFoundException('Room 99 not found'),
      );
 
      const res = await request(app.getHttpServer()).get('/rooms/99');
 
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Room 99 not found');
    });
 
    it('returns 400 when the id is not a number', async () => {
      const res = await request(app.getHttpServer()).get('/rooms/abc');
 
      expect(res.status).toBe(400);
      expect(roomsServiceMock.findOne).not.toHaveBeenCalled();
    });
  });
 
  describe('PUT /rooms/:id', () => {
    it('calls service.update with the id and body and returns the result', async () => {
      const body = { name: 'Renamed Room', capacity: 4 };
      const updated = { ...room, ...body };
      roomsServiceMock.update.mockResolvedValue(updated);
 
      const res = await request(app.getHttpServer()).put('/rooms/1').send(body);
 
      expect(res.status).toBe(200);
      expect(res.body).toEqual(updated);
      expect(roomsServiceMock.update).toHaveBeenCalledWith(1, body);
      expect(cacheMock.del).toHaveBeenCalledWith('/rooms/1');
    });
 
    it('returns 404 when the service throws NotFoundException', async () => {
      roomsServiceMock.update.mockRejectedValue(new NotFoundException('Room 99 not found'));
 
      const res = await request(app.getHttpServer())
        .put('/rooms/99')
        .send({ name: 'x' });
 
      expect(res.status).toBe(404);
    });
  });
 
  describe('DELETE /rooms/:id', () => {
    it('calls service.remove with the id and returns the deleted room', async () => {
      roomsServiceMock.remove.mockResolvedValue(room);
 
      const res = await request(app.getHttpServer()).delete('/rooms/1');
 
      expect(res.status).toBe(200);
      expect(res.body).toEqual(room);
      expect(roomsServiceMock.remove).toHaveBeenCalledWith(1);
      expect(cacheMock.del).toHaveBeenCalledWith('/rooms/1');
    });
 
    it('returns 404 when the service throws NotFoundException', async () => {
      roomsServiceMock.remove.mockRejectedValue(
        new NotFoundException('Room 99 not found'),
      );
 
      const res = await request(app.getHttpServer()).delete('/rooms/99');
 
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Room 99 not found');
    });
  });
});