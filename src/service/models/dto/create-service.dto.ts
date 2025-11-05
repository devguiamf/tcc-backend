import { IsString, IsNotEmpty, IsNumber, IsOptional, MinLength, IsUrl, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  price: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(1440)
  durationMinutes: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;
}

