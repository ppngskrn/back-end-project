import {
  applyDecorators,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Inject,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Cache } from 'cache-manager';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ToggleCacheInterceptor } from '../common/interceptors/toggle-cache.interceptor';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

const roomSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    name: { type: 'string', example: 'Deluxe Ocean View' },
    description: {
      type: 'string',
      nullable: true,
      example: 'King bed, private balcony, sea view',
    },
    capacity: { type: 'integer', example: 2 },
    price_per_night: {
      type: 'string',
      example: '1500.50',
      description: 'Decimal value, serialized as a string',
    },
    image_url: {
      type: 'string',
      nullable: true,
      example: '"/images/room101.jpg"',
    },
    is_active: { type: 'boolean', example: true },
    created_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-10-26T01:00:00.000Z',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      example: '2026-10-26T01:00:00.000Z',
    },
  },
};
 
const roomListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: roomSchema },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 25, description: 'Rooms matching the filters' },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalPages: { type: 'integer', example: 3 },
      },
    },
  },
};

const errorResponse = (
  status: number,
  description: string,
  message: string | string[],
  error?: string,
) => ({
  status,
  description,
  schema: {
    type: 'object',
    properties: {
      statusCode: { type: 'integer', example: status },
      message: Array.isArray(message)
        ? { type: 'array', items: { type: 'string' }, example: message }
        : { type: 'string', example: message },
      ...(error && { error: { type: 'string', example: error } }),
    },
  },
});

const CommonErrors = () =>
  applyDecorators(
    ApiResponse(errorResponse(401, 'Missing or invalid JWT', 'Unauthorized')),
    ApiResponse(
      errorResponse(
        429,
        'Rate limit exceeded (100 requests per minute)',
        'ThrottlerException: Too Many Requests',
      ),
    ),
  );
 
@ApiTags('rooms')
@ApiBearerAuth('access-token')
@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { limit: 100, ttl: 60_000 } })
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}
 
  private async invalidate(id?: number) {
    await this.cache.del('/rooms');
    if (id !== undefined) {
      await this.cache.del(`/rooms/${id}`);
    }
  }
 
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new room (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Room created',
    schema: roomSchema,
  })
  @ApiResponse(
    errorResponse(
      400, 
      'Validation failed', 
      ['name should not be empty', 'capacity must be an integer number'], 
      'Bad Request',
    ),
  )
  @ApiResponse(
    errorResponse(
      403, 
      'Admin role required', 
      'Forbidden resource', 
      'Forbidden'
    )
  )
  @CommonErrors()
  async create(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomsService.create(createRoomDto);
    await this.invalidate();
    return room;
  }
 
  @Get()
  @UseInterceptors(ToggleCacheInterceptor)
  @ApiOperation({
    summary: 'List rooms',
    description:
      'Returns a paginated list of rooms. Results are cached in Redis for 5 minutes.',
  })

  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Only return rooms that are (true) or are not (false) active',
    example: true,
  })
  @ApiQuery({
    name: 'min_capacity',
    required: false,
    type: Number,
    description: 'Only return rooms that fit at least this many guests',
    example: 2,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number, starting at 1 (default 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Rooms per page, 1-100 (default 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of rooms',
    schema: roomListSchema,
  })
  @ApiResponse(
    errorResponse(
      400,
      'A query parameter has an invalid value',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @CommonErrors()
  findAll(
    @Query('is_active', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('min_capacity', new ParseIntPipe({ optional: true }))
    minCapacity?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.roomsService.findAll({ isActive, minCapacity, page, limit });
  }
 
  @Get(':id')
  @UseInterceptors(ToggleCacheInterceptor)
  @ApiOperation({ summary: 'Get a single room by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'The room', schema: roomSchema })
  @ApiResponse(
    errorResponse(
      400,
      'ID is not a number',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @ApiResponse(errorResponse(404, 'Room not found', 'Room 99 not found', 'Not Found'))
  @CommonErrors()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  // Lab 10: update
  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a room (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'The updated room',
    schema: roomSchema,
  })
  @ApiResponse(
    errorResponse(
      400,
      'Invalid ID or body',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @ApiResponse(errorResponse(403, 'Admin role required', 'Forbidden resource', 'Forbidden'))
  @ApiResponse(errorResponse(404, 'Room not found', 'Room 99 not found', 'Not Found'))
  @CommonErrors()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    const room = await this.roomsService.update(id, updateRoomDto);
    await this.invalidate(id);
    return room;
  }
 
  // Lab 10: delete
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a room (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'The deleted room',
    schema: roomSchema,
  })
  @ApiResponse(
    errorResponse(
      400,
      'ID is not a number',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @ApiResponse(errorResponse(403, 'Admin role required', 'Forbidden resource', 'Forbidden'))
  @ApiResponse(errorResponse(404, 'Room not found', 'Room 99 not found', 'Not Found'))
  @CommonErrors()
  async remove(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.remove(id);
    await this.invalidate(id);
    return room;
  }
 
  @Patch(':id/disable')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Disable a room (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Room disabled (is_active is now false)',
    schema: {
      ...roomSchema,
      properties: {
        ...roomSchema.properties,
        is_active: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse(
    errorResponse(
      400,
      'ID is not a number',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @ApiResponse(errorResponse(403, 'Admin role required', 'Forbidden resource', 'Forbidden'))
  @ApiResponse(errorResponse(404, 'Room not found', 'Room 99 not found', 'Not Found'))
  @CommonErrors()
  async disable(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.disable(id);
    await this.invalidate(id);
    return room;
  }
 
  @Patch(':id/enable')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enable a room (admin only)' })
  @ApiParam({ name: 'id', type: Number, description: 'Room ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Room enabled (is_active is now true)',
    schema: roomSchema,
  })
  @ApiResponse(
    errorResponse(
      400,
      'ID is not a number',
      'Validation failed (numeric string is expected)',
      'Bad Request',
    ),
  )
  @ApiResponse(errorResponse(403, 'Admin role required', 'Forbidden resource', 'Forbidden'))
  @ApiResponse(errorResponse(404, 'Room not found', 'Room 99 not found', 'Not Found'))
  @CommonErrors()
  async enable(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.enable(id);
    await this.invalidate(id);
    return room;
  }
}