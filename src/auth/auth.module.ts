import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { SharedModule } from '../shared/shared.module';
import { PasswordResetCodeEntity } from './models/password-reset-code.entity';
import { PasswordResetCodeRepository } from './repositories/password-reset-code.repository';

@Module({
  imports: [
    UserModule,
    SharedModule,
    TypeOrmModule.forFeature([PasswordResetCodeEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '24h';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'default-secret-key-change-in-production',
          signOptions: {
            expiresIn: expiresIn as number | string,
          },
        } as JwtModuleOptions;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetCodeRepository],
  exports: [AuthService],
})
export class AuthModule {}
