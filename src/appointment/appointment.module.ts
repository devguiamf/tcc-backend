import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentEntity } from './models/appointment.entity';
import { AppointmentRepository } from './appointment.repository';
import { StoreModule } from '../store/store.module';
import { ServiceModule } from '../service/service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentEntity]),
    StoreModule,
    ServiceModule,
    UserModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentRepository],
  exports: [AppointmentService, AppointmentRepository],
})
export class AppointmentModule {}

