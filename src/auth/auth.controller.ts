import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './models/dto/signup.dto';
import { LoginDto } from './models/dto/login.dto';
import { ResetPasswordDto } from './models/dto/reset-password.dto';
import { RequestResetPasswordDto } from './models/dto/request-reset-password.dto';
import { ConfirmResetPasswordDto } from './models/dto/confirm-reset-password.dto';
import { SignupOutput, LoginOutput } from './models/types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() signupDto: SignupDto): Promise<SignupOutput> {
    return await this.service.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginOutput> {
    return await this.service.login(loginDto);
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() requestResetDto: RequestResetPasswordDto): Promise<{ message: string }> {
    await this.service.requestPasswordReset(requestResetDto);
    return { message: 'Se o e-mail existir, um link de redefinição de senha foi enviado' };
  }

  @Post('confirm-password-reset')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() confirmResetDto: ConfirmResetPasswordDto): Promise<{ message: string }> {
    await this.service.confirmPasswordReset(confirmResetDto);
    return { message: 'Senha redefinida com sucesso' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.service.resetPassword(resetPasswordDto);
    return { message: 'Senha redefinida com sucesso' };
  }

  @Post('admin/test')
  @HttpCode(HttpStatus.OK)
  test(): { message: string } {
    return { message: 'Auth module is working' };
  }
}

