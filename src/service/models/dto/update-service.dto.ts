import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @Type(() => Number)
  price?: number;

  @Type(() => Number)
  durationMinutes?: number;
}

