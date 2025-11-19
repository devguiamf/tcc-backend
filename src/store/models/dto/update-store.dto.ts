import { PartialType } from '@nestjs/mapped-types';
import { IsArray, ValidateNested, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStoreDto, WorkingHoursDto, LocationDto } from './create-store.dto';
import { AppointmentInterval } from '../types/store.types';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto[];

  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @Type(() => Number)
  @IsEnum(AppointmentInterval)
  appointmentInterval?: AppointmentInterval;
}

