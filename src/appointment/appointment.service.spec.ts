process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentRepository } from './appointment.repository';
import { StoreRepository } from '../store/store.repository';
import { ServiceRepository } from '../service/service.repository';
import { UserRepository } from '../user/user.repository';
import { AppointmentEntity } from './models/appointment.entity';
import { UserEntity } from '../user/models/user.entity';
import { StoreEntity } from '../store/models/store.entity';
import { ServiceEntity } from '../service/models/service.entity';
import { CreateAppointmentDto } from './models/dto/create-appointment.dto';
import { UpdateAppointmentDto } from './models/dto/update-appointment.dto';
import { AppointmentStatus } from './models/types/appointment.types';
import { UserType } from '../user/models/types/user.types';
import { AppointmentInterval } from '../store/models/types/store.types';
import * as bcrypt from 'bcrypt';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let appointmentRepository: AppointmentRepository;
  let storeRepository: StoreRepository;
  let serviceRepository: ServiceRepository;
  let userRepository: UserRepository;
  let typeOrmRepository: Repository<AppointmentEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testClient: UserEntity;
  let testProvider: UserEntity;
  let testStore: StoreEntity;
  let testService: ServiceEntity;
  let otherStore: StoreEntity;
  let otherService: ServiceEntity;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [AppointmentEntity, UserEntity, StoreEntity, ServiceEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([AppointmentEntity, UserEntity, StoreEntity, ServiceEntity]),
      ],
      providers: [
        AppointmentService,
        AppointmentRepository,
        StoreRepository,
        ServiceRepository,
        UserRepository,
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    appointmentRepository = module.get<AppointmentRepository>(AppointmentRepository);
    storeRepository = module.get<StoreRepository>(StoreRepository);
    serviceRepository = module.get<ServiceRepository>(ServiceRepository);
    userRepository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get<Repository<AppointmentEntity>>(getRepositoryToken(AppointmentEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    const appointmentRepo = module.get<Repository<AppointmentEntity>>(getRepositoryToken(AppointmentEntity));
    await appointmentRepo.clear();
    const serviceRepo = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    await serviceRepo.clear();
    const storeRepo = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    await storeRepo.clear();
    const userRepo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    await userRepo.clear();

    const hashedPassword = await bcrypt.hash('password123', 10);
    testClient = await userRepository.create({
      name: 'Test Client',
      email: 'client@example.com',
      password: hashedPassword,
      type: UserType.CLIENTE,
      cpf: '123.456.789-00',
    });

    testProvider = await userRepository.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '987.654.321-00',
    });

    testStore = await storeRepository.create({
      name: 'Test Store',
      userId: testProvider.id,
      workingHours: [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ],
      location: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    });

    testService = await serviceRepository.create(
      {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      },
      testStore.id,
    );

    const otherProvider = await userRepository.create({
      name: 'Other Provider',
      email: 'other@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '111.222.333-44',
    });

    otherStore = await storeRepository.create({
      name: 'Other Store',
      userId: otherProvider.id,
      workingHours: [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ],
      location: {
        street: 'Rua Outra',
        number: '456',
        neighborhood: 'Vila',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-200',
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    });

    otherService = await serviceRepository.create(
      {
        title: 'Other Service',
        description: 'Other service description',
        price: 200.0,
        durationMinutes: 90,
      },
      otherStore.id,
    );
  });

  describe('create', () => {
    it('should create an appointment successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
        notes: 'Test appointment notes',
      };

      const result = await service.create(inputDto, testClient.id);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testClient.id);
      expect(result.storeId).toBe(inputDto.storeId);
      expect(result.serviceId).toBe(inputDto.serviceId);
      expect(result.notes).toBe(inputDto.notes);
      expect(result.status).toBe(AppointmentStatus.PENDING);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      await expect(service.create(inputDto, fakeUserId)).rejects.toThrow(NotFoundException);
      await expect(service.create(inputDto, fakeUserId)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when user is not CLIENTE', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto, testProvider.id)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto, testProvider.id)).rejects.toThrow(
        'Only users of type CLIENTE can create appointments',
      );
    });

    it('should throw NotFoundException when store does not exist', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: '00000000-0000-0000-0000-000000000000',
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.create(inputDto, testClient.id)).rejects.toThrow('Store not found');
    });

    it('should throw NotFoundException when service does not exist', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: '00000000-0000-0000-0000-000000000000',
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.create(inputDto, testClient.id)).rejects.toThrow('Service not found');
    });

    it('should throw BadRequestException when service does not belong to store', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: otherService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(
        'Service does not belong to the specified store',
      );
    });

    it('should throw BadRequestException when appointment date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: pastDate.toISOString(),
      };

      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(
        'Appointment date must be in the future',
      );
    });

    it('should throw BadRequestException when appointment time is outside working hours', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(20, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto, testClient.id)).rejects.toThrow(
        'Appointment time is outside store working hours',
      );
    });

    it('should throw ConflictException when appointment time conflicts with existing appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await service.create(inputDto1, testClient.id);

      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await expect(service.create(inputDto2, testClient.id)).rejects.toThrow(ConflictException);
      await expect(service.create(inputDto2, testClient.id)).rejects.toThrow(
        'Appointment time conflicts with existing appointments',
      );
    });
  });

  describe('findById', () => {
    it('should return appointment by id for the owner', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const result = await service.findById(createdAppointment.id, testClient.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdAppointment.id);
      expect(result.userId).toBe(testClient.id);
    });

    it('should return appointment by id for provider from their store', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const result = await service.findById(createdAppointment.id, testProvider.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdAppointment.id);
      expect(result.storeId).toBe(testStore.id);
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findById(fakeId, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.findById(fakeId, testClient.id)).rejects.toThrow('Appointment not found');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findById(createdAppointment.id, fakeUserId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(createdAppointment.id, fakeUserId)).rejects.toThrow('User not found');
    });

    it('should throw ForbiddenException when user tries to view another client appointment', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherClient = await userRepository.create({
        name: 'Other Client',
        email: 'otherclient@example.com',
        password: hashedPassword,
        type: UserType.CLIENTE,
        cpf: '555.666.777-88',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);

      await expect(service.findById(createdAppointment.id, otherClient.id)).rejects.toThrow(ForbiddenException);
      await expect(service.findById(createdAppointment.id, otherClient.id)).rejects.toThrow(
        'You can only view your own appointments',
      );
    });

    it('should throw ForbiddenException when provider tries to view appointment from another store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherProvider = await userRepository.create({
        name: 'Other Provider',
        email: 'otherprovider@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '999.888.777-66',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);

      await expect(service.findById(createdAppointment.id, otherProvider.id)).rejects.toThrow(ForbiddenException);
      await expect(service.findById(createdAppointment.id, otherProvider.id)).rejects.toThrow(
        'You can only view appointments from your own store',
      );
    });
  });

  describe('findByUserId', () => {
    it('should return empty array when user has no appointments', async () => {
      const result = await service.findByUserId(testClient.id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return appointments by userId', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 1);
      futureDate1.setHours(10, 0, 0, 0);

      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 2);
      futureDate2.setHours(14, 0, 0, 0);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate1.toISOString(),
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate2.toISOString(),
      };

      await service.create(inputDto1, testClient.id);
      await service.create(inputDto2, testClient.id);

      const result = await service.findByUserId(testClient.id);

      expect(result.length).toBe(2);
      result.forEach((appointment) => {
        expect(appointment.userId).toBe(testClient.id);
        expect(appointment).toHaveProperty('id');
        expect(appointment).toHaveProperty('storeId');
        expect(appointment).toHaveProperty('serviceId');
        expect(appointment).toHaveProperty('appointmentDate');
        expect(appointment).toHaveProperty('status');
      });
    });
  });

  describe('findByStoreId', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeStoreId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findByStoreId(fakeStoreId, testProvider.id)).rejects.toThrow(NotFoundException);
      await expect(service.findByStoreId(fakeStoreId, testProvider.id)).rejects.toThrow('Store not found');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findByStoreId(testStore.id, fakeUserId)).rejects.toThrow(NotFoundException);
      await expect(service.findByStoreId(testStore.id, fakeUserId)).rejects.toThrow('User not found');
    });

    it('should throw ForbiddenException when user is not provider', async () => {
      await expect(service.findByStoreId(testStore.id, testClient.id)).rejects.toThrow(ForbiddenException);
      await expect(service.findByStoreId(testStore.id, testClient.id)).rejects.toThrow(
        'You can only view appointments from your own store',
      );
    });

    it('should throw ForbiddenException when provider tries to view appointments from another store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherProvider = await userRepository.create({
        name: 'Other Provider',
        email: 'otherprovider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '777.888.999-00',
      });

      await expect(service.findByStoreId(testStore.id, otherProvider.id)).rejects.toThrow(ForbiddenException);
      await expect(service.findByStoreId(testStore.id, otherProvider.id)).rejects.toThrow(
        'You can only view appointments from your own store',
      );
    });

    it('should return appointments by storeId for the store owner', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 1);
      futureDate1.setHours(10, 0, 0, 0);

      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 2);
      futureDate2.setHours(14, 0, 0, 0);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate1.toISOString(),
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate2.toISOString(),
      };

      await service.create(inputDto1, testClient.id);
      await service.create(inputDto2, testClient.id);

      const result = await service.findByStoreId(testStore.id, testProvider.id);

      expect(result.length).toBe(2);
      result.forEach((appointment) => {
        expect(appointment.storeId).toBe(testStore.id);
        expect(appointment).toHaveProperty('id');
        expect(appointment).toHaveProperty('userId');
        expect(appointment).toHaveProperty('serviceId');
      });
    });
  });

  describe('findAvailableTimeSlots', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeStoreId = '00000000-0000-0000-0000-000000000000';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        service.findAvailableTimeSlots(fakeStoreId, testService.id, futureDate.toISOString()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findAvailableTimeSlots(fakeStoreId, testService.id, futureDate.toISOString()),
      ).rejects.toThrow('Store not found');
    });

    it('should throw NotFoundException when service does not exist', async () => {
      const fakeServiceId = '00000000-0000-0000-0000-000000000000';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        service.findAvailableTimeSlots(testStore.id, fakeServiceId, futureDate.toISOString()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findAvailableTimeSlots(testStore.id, fakeServiceId, futureDate.toISOString()),
      ).rejects.toThrow('Service not found');
    });

    it('should throw BadRequestException when service does not belong to store', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        service.findAvailableTimeSlots(testStore.id, otherService.id, futureDate.toISOString()),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findAvailableTimeSlots(testStore.id, otherService.id, futureDate.toISOString()),
      ).rejects.toThrow('Service does not belong to the specified store');
    });

    it('should return empty array when store is closed on that day', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()));
      futureDate.setHours(10, 0, 0, 0);

      const result = await service.findAvailableTimeSlots(
        testStore.id,
        testService.id,
        futureDate.toISOString(),
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return available time slots for a working day', async () => {
      const futureDate = new Date();
      const daysUntilMonday = (1 - futureDate.getDay() + 7) % 7 || 7;
      futureDate.setDate(futureDate.getDate() + daysUntilMonday);
      futureDate.setHours(0, 0, 0, 0);

      const result = await service.findAvailableTimeSlots(
        testStore.id,
        testService.id,
        futureDate.toISOString(),
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((slot) => {
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('date');
        expect(slot.date).toBe(futureDate.toISOString().split('T')[0]);
      });
    });

    it('should exclude time slots with conflicts', async () => {
      const futureDate = new Date();
      const daysUntilMonday = (1 - futureDate.getDay() + 7) % 7 || 7;
      futureDate.setDate(futureDate.getDate() + daysUntilMonday);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      await service.create(inputDto, testClient.id);

      const result = await service.findAvailableTimeSlots(
        testStore.id,
        testService.id,
        futureDate.toISOString(),
      );

      const conflictingSlot = result.find((slot) => slot.startTime === '10:00');
      expect(conflictingSlot).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      await expect(service.update(fakeId, updateDto, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.update(fakeId, updateDto, testClient.id)).rejects.toThrow('Appointment not found');
    });

    it('should throw ForbiddenException when user tries to update another user appointment', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherClient = await userRepository.create({
        name: 'Other Client',
        email: 'otherclient2@example.com',
        password: hashedPassword,
        type: UserType.CLIENTE,
        cpf: '444.555.666-77',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      await expect(service.update(createdAppointment.id, updateDto, otherClient.id)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(createdAppointment.id, updateDto, otherClient.id)).rejects.toThrow(
        'You can only update your own appointments',
      );
    });

    it('should throw BadRequestException when trying to update cancelled appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      await service.cancel(createdAppointment.id, testClient.id);

      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      await expect(service.update(createdAppointment.id, updateDto, testClient.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(createdAppointment.id, updateDto, testClient.id)).rejects.toThrow(
        'Cannot update a cancelled appointment',
      );
    });

    it('should update appointment status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      const result = await service.update(createdAppointment.id, updateDto, testClient.id);

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
      expect(result.id).toBe(createdAppointment.id);
    });

    it('should update appointment notes', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
        notes: 'Original notes',
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const updateDto: UpdateAppointmentDto = {
        notes: 'Updated notes',
      };

      const result = await service.update(createdAppointment.id, updateDto, testClient.id);

      expect(result).toBeDefined();
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw BadRequestException when new appointment date is in the past', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const updateDto: UpdateAppointmentDto = {
        appointmentDate: pastDate.toISOString(),
      };

      await expect(service.update(createdAppointment.id, updateDto, testClient.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(createdAppointment.id, updateDto, testClient.id)).rejects.toThrow(
        'Appointment date must be in the future',
      );
    });

    it('should throw ConflictException when new appointment date conflicts with existing appointment', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 1);
      futureDate1.setHours(10, 0, 0, 0);

      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 2);
      futureDate2.setHours(14, 0, 0, 0);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate1.toISOString(),
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate2.toISOString(),
      };

      const createdAppointment1 = await service.create(inputDto1, testClient.id);
      await service.create(inputDto2, testClient.id);

      const updateDto: UpdateAppointmentDto = {
        appointmentDate: futureDate2.toISOString(),
      };

      await expect(service.update(createdAppointment1.id, updateDto, testClient.id)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(createdAppointment1.id, updateDto, testClient.id)).rejects.toThrow(
        'Appointment time conflicts with existing appointments',
      );
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.cancel(fakeId, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.cancel(fakeId, testClient.id)).rejects.toThrow('Appointment not found');
    });

    it('should throw ForbiddenException when user tries to cancel another user appointment', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherClient = await userRepository.create({
        name: 'Other Client',
        email: 'otherclient3@example.com',
        password: hashedPassword,
        type: UserType.CLIENTE,
        cpf: '333.444.555-66',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);

      await expect(service.cancel(createdAppointment.id, otherClient.id)).rejects.toThrow(ForbiddenException);
      await expect(service.cancel(createdAppointment.id, otherClient.id)).rejects.toThrow(
        'You can only cancel your own appointments',
      );
    });

    it('should throw BadRequestException when appointment is already cancelled', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      await service.cancel(createdAppointment.id, testClient.id);

      await expect(service.cancel(createdAppointment.id, testClient.id)).rejects.toThrow(BadRequestException);
      await expect(service.cancel(createdAppointment.id, testClient.id)).rejects.toThrow(
        'Appointment is already cancelled',
      );
    });

    it('should throw BadRequestException when trying to cancel completed appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      await service.update(createdAppointment.id, { status: AppointmentStatus.COMPLETED }, testClient.id);

      await expect(service.cancel(createdAppointment.id, testClient.id)).rejects.toThrow(BadRequestException);
      await expect(service.cancel(createdAppointment.id, testClient.id)).rejects.toThrow(
        'Cannot cancel a completed appointment',
      );
    });

    it('should cancel appointment successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      const result = await service.cancel(createdAppointment.id, testClient.id);

      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(result.id).toBe(createdAppointment.id);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.delete(fakeId, testClient.id)).rejects.toThrow(NotFoundException);
      await expect(service.delete(fakeId, testClient.id)).rejects.toThrow('Appointment not found');
    });

    it('should throw ForbiddenException when user tries to delete another user appointment', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherClient = await userRepository.create({
        name: 'Other Client',
        email: 'otherclient4@example.com',
        password: hashedPassword,
        type: UserType.CLIENTE,
        cpf: '222.333.444-55',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);

      await expect(service.delete(createdAppointment.id, otherClient.id)).rejects.toThrow(ForbiddenException);
      await expect(service.delete(createdAppointment.id, otherClient.id)).rejects.toThrow(
        'You can only delete your own appointments',
      );
    });

    it('should delete appointment successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const createdAppointment = await service.create(inputDto, testClient.id);
      await service.delete(createdAppointment.id, testClient.id);

      await expect(service.findById(createdAppointment.id, testClient.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToOutput', () => {
    it('should map appointment entity to output correctly with all fields', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
        notes: 'Test notes',
      };

      const result = await service.create(inputDto, testClient.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('storeId');
      expect(result).toHaveProperty('serviceId');
      expect(result).toHaveProperty('appointmentDate');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result.notes).toBe('Test notes');
    });

    it('should map notes as undefined when null', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(10, 0, 0, 0);

      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: futureDate.toISOString(),
      };

      const result = await service.create(inputDto, testClient.id);

      expect(result.notes).toBeUndefined();
    });
  });
});

