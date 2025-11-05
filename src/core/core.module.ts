import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfigService } from './config/database-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Global()
@Module({
  imports: [JwtModule, ConfigModule],
  providers: [DatabaseConfigService, JwtAuthGuard],
  exports: [DatabaseConfigService, JwtAuthGuard],
})
export class CoreModule {}

