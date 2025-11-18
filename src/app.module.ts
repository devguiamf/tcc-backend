import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from './core/core.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { StoreModule } from './store/store.module';
import { ServiceModule } from './service/service.module';
import { AppointmentModule } from './appointment/appointment.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '3306', 10),
        username: configService.get<string>('DB_USERNAME') || 'app_user',
        password: configService.get<string>('DB_PASSWORD') || 'app_password',
        database: configService.get<string>('DB_DATABASE') || 'backend_tcc',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    CoreModule,
    UserModule,
    AuthModule,
    StoreModule,
    ServiceModule,
    AppointmentModule,
    FileModule,
  ],
})
export class AppModule {}

