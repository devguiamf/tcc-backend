import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceEntity } from './models/service.entity';
import { ServiceRepository } from './service.repository';
import { StoreModule } from '../store/store.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity]), StoreModule],
  controllers: [ServiceController],
  providers: [ServiceService, ServiceRepository, JwtService],
  exports: [ServiceService, ServiceRepository],
})
export class ServiceModule {}

