import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentRepository } from './appointment.repository';
import { StoreRepository } from '../store/store.repository';
import { ServiceRepository } from '../service/service.repository';
import { UserRepository } from '../user/user.repository';
import { CreateAppointmentDto } from './models/dto/create-appointment.dto';
import { UpdateAppointmentDto } from './models/dto/update-appointment.dto';
import { AppointmentOutput, AvailableTimeSlot, AppointmentStatus } from './models/types/appointment.types';
import { AppointmentEntity } from './models/appointment.entity';
import { StoreEntity } from '../store/models/store.entity';
import { ServiceEntity } from '../service/models/service.entity';
import { UserType } from '../user/models/types/user.types';
import { WorkingHours } from '../store/models/types/store.types';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly storeRepository: StoreRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async create(input: CreateAppointmentDto, userId: string): Promise<AppointmentOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.type !== UserType.CLIENTE) {
      throw new BadRequestException('Only users of type CLIENTE can create appointments');
    }
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    const service = await this.serviceRepository.findById(input.serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (service.storeId !== store.id) {
      throw new BadRequestException('Service does not belong to the specified store');
    }
    const appointmentDate = new Date(input.appointmentDate);
    await this.validateAppointmentTime(input.storeId, input.serviceId, appointmentDate);
    const appointment = await this.repository.create(input, userId);
    return this.mapToOutput(appointment);
  }

  async findById(id: string, userId: string): Promise<AppointmentOutput> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (appointment.userId !== userId && user.type !== UserType.PRESTADOR) {
      throw new ForbiddenException('You can only view your own appointments');
    }
    if (user.type === UserType.PRESTADOR) {
      const store = await this.storeRepository.findByUserId(userId);
      if (!store || store.id !== appointment.storeId) {
        throw new ForbiddenException('You can only view appointments from your own store');
      }
    }
    return this.mapToOutput(appointment);
  }

  async findByUserId(userId: string): Promise<AppointmentOutput[]> {
    const appointments = await this.repository.findByUserId(userId);
    return appointments.map((appointment) => this.mapToOutput(appointment));
  }

  async findByStoreId(storeId: string, userId: string): Promise<AppointmentOutput[]> {
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.type !== UserType.PRESTADOR || store.userId !== userId) {
      throw new ForbiddenException('You can only view appointments from your own store');
    }
    const appointments = await this.repository.findByStoreId(storeId);
    return appointments.map((appointment) => this.mapToOutput(appointment));
  }

  async findAvailableTimeSlots(
    storeId: string,
    serviceId: string,
    date: string,
  ): Promise<AvailableTimeSlot[]> {
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (service.storeId !== store.id) {
      throw new BadRequestException('Service does not belong to the specified store');
    }
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    const existingAppointments = await this.repository.findByDateRange(storeId, startDate, endDate);
    return await this.calculateAvailableTimeSlots(store, service, targetDate, existingAppointments);
  }

  async update(id: string, input: UpdateAppointmentDto, userId: string): Promise<AppointmentOutput> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.userId !== userId) {
      throw new ForbiddenException('You can only update your own appointments');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled appointment');
    }
    if (input.appointmentDate) {
      const newDate = new Date(input.appointmentDate);
      await this.validateAppointmentTime(
        appointment.storeId,
        appointment.serviceId,
        newDate,
        id,
      );
    }
    const updatedAppointment = await this.repository.update(id, input);
    return this.mapToOutput(updatedAppointment);
  }

  async cancel(id: string, userId: string): Promise<AppointmentOutput> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own appointments');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }
    const updatedAppointment = await this.repository.update(id, {
      status: AppointmentStatus.CANCELLED,
    });
    return this.mapToOutput(updatedAppointment);
  }

  async delete(id: string, userId: string): Promise<void> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own appointments');
    }
    await this.repository.delete(id);
  }

  private async validateAppointmentTime(
    storeId: string,
    serviceId: string,
    appointmentDate: Date,
    excludeId?: string,
  ): Promise<void> {
    if (appointmentDate < new Date()) {
      throw new BadRequestException('Appointment date must be in the future');
    }
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    if (!this.isWithinWorkingHours(store.workingHours, appointmentDate)) {
      throw new BadRequestException('Appointment time is outside store working hours');
    }
    const endTime = new Date(appointmentDate);
    endTime.setMinutes(endTime.getMinutes() + service.durationMinutes);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const existingAppointments = await this.repository.findByDateRange(storeId, startOfDay, endOfDay);
    const hasConflictResult = await this.hasConflict(appointmentDate, endTime, existingAppointments, service, excludeId);
    if (hasConflictResult) {
      throw new ConflictException('Appointment time conflicts with existing appointments');
    }
  }

  private async calculateAvailableTimeSlots(
    store: StoreEntity,
    service: ServiceEntity,
    date: Date,
    existingAppointments: AppointmentEntity[],
  ): Promise<AvailableTimeSlot[]> {
    const dayOfWeek = date.getDay();
    const workingHoursForDay = store.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    if (!workingHoursForDay || !workingHoursForDay.isOpen) {
      return [];
    }
    const availableSlots: AvailableTimeSlot[] = [];
    const [openHour, openMinute] = workingHoursForDay.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = workingHoursForDay.closeTime.split(':').map(Number);
    const openTime = new Date(date);
    openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    let currentTime = new Date(openTime);
    while (currentTime < closeTime) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + service.durationMinutes);
      if (slotEndTime <= closeTime) {
        const hasConflictResult = await this.hasConflict(currentTime, slotEndTime, existingAppointments, service, undefined);
        if (!hasConflictResult) {
          const dateStr = date.toISOString().split('T')[0];
          const startTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
          const endTimeStr = `${String(slotEndTime.getHours()).padStart(2, '0')}:${String(slotEndTime.getMinutes()).padStart(2, '0')}`;
          availableSlots.push({
            startTime: startTimeStr,
            endTime: endTimeStr,
            date: dateStr,
          });
        }
      }
      currentTime.setMinutes(currentTime.getMinutes() + store.appointmentInterval);
    }
    return availableSlots;
  }

  private isWithinWorkingHours(workingHours: WorkingHours[], appointmentDate: Date): boolean {
    const dayOfWeek = appointmentDate.getDay();
    const workingHoursForDay = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    if (!workingHoursForDay || !workingHoursForDay.isOpen) {
      return false;
    }
    const [openHour, openMinute] = workingHoursForDay.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = workingHoursForDay.closeTime.split(':').map(Number);
    const appointmentHour = appointmentDate.getHours();
    const appointmentMinute = appointmentDate.getMinutes();
    const appointmentMinutes = appointmentHour * 60 + appointmentMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;
    return appointmentMinutes >= openMinutes && appointmentMinutes < closeMinutes;
  }

  private async hasConflict(
    startTime: Date,
    endTime: Date,
    existingAppointments: AppointmentEntity[],
    service: ServiceEntity,
    excludeId?: string,
  ): Promise<boolean> {
    for (const appointment of existingAppointments) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        continue;
      }
      if (excludeId && appointment.id === excludeId) {
        continue;
      }
      let appointmentService = appointment.service;
      if (!appointmentService) {
        appointmentService = await this.serviceRepository.findById(appointment.serviceId);
        if (!appointmentService) {
          continue;
        }
      }
      const appointmentEndTime = new Date(appointment.appointmentDate);
      appointmentEndTime.setMinutes(
        appointmentEndTime.getMinutes() + appointmentService.durationMinutes,
      );
      if (
        (startTime >= appointment.appointmentDate && startTime < appointmentEndTime) ||
        (endTime > appointment.appointmentDate && endTime <= appointmentEndTime) ||
        (startTime <= appointment.appointmentDate && endTime >= appointmentEndTime)
      ) {
        return true;
      }
    }
    return false;
  }

  private mapToOutput(appointment: AppointmentEntity): AppointmentOutput {
    return {
      id: appointment.id,
      userId: appointment.userId,
      storeId: appointment.storeId,
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate,
      status: appointment.status,
      notes: appointment.notes || undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}

