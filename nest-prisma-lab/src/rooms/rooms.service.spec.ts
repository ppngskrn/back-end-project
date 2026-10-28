/*
AI Declaration:
I used claude to help write the mock unit tests,the integration tests in the ...spec.ts files, and the e2e tests.

Reflection:
I learned how to write unit tests, integration tests, and e2e tests. The AI helped me structure the tests and mock the PrismaService, which improved my understanding of testing in NestJS.
*/

import { Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from './rooms.service';
 
describe('RoomsService (unit)', () => {
  let service: RoomsService;

  const prismaMock = {
    rooms: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
 
  const room = {
    id: 1,
    name: 'Deluxe Ocean View',
    description: 'King bed, balcony',
    capacity: 2,
    price_per_night: '1500.50',
    image_url: '/images/room101.jpg',
    is_active: true,
    created_at: new Date('2026-10-26T01:00:00.000Z'),
    updated_at: new Date('2026-10-26T01:00:00.000Z'),
  };
 
  beforeEach(async () => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
 
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
 
    service = module.get(RoomsService);
  });
 
  afterAll(() => {
    jest.restoreAllMocks();
  });
 
  describe('create', () => {
    const dto = {
      name: 'Deluxe Ocean View',
      capacity: 2,
      price_per_night: 1500.5,
    };
 
    it('passes the data to prisma.rooms.create and returns the new room', async () => {
      prismaMock.rooms.create.mockResolvedValue(room);
 
      const result = await service.create(dto);
 
      expect(prismaMock.rooms.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(room);
    });
 
    it('rethrows when the database call fails', async () => {
      prismaMock.rooms.create.mockRejectedValue(new Error('db down'));
 
      await expect(service.create(dto)).rejects.toThrow('db down');
    });
  });
 
  describe('findAll', () => {
    it('returns rooms with pagination metadata', async () => {
      prismaMock.rooms.findMany.mockResolvedValue([room]);
      prismaMock.rooms.count.mockResolvedValue(1);
 
      const result = await service.findAll({ page: 1, limit: 10 });
 
      expect(prismaMock.rooms.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { id: 'asc' },
      });
      expect(result).toEqual({
        data: [room],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });
 
    it('applies the is_active and min_capacity filters and the page offset', async () => {
      prismaMock.rooms.findMany.mockResolvedValue([room]);
      prismaMock.rooms.count.mockResolvedValue(12);
 
      const result = await service.findAll({
        isActive: true,
        minCapacity: 2,
        page: 2,
        limit: 5,
      });
 
      const expectedWhere = { is_active: true, capacity: { gte: 2 } };
      expect(prismaMock.rooms.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 5,
        take: 5,
        orderBy: { id: 'asc' },
      });
      expect(prismaMock.rooms.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(result.meta).toEqual({ total: 12, page: 2, limit: 5, totalPages: 3 });
    });
 
    it('clamps limit to 100 and page to at least 1', async () => {
      prismaMock.rooms.findMany.mockResolvedValue([]);
      prismaMock.rooms.count.mockResolvedValue(0);
 
      const result = await service.findAll({ page: 0, limit: 1000 });
 
      expect(prismaMock.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      });
    });
 
    it('rethrows when the database call fails', async () => {
      prismaMock.rooms.findMany.mockRejectedValue(new Error('db down'));
      prismaMock.rooms.count.mockResolvedValue(0);
 
      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow('db down');
    });
  });
 
  describe('findOne', () => {
    it('returns the room with the given id', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(room);
 
      const result = await service.findOne(1);
 
      expect(prismaMock.rooms.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(room);
    });
 
    it('throws NotFoundException when the room does not exist', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(null);
 
      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow('Room 99 not found');
    });
  });
 
  describe('update', () => {
    const dto = { name: 'Renamed Room', capacity: 4 };
 
    it('calls prisma.rooms.update with the id and data and returns the result', async () => {
      const updated = { ...room, ...dto };
      prismaMock.rooms.findUnique.mockResolvedValue(room);
      prismaMock.rooms.update.mockResolvedValue(updated);
 
      const result = await service.update(1, dto);
 
      expect(prismaMock.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto, updated_at: expect.any(Date) },
      });
      expect(result).toEqual(updated);
    });
 
    it('throws NotFoundException and does not update when the room does not exist', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(null);
 
      await expect(service.update(99, dto)).rejects.toThrow(NotFoundException);
      expect(prismaMock.rooms.update).not.toHaveBeenCalled();
    });
 
    it('rethrows when the database update fails', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(room);
      prismaMock.rooms.update.mockRejectedValue(new Error('update failed'));
 
      await expect(service.update(1, dto)).rejects.toThrow('update failed');
    });
  });
 
  describe('remove', () => {
    it('calls prisma.rooms.delete with the id and returns the deleted room', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(room);
      prismaMock.rooms.delete.mockResolvedValue(room);
 
      const result = await service.remove(1);
 
      expect(prismaMock.rooms.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(room);
    });
 
    it('throws NotFoundException and does not delete when the room does not exist', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(null);
 
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(prismaMock.rooms.delete).not.toHaveBeenCalled();
    });
 
    it('rethrows when the database delete fails', async () => {
      prismaMock.rooms.findUnique.mockResolvedValue(room);
      prismaMock.rooms.delete.mockRejectedValue(new Error('delete failed'));
 
      await expect(service.remove(1)).rejects.toThrow('delete failed');
    });
  });
});
