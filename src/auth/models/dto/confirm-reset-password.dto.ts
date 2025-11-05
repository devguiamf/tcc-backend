import { IsString, MinLength } from 'class-validator';

export class ConfirmResetPasswordDto {
  @IsString()
  code: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  confirmPassword: string;
}

