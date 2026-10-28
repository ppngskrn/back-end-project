import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    description: "Room name (max 100 characters)",
    example: "Deluxe Ocean View",
    maxLength: 100,
    type: String,
  })
  @MaxLength(100)
  @IsNotEmpty()
  @IsString()
  name: string;
 
  @ApiPropertyOptional({
    description: "Free-text description of the room",
    example: "King bed, private balcony, sea view",
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
 
  @ApiProperty({
    description: "Maximum number of guests",
    example: 2,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  capacity: number;
 
  @ApiProperty({
    description: "Price per night",
    example: 1500.5,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  price_per_night: number;
 
  @ApiPropertyOptional({
    description: "URL of a photo of the room",
    example: "/images/room101.jpg",
    type: String,
  })
  @IsOptional()
  @IsString()
  image_url?: string;
 
  @ApiPropertyOptional({
    description: "Whether the room can currently be booked",
    example: true,
    default: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
