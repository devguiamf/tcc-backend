import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { ServiceEntity } from './models/service.entity';
import { ServiceRepository } from './service.repository';
import { StoreModule } from '../store/store.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity]), StoreModule, FileModule],
  controllers: [ServiceController],
  providers: [ServiceService, ServiceRepository],
  exports: [ServiceService, ServiceRepository],
})
export class ServiceModule {}

