import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsOptional,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

