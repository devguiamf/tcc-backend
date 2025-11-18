import { PartialType } from '@nestjs/mapped-types';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStoreDto, WorkingHoursDto, LocationDto } from './create-store.dto';

export class UpdateStoreDto extends PartialType(CreateStoreDto) {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto[];

  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

