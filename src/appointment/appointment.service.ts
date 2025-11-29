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

/** Converte horário "HH:mm" para minutos desde meia-noite */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Formata minutos para string "HH:mm" */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Formata data para string "YYYY-MM-DD" */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Cria uma data local a partir de string "YYYY-MM-DD" */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** Verifica se dois intervalos de tempo se sobrepõem */
function intervalsOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && end1 > start2;
}

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

  /**
   * Busca horários disponíveis para agendamento.
   * 
   * Regras:
   * 1. Respeita o horário de funcionamento da loja no dia
   * 2. Usa o intervalo de agendamento definido na loja
   * 3. Considera a duração do serviço
   * 4. Exclui horários já ocupados por outros agendamentos
   * 5. Para o dia atual, exclui horários que já passaram
   */
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
    const targetDate = parseDate(date);
    const workingHours = this.getWorkingHoursForDay(store.workingHours, targetDate.getDay());
    if (!workingHours) {
      return [];
    }
    const existingAppointments = await this.findAppointmentsForSlotCalculation(storeId, targetDate, workingHours);
    const occupiedSlots = this.buildOccupiedSlots(existingAppointments, targetDate);
    return this.generateAvailableSlots({
      date: targetDate,
      workingHours,
      serviceDuration: service.durationMinutes,
      interval: store.appointmentInterval,
      occupiedSlots,
    });
  }

  /** Retorna o horário de funcionamento para um dia da semana, ou null se fechado */
  private getWorkingHoursForDay(workingHours: WorkingHours[], dayOfWeek: number): WorkingHours | null {
    const hours = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    return hours?.isOpen ? hours : null;
  }

  /** Busca agendamentos que podem conflitar com o dia solicitado */
  private async findAppointmentsForSlotCalculation(
    storeId: string,
    date: Date,
    workingHours: WorkingHours,
  ): Promise<AppointmentEntity[]> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    // Se horário atravessa meia-noite, estender busca para o próximo dia
    const openMinutes = timeToMinutes(workingHours.openTime);
    const closeMinutes = timeToMinutes(workingHours.closeTime);
    if (closeMinutes <= openMinutes) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0);
    }
    return this.repository.findByDateRange(storeId, startDate, endDate);
  }

  /** Converte agendamentos existentes em intervalos ocupados (em minutos desde meia-noite) */
  private buildOccupiedSlots(
    appointments: AppointmentEntity[],
    targetDate: Date,
  ): Array<{ start: number; end: number }> {
    const targetDateStr = formatDate(targetDate);
    return appointments
      .filter((apt) => apt.status !== AppointmentStatus.CANCELLED && apt.service)
      .map((apt) => {
        const aptDate = new Date(apt.appointmentDate);
        const aptDateStr = formatDate(aptDate);
        const startMinutes = aptDate.getHours() * 60 + aptDate.getMinutes();
        const endMinutes = startMinutes + apt.service.durationMinutes;
        // Se o agendamento é do dia seguinte (atravessou meia-noite), adiciona 24h
        const dayOffset = aptDateStr !== targetDateStr ? 24 * 60 : 0;
        return {
          start: startMinutes + dayOffset,
          end: endMinutes + dayOffset,
        };
      });
  }

  /** Gera lista de horários disponíveis */
  private generateAvailableSlots(params: {
    date: Date;
    workingHours: WorkingHours;
    serviceDuration: number;
    interval: number;
    occupiedSlots: Array<{ start: number; end: number }>;
  }): AvailableTimeSlot[] {
    const { date, workingHours, serviceDuration, interval, occupiedSlots } = params;
    const openMinutes = timeToMinutes(workingHours.openTime);
    let closeMinutes = timeToMinutes(workingHours.closeTime);
    // Se atravessa meia-noite, closeMinutes > 24h
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60;
    }
    const minSlotStart = this.calculateMinSlotStart(date, openMinutes, interval);
    const slots: AvailableTimeSlot[] = [];
    for (let slotStart = minSlotStart; slotStart + serviceDuration <= closeMinutes; slotStart += interval) {
      const slotEnd = slotStart + serviceDuration;
      const hasConflict = occupiedSlots.some((occupied) =>
        intervalsOverlap(slotStart, slotEnd, occupied.start, occupied.end)
      );
      if (!hasConflict) {
        // Calcula a data real do slot (pode ser dia seguinte se passou de meia-noite)
        const slotDate = new Date(date);
        if (slotStart >= 24 * 60) {
          slotDate.setDate(slotDate.getDate() + 1);
        }
        slots.push({
          date: formatDate(slotDate),
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd),
        });
      }
    }
    return slots;
  }

  /** Calcula o horário mínimo para slots (para hoje, pula horários passados) */
  private calculateMinSlotStart(date: Date, openMinutes: number, interval: number): number {
    const now = new Date();
    const isToday = formatDate(date) === formatDate(now);
    if (!isToday) {
      return openMinutes;
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Arredonda para o próximo slot disponível
    const nextSlot = Math.ceil((currentMinutes + interval) / interval) * interval;
    return Math.max(openMinutes, nextSlot);
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
      return false;
    }
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      return false;
    }
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

  /** Valida se um horário de agendamento é válido */
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
    const hasConflict = await this.checkAppointmentConflict(
      storeId,
      appointmentDate,
      service.durationMinutes,
      excludeId,
    );
    if (hasConflict) {
      throw new ConflictException('Horário do agendamento conflita com agendamentos existentes');
    }
  }

  /** Verifica se um horário está dentro do expediente da loja */
  private isWithinWorkingHours(workingHours: WorkingHours[], appointmentDate: Date): boolean {
    const dayOfWeek = appointmentDate.getDay();
    const appointmentMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
    // Verifica horário de funcionamento do dia atual
    const todayHours = workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
    if (todayHours?.isOpen) {
      const open = timeToMinutes(todayHours.openTime);
      const close = timeToMinutes(todayHours.closeTime);
      const crossesMidnight = close <= open;
      if (crossesMidnight) {
        // Ex: 09:00 - 02:00 → válido se >= 09:00
        if (appointmentMinutes >= open) return true;
      } else {
        // Horário normal → válido se dentro do intervalo
        if (appointmentMinutes >= open && appointmentMinutes < close) return true;
      }
    }
    // Verifica se está no período pós-meia-noite do dia anterior
    const previousDay = (dayOfWeek + 6) % 7;
    const prevHours = workingHours.find((wh) => wh.dayOfWeek === previousDay);
    if (prevHours?.isOpen) {
      const prevOpen = timeToMinutes(prevHours.openTime);
      const prevClose = timeToMinutes(prevHours.closeTime);
      // Se dia anterior atravessa meia-noite e estamos antes do fechamento
      if (prevClose <= prevOpen && appointmentMinutes < prevClose) return true;
    }
    return false;
  }

  /** Verifica se há conflito com agendamentos existentes */
  private async checkAppointmentConflict(
    storeId: string,
    appointmentDate: Date,
    durationMinutes: number,
    excludeId?: string,
  ): Promise<boolean> {
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const appointments = await this.repository.findByDateRange(storeId, startOfDay, endOfDay);
    const newStart = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
    const newEnd = newStart + durationMinutes;
    for (const apt of appointments) {
      if (apt.status === AppointmentStatus.CANCELLED) continue;
      if (excludeId && apt.id === excludeId) continue;
      if (!apt.service) continue;
      const aptDate = new Date(apt.appointmentDate);
      const aptStart = aptDate.getHours() * 60 + aptDate.getMinutes();
      const aptEnd = aptStart + apt.service.durationMinutes;
      if (intervalsOverlap(newStart, newEnd, aptStart, aptEnd)) {
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

