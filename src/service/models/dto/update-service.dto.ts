import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsNumber, MinLength, IsUrl, Min, Max, IsNotEmpty } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}

