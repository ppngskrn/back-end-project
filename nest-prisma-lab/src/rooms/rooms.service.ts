import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';
 
export interface FindRoomsOptions {
  isActive?: boolean;
  minCapacity?: number;
  page: number;
  limit: number;
}
 
@Injectable()
export class RoomsService {
  private readonly logger = new Logger('RoomsService');
 
  constructor(private readonly prisma: PrismaService) {}
 
  async create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating room: ${createRoomDto.name}`);
    try {
      return await this.prisma.rooms.create({
        data: createRoomDto,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create room: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
 
  // Task 6: optional filters 
  async findAll(options: FindRoomsOptions) {
    this.logger.log('Fetching all rooms');
    const page = Math.max(1, options.page);
    const limit = Math.min(100, Math.max(1, options.limit));
 
    const where = {
      ...(options.isActive !== undefined && { is_active: options.isActive }),
      ...(options.minCapacity !== undefined && {
        capacity: { gte: options.minCapacity },
      }),
    };
 
    const [data, total] = await Promise.all([
      this.prisma.rooms.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.rooms.count({ where }),
    ]);
 
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
 
  async findOne(id: number) {
    this.logger.log(`Fetching room id=${id}`);
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    
    if (!room) {
      this.logger.warn(`Room ${id} not found`);
      throw new NotFoundException(`Room ${id} not found`);
    }
    return room;
  }

    // task 3: test update
    async update(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Updating room id=${id}`);
    try {
      await this.findOne(id);
      return await this.prisma.rooms.update({
        where: { id },
        data: { ...updateRoomDto, updated_at: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update room id=${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
 
  // task 3: test delete
  async remove(id: number) {
    this.logger.log(`Removing room id=${id}`);
    try {
      await this.findOne(id);
      return await this.prisma.rooms.delete({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to remove room id=${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
 
  async disable(id: number) {
    this.logger.log(`Disabling room id=${id}`);
    try {
      await this.findOne(id); 
      return await this.prisma.rooms.update({
        where: { id },
        data: { is_active: false },
      });
    } catch (error) {
      this.logger.error(
        `Failed to disable room id=${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
 
  async enable(id: number) {
    this.logger.log(`Enabling room id=${id}`);
    try {
      await this.findOne(id);
      return await this.prisma.rooms.update({
        where: { id },
        data: { is_active: true },
      });
    } catch (error) {
      this.logger.error(
        `Failed to enable room id=${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}