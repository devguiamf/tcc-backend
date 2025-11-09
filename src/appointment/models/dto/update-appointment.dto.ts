import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto';
import { AppointmentStatus } from '../types/appointment.types';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

