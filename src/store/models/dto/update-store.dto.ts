import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  MinLength,
  ArrayMinSize,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStoreDto, WorkingHoursDto, LocationDto } from './create-store.dto';
import { AppointmentInterval } from '../types/store.types';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsEnum(AppointmentInterval)
  appointmentInterval?: AppointmentInterval;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}

