import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { SignupDto } from './models/dto/signup.dto';
import { LoginDto } from './models/dto/login.dto';
import { ResetPasswordDto } from './models/dto/reset-password.dto';
import { RequestResetPasswordDto } from './models/dto/request-reset-password.dto';
import { ConfirmResetPasswordDto } from './models/dto/confirm-reset-password.dto';
import { SignupOutput, LoginOutput } from './models/types/auth.types';
import { UserType } from '../user/models/types/user.types';
import { CreateUserDto } from '../user/models/dto/create-user.dto';
import { PasswordResetCodeRepository } from './repositories/password-reset-code.repository';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly RESET_CODE_EXPIRATION_HOURS = 1;

  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly passwordResetCodeRepository: PasswordResetCodeRepository,
  ) {}

  async signup(input: SignupDto): Promise<SignupOutput> {
    await this.validateSignupData(input);
    const createUserDto: CreateUserDto = {
      name: input.name,
      email: input.email,
      password: input.password,
      type: input.type,
      cpf: input.cpf,
      phone: input.phone,
    };
    const user = await this.userService.create(createUserDto);
    const accessToken = this.generateToken(user.id);
    return {
      accessToken,
      user,
    };
  }

  async login(input: LoginDto): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmailWithPassword(input.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const accessToken = this.generateToken(user.id);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        cpf: user.cpf || undefined,
        phone: user.phone || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async requestPasswordReset(input: RequestResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      return;
    }
    const resetCode = this.generateResetCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.RESET_CODE_EXPIRATION_HOURS);
    await this.passwordResetCodeRepository.invalidateUserCodes(input.email);
    await this.passwordResetCodeRepository.create(input.email, resetCode, expiresAt);
  }

  async confirmPasswordReset(input: ConfirmResetPasswordDto): Promise<void> {
    if (input.password !== input.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }
    const resetCode = await this.passwordResetCodeRepository.findByCode(input.code);
    if (!resetCode) {
      throw new BadRequestException('Código de redefinição inválido ou expirado');
    }
    if (resetCode.isUsed) {
      throw new BadRequestException('Código de redefinição já foi utilizado');
    }
    if (resetCode.expiresAt < new Date()) {
      throw new BadRequestException('Código de redefinição expirado');
    }
    const user = await this.userRepository.findByEmail(resetCode.email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.userRepository.update(user.id, { password: input.password } as any);
    await this.passwordResetCodeRepository.markAsUsed(resetCode.id);
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.userRepository.update(user.id, { password: input.newPassword } as any);
  }

  private async validateSignupData(input: SignupDto): Promise<void> {
    const emailExists = await this.userRepository.findByEmail(input.email);
    if (emailExists) {
      throw new ConflictException('E-mail já está em uso');
    }
    if (input.type === UserType.CLIENTE && !input.phone) {
      throw new BadRequestException('Telefone é obrigatório para tipo cliente');
    }
    if (input.type === UserType.PRESTADOR && !input.cpf) {
      throw new BadRequestException('CPF é obrigatório para tipo prestador');
    }
  }

  private generateToken(userId: string): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  private generateResetCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

