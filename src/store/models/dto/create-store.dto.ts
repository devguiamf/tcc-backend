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
import { Type, Transform } from 'class-transformer';
import { AppointmentInterval } from '../types/store.types';

export class WorkingHoursDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
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

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Type(() => Number)
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

  @Type(() => Number)
  @IsEnum(AppointmentInterval)
  @IsNotEmpty()
  appointmentInterval: AppointmentInterval;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}

