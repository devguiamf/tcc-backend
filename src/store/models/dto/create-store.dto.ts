import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsNumber,
  MinLength,
  ArrayMinSize,
  IsUrl,
  Min,
  Max,
  Matches,
  Length,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentInterval } from '../types/store.types';

export class WorkingHoursDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsBoolean()
  isOpen: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Open time must be in format HH:mm (24-hour format)',
  })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Close time must be in format HH:mm (24-hour format)',
  })
  closeTime?: string;
}

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(2)
  state: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'Zip code must be in format XXXXX-XXX or XXXXXXXX',
  })
  zipCode: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours: WorkingHoursDto[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsEnum(AppointmentInterval)
  @IsNotEmpty()
  appointmentInterval: AppointmentInterval;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}

