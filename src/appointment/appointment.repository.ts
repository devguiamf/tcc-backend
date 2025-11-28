import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere, MoreThanOrEqual } from 'typeorm';
import { AppointmentEntity } from './models/appointment.entity';
import { CreateAppointmentDto } from './models/dto/create-appointment.dto';
import { UpdateAppointmentDto } from './models/dto/update-appointment.dto';
import { AppointmentStatus } from './models/types/appointment.types';

@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly repository: Repository<AppointmentEntity>,
  ) {}

  async create(input: CreateAppointmentDto, userId: string): Promise<AppointmentEntity> {
    const appointment = this.repository.create({
      userId,
      storeId: input.storeId,
      serviceId: input.serviceId,
      appointmentDate: new Date(input.appointmentDate),
      notes: input.notes || null,
    });
    return await this.repository.save(appointment);
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'store', 'service'],
    });
  }

  async findByUserId(userId: string): Promise<AppointmentEntity[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['user', 'store', 'service'],
      order: { appointmentDate: 'ASC' },
    });
  }

  async findByStoreId(storeId: string): Promise<AppointmentEntity[]> {
    return await this.repository.find({
      where: { storeId },
      relations: ['user', 'store', 'service'],
      order: { appointmentDate: 'ASC' },
    });
  }

  async findByServiceId(serviceId: string): Promise<AppointmentEntity[]> {
    return await this.repository.find({
      where: { serviceId },
      relations: ['user', 'store', 'service'],
      order: { appointmentDate: 'ASC' },
    });
  }

  async findByDateRange(
    storeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AppointmentEntity[]> {
    return await this.repository.find({
      where: {
        storeId,
        appointmentDate: Between(startDate, endDate),
      },
      relations: ['user', 'store', 'service'],
      order: { appointmentDate: 'ASC' },
    });
  }

  async findByStoreIdWithFilters(
    storeId: string,
    options: {
      date?: string;
      status?: AppointmentStatus;
      includeFuture?: boolean;
    },
  ): Promise<AppointmentEntity[]> {
    const where: FindOptionsWhere<AppointmentEntity> = { storeId };
    if (options.status) {
      where.status = options.status;
    }
    if (options.date) {
      const targetDate = new Date(options.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.appointmentDate = Between(startOfDay, endOfDay);
    } else if (options.includeFuture) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      where.appointmentDate = MoreThanOrEqual(now);
    }
    return await this.repository.find({
      where,
      relations: ['user', 'store', 'service'],
      order: { appointmentDate: 'ASC' },
    });
  }

  async update(id: string, input: UpdateAppointmentDto): Promise<AppointmentEntity> {
    const appointment = await this.repository.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    const updateData: Partial<AppointmentEntity> = {};
    if (input.appointmentDate) {
      updateData.appointmentDate = new Date(input.appointmentDate);
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes || null;
    }
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

