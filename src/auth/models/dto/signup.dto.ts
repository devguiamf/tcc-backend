import { UserType } from '@/user/models/types/user.types';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserType)
  type: UserType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF must be in format XXX.XXX.XXX-XX',
  })
  cpf?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,14}$/, {
    message: 'Phone must be a valid phone number',
  })
  phone?: string;
}

