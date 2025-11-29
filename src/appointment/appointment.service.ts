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
import { AppointmentOutput, AvailableTimeSlot, AppointmentStatus, StoreStatistics } from './models/types/appointment.types';
import { AppointmentEntity } from './models/appointment.entity';
import { StoreEntity } from '../store/models/store.entity';
import { ServiceEntity } from '../service/models/service.entity';
import { UserType } from '../user/models/types/user.types';
import { WorkingHours } from '../store/models/types/store.types';
import { StoreOutput } from '../store/models/types/store.types';
import { ServiceOutput } from '../service/models/types/service.types';
import { UserOutput } from '../user/models/types/user.types';
import { UserEntity } from '../user/models/user.entity';

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
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.CLIENTE) {
      throw new BadRequestException('Apenas usuários do tipo CLIENTE podem criar agendamentos');
    }
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    const service = await this.serviceRepository.findById(input.serviceId);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    if (service.storeId !== store.id) {
      throw new BadRequestException('Serviço não pertence ao estabelecimento especificado');
    }
    const appointmentDate = new Date(input.appointmentDate);
    await this.validateAppointmentTime(input.storeId, input.serviceId, appointmentDate);
    const appointment = await this.repository.create(input, userId);
    return this.mapToOutput(appointment);
  }

  async findById(id: string, userId: string): Promise<AppointmentOutput> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (appointment.userId !== userId && user.type !== UserType.PRESTADOR) {
      throw new ForbiddenException('Você só pode visualizar seus próprios agendamentos');
    }
    if (user.type === UserType.PRESTADOR) {
      const store = await this.storeRepository.findByUserId(userId);
      if (!store || store.id !== appointment.storeId) {
        throw new ForbiddenException('Você só pode visualizar agendamentos da sua própria loja');
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
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR || store.userId !== userId) {
      throw new ForbiddenException('Você só pode visualizar agendamentos da sua própria loja');
    }
    const appointments = await this.repository.findByStoreId(storeId);
    return appointments.map((appointment) => this.mapToOutput(appointment));
  }

  async findByStoreIdWithFilters(
    storeId: string,
    userId: string,
    options: {
      date?: string;
      status?: AppointmentStatus;
      includeFuture?: boolean;
    },
  ): Promise<AppointmentOutput[]> {
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR || store.userId !== userId) {
      throw new ForbiddenException('Você só pode visualizar agendamentos da sua própria loja');
    }
    const appointments = await this.repository.findByStoreIdWithFilters(storeId, options);
    return appointments.map((appointment) => this.mapToOutput(appointment));
  }

  async findMyStoreAppointments(
    userId: string,
    options: {
      date?: string;
      status?: AppointmentStatus;
      includeFuture?: boolean;
    },
  ): Promise<AppointmentOutput[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new ForbiddenException('Apenas prestadores podem acessar agendamentos da loja');
    }
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Você não possui uma loja cadastrada');
    }
    const appointments = await this.repository.findByStoreIdWithFilters(store.id, options);
    return appointments.map((appointment) => this.mapToOutput(appointment));
  }

  async getMyStoreStatistics(userId: string): Promise<StoreStatistics> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new ForbiddenException('Apenas prestadores podem acessar estatísticas da loja');
    }
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Você não possui uma loja cadastrada');
    }
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    const todayAppointments = await this.repository.findTodayAppointmentsByStore(store.id);
    const todayConfirmedAppointments = await this.repository.findConfirmedByStoreAndDateRange(
      store.id,
      startOfToday,
      endOfToday,
    );
    const weekConfirmedAppointments = await this.repository.findConfirmedByStoreAndDateRange(
      store.id,
      startOfWeek,
      endOfToday,
    );
    const monthlyClients = await this.repository.countUniqueClientsByStoreAndDateRange(
      store.id,
      startOfMonth,
      endOfMonth,
    );
    const todayRevenue = todayConfirmedAppointments.reduce((sum, apt) => {
      return sum + (apt.service ? Number(apt.service.price) : 0);
    }, 0);
    const weekRevenue = weekConfirmedAppointments.reduce((sum, apt) => {
      return sum + (apt.service ? Number(apt.service.price) : 0);
    }, 0);
    const todayTotal = todayAppointments.length;
    const todayPending = todayAppointments.filter((a) => a.status === AppointmentStatus.PENDING).length;
    const todayConfirmed = todayAppointments.filter((a) => a.status === AppointmentStatus.CONFIRMED).length;
    const todayCancelled = todayAppointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const confirmationRate = todayTotal > 0 ? Math.round((todayConfirmed / todayTotal) * 100) : 0;
    return {
      todayRevenue,
      weekRevenue,
      monthlyClients,
      todayTotal,
      todayPending,
      todayConfirmed,
      todayCancelled,
      confirmationRate,
    };
  }

  async findAvailableTimeSlots(
    storeId: string,
    serviceId: string,
    date: string,
  ): Promise<AvailableTimeSlot[]> {
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    if (service.storeId !== store.id) {
      throw new BadRequestException('Serviço não pertence ao estabelecimento especificado');
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
      throw new NotFoundException('Agendamento não encontrado');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const isOwner = appointment.userId === userId;
    const isStoreOwnerResult = await this.isStoreOwner(userId, appointment.storeId);
    console.log('[UPDATE] userId:', userId, 'userType:', user.type, 'appointmentUserId:', appointment.userId, 'storeId:', appointment.storeId, 'isOwner:', isOwner, 'isStoreOwner:', isStoreOwnerResult);
    if (!isOwner && !isStoreOwnerResult) {
      throw new ForbiddenException('Você não tem permissão para atualizar este agendamento');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Não é possível atualizar um agendamento cancelado');
    }
    if (input.appointmentDate && !isStoreOwnerResult) {
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
      throw new NotFoundException('Agendamento não encontrado');
    }
    const isOwner = appointment.userId === userId;
    const isStoreOwnerResult = await this.isStoreOwner(userId, appointment.storeId);
    console.log('[CANCEL] userId:', userId, 'appointmentUserId:', appointment.userId, 'storeId:', appointment.storeId, 'isOwner:', isOwner, 'isStoreOwner:', isStoreOwnerResult);
    if (!isOwner && !isStoreOwnerResult) {
      throw new ForbiddenException('Você não tem permissão para cancelar este agendamento');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Agendamento já está cancelado');
    }
    if (appointment.status === AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Não é possível cancelar um agendamento confirmado');
    }
    const updatedAppointment = await this.repository.update(id, {
      status: AppointmentStatus.CANCELLED,
    });
    return this.mapToOutput(updatedAppointment);
  }

  private async isStoreOwner(userId: string, storeId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.type !== UserType.PRESTADOR) {
      console.log('[isStoreOwner] User not found or not PRESTADOR. userId:', userId, 'userType:', user?.type);
      return false;
    }
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      console.log('[isStoreOwner] Store not found. storeId:', storeId);
      return false;
    }
    console.log('[isStoreOwner] Checking ownership. storeUserId:', store.userId, 'currentUserId:', userId, 'match:', store.userId === userId);
    return store.userId === userId;
  }

  async delete(id: string, userId: string): Promise<void> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    if (appointment.userId !== userId) {
      throw new ForbiddenException('Você só pode excluir seus próprios agendamentos');
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
      throw new BadRequestException('A data do agendamento deve ser no futuro');
    }
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    if (!this.isWithinWorkingHours(store.workingHours, appointmentDate)) {
      throw new BadRequestException('Horário do agendamento está fora do horário de funcionamento do estabelecimento');
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
      throw new ConflictException('Horário do agendamento conflita com agendamentos existentes');
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
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const openTime = new Date(normalizedDate);
    openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date(normalizedDate);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    let currentTime = new Date(openTime);
    while (currentTime < closeTime) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + service.durationMinutes);
      if (slotEndTime <= closeTime) {
        const normalizedCurrentTime = new Date(currentTime);
        normalizedCurrentTime.setSeconds(0, 0);
        const normalizedSlotEndTime = new Date(slotEndTime);
        normalizedSlotEndTime.setSeconds(0, 0);
        const hasConflictResult = await this.hasConflict(normalizedCurrentTime, normalizedSlotEndTime, existingAppointments, service, undefined);
        if (!hasConflictResult) {
          const dateStr = normalizedDate.toISOString().split('T')[0];
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
    const normalizedStartTime = new Date(startTime);
    normalizedStartTime.setSeconds(0, 0);
    const normalizedEndTime = new Date(endTime);
    normalizedEndTime.setSeconds(0, 0);

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
      const appointmentStartTime = new Date(appointment.appointmentDate);
      appointmentStartTime.setSeconds(0, 0);
      const appointmentEndTime = new Date(appointment.appointmentDate);
      appointmentEndTime.setSeconds(0, 0);
      appointmentEndTime.setMinutes(
        appointmentEndTime.getMinutes() + appointmentService.durationMinutes,
      );
      if (
        (normalizedStartTime < appointmentEndTime && normalizedEndTime > appointmentStartTime)
      ) {
        return true;
      }
    }
    return false;
  }

  private mapToOutput(appointment: AppointmentEntity): AppointmentOutput {
    const output: AppointmentOutput = {
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
    if (appointment.store) {
      output.store = this.mapStoreToOutput(appointment.store);
    }
    if (appointment.service) {
      output.service = this.mapServiceToOutput(appointment.service);
    }
    if (appointment.user) {
      output.user = this.mapUserToOutput(appointment.user);
    }
    return output;
  }

  private mapStoreToOutput(store: StoreEntity): StoreOutput {
    return {
      id: store.id,
      name: store.name,
      userId: store.userId,
      workingHours: store.workingHours,
      location: store.location,
      appointmentInterval: store.appointmentInterval,
      imageUrl: store.imageUrl || undefined,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private mapServiceToOutput(service: ServiceEntity): ServiceOutput {
    return {
      id: service.id,
      title: service.title,
      description: service.description,
      price: Number(service.price),
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl || undefined,
      storeId: service.storeId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  private mapUserToOutput(user: UserEntity): UserOutput {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      cpf: user.cpf || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

