import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseConfigService } from './config/database-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
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
  providers: [DatabaseConfigService, JwtAuthGuard],
  exports: [DatabaseConfigService, JwtAuthGuard, JwtModule],
})
export class CoreModule {}

