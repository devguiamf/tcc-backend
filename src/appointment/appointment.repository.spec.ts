process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { AppointmentRepository } from './appointment.repository';
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

describe('AppointmentRepository', () => {
  let repository: AppointmentRepository;
  let typeOrmRepository: Repository<AppointmentEntity>;
  let userRepository: Repository<UserEntity>;
  let storeRepository: Repository<StoreEntity>;
  let serviceRepository: Repository<ServiceEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testUser: UserEntity;
  let testStore: StoreEntity;
  let testService: ServiceEntity;

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
      providers: [AppointmentRepository],
    }).compile();

    repository = module.get<AppointmentRepository>(AppointmentRepository);
    typeOrmRepository = module.get<Repository<AppointmentEntity>>(getRepositoryToken(AppointmentEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    storeRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    serviceRepository = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
    await serviceRepository.clear();
    await storeRepository.clear();
    await userRepository.clear();

    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = userRepository.create({
      name: 'Test Client',
      email: 'client@example.com',
      password: hashedPassword,
      type: UserType.CLIENTE,
      cpf: '123.456.789-00',
    });
    testUser = await userRepository.save(testUser);

    const providerUser = userRepository.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '987.654.321-00',
    });
    const savedProvider = await userRepository.save(providerUser);

    testStore = storeRepository.create({
      name: 'Test Store',
      userId: savedProvider.id,
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
    testStore = await storeRepository.save(testStore);

    testService = serviceRepository.create({
      title: 'Test Service',
      description: 'This is a test service description',
      price: 100.0,
      durationMinutes: 60,
      storeId: testStore.id,
    });
    testService = await serviceRepository.save(testService);
  });

  describe('create', () => {
    it('should create an appointment with all fields', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Test appointment notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);

      expect(createdAppointment).toBeDefined();
      expect(createdAppointment.id).toBeDefined();
      expect(createdAppointment.userId).toBe(testUser.id);
      expect(createdAppointment.storeId).toBe(inputDto.storeId);
      expect(createdAppointment.serviceId).toBe(inputDto.serviceId);
      expect(createdAppointment.appointmentDate).toBeInstanceOf(Date);
      expect(createdAppointment.notes).toBe(inputDto.notes);
      expect(createdAppointment.status).toBe(AppointmentStatus.PENDING);
      expect(createdAppointment.createdAt).toBeDefined();
      expect(createdAppointment.updatedAt).toBeDefined();
    });

    it('should create an appointment without optional notes', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T14:00:00Z',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);

      expect(createdAppointment).toBeDefined();
      expect(createdAppointment.id).toBeDefined();
      expect(createdAppointment.notes).toBeNull();
      expect(createdAppointment.userId).toBe(testUser.id);
      expect(createdAppointment.storeId).toBe(inputDto.storeId);
      expect(createdAppointment.serviceId).toBe(inputDto.serviceId);
    });

    it('should create an appointment with null notes when notes is empty string', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T15:00:00Z',
        notes: '',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);

      expect(createdAppointment).toBeDefined();
      expect(createdAppointment.notes).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return null when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const appointment = await repository.findById(fakeId);

      expect(appointment).toBeNull();
    });

    it('should return appointment by id with all relations', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Find appointment notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const foundAppointment = await repository.findById(createdAppointment.id);

      expect(foundAppointment).toBeDefined();
      expect(foundAppointment?.id).toBe(createdAppointment.id);
      expect(foundAppointment?.userId).toBe(testUser.id);
      expect(foundAppointment?.storeId).toBe(testStore.id);
      expect(foundAppointment?.serviceId).toBe(testService.id);
      expect(foundAppointment?.user).toBeDefined();
      expect(foundAppointment?.user.id).toBe(testUser.id);
      expect(foundAppointment?.store).toBeDefined();
      expect(foundAppointment?.store.id).toBe(testStore.id);
      expect(foundAppointment?.service).toBeDefined();
      expect(foundAppointment?.service.id).toBe(testService.id);
    });
  });

  describe('findByUserId', () => {
    it('should return empty array when user has no appointments', async () => {
      const appointments = await repository.findByUserId(testUser.id);

      expect(appointments).toBeDefined();
      expect(Array.isArray(appointments)).toBe(true);
      expect(appointments.length).toBe(0);
    });

    it('should return appointments by userId with all relations', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'First appointment',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-26T14:00:00Z',
        notes: 'Second appointment',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const appointments = await repository.findByUserId(testUser.id);

      expect(appointments.length).toBe(2);
      appointments.forEach((appointment) => {
        expect(appointment.userId).toBe(testUser.id);
        expect(appointment.user).toBeDefined();
        expect(appointment.user.id).toBe(testUser.id);
        expect(appointment.store).toBeDefined();
        expect(appointment.service).toBeDefined();
      });
      expect(appointments[0].appointmentDate.getTime()).toBeLessThan(appointments[1].appointmentDate.getTime());
    });

    it('should return appointments ordered by appointmentDate ASC', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-27T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };
      const inputDto3: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-26T10:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);
      await repository.create(inputDto3, testUser.id);

      const appointments = await repository.findByUserId(testUser.id);

      expect(appointments.length).toBe(3);
      expect(appointments[0].appointmentDate.getTime()).toBeLessThan(appointments[1].appointmentDate.getTime());
      expect(appointments[1].appointmentDate.getTime()).toBeLessThan(appointments[2].appointmentDate.getTime());
    });
  });

  describe('findByStoreId', () => {
    it('should return empty array when store has no appointments', async () => {
      const appointments = await repository.findByStoreId(testStore.id);

      expect(appointments).toBeDefined();
      expect(Array.isArray(appointments)).toBe(true);
      expect(appointments.length).toBe(0);
    });

    it('should return appointments by storeId with all relations', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-26T14:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const appointments = await repository.findByStoreId(testStore.id);

      expect(appointments.length).toBe(2);
      appointments.forEach((appointment) => {
        expect(appointment.storeId).toBe(testStore.id);
        expect(appointment.store).toBeDefined();
        expect(appointment.store.id).toBe(testStore.id);
        expect(appointment.user).toBeDefined();
        expect(appointment.service).toBeDefined();
      });
    });

    it('should return only appointments for the specified store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondProvider = userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '111.222.333-44',
      });
      const savedSecondProvider = await userRepository.save(secondProvider);

      const secondStore = storeRepository.create({
        name: 'Second Store',
        userId: savedSecondProvider.id,
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
          street: 'Rua Teste 2',
          number: '456',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-200',
        },
        appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
      });
      const savedSecondStore = await storeRepository.save(secondStore);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: savedSecondStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-26T14:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const appointments = await repository.findByStoreId(testStore.id);

      expect(appointments.length).toBe(1);
      expect(appointments[0].storeId).toBe(testStore.id);
    });
  });

  describe('findByServiceId', () => {
    it('should return empty array when service has no appointments', async () => {
      const appointments = await repository.findByServiceId(testService.id);

      expect(appointments).toBeDefined();
      expect(Array.isArray(appointments)).toBe(true);
      expect(appointments.length).toBe(0);
    });

    it('should return appointments by serviceId with all relations', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-26T14:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const appointments = await repository.findByServiceId(testService.id);

      expect(appointments.length).toBe(2);
      appointments.forEach((appointment) => {
        expect(appointment.serviceId).toBe(testService.id);
        expect(appointment.service).toBeDefined();
        expect(appointment.service.id).toBe(testService.id);
        expect(appointment.user).toBeDefined();
        expect(appointment.store).toBeDefined();
      });
    });

    it('should return only appointments for the specified service', async () => {
      const secondService = serviceRepository.create({
        title: 'Second Service',
        description: 'Second service description',
        price: 200.0,
        durationMinutes: 90,
        storeId: testStore.id,
      });
      const savedSecondService = await serviceRepository.save(secondService);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: savedSecondService.id,
        appointmentDate: '2024-12-26T14:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const appointments = await repository.findByServiceId(testService.id);

      expect(appointments.length).toBe(1);
      expect(appointments[0].serviceId).toBe(testService.id);
    });
  });

  describe('findByDateRange', () => {
    it('should return empty array when no appointments exist in date range', async () => {
      const startDate = new Date('2024-12-01T00:00:00Z');
      const endDate = new Date('2024-12-10T23:59:59Z');

      const appointments = await repository.findByDateRange(testStore.id, startDate, endDate);

      expect(appointments).toBeDefined();
      expect(Array.isArray(appointments)).toBe(true);
      expect(appointments.length).toBe(0);
    });

    it('should return appointments within date range', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-15T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-20T14:00:00Z',
      };
      const inputDto3: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T16:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);
      await repository.create(inputDto3, testUser.id);

      const startDate = new Date('2024-12-15T00:00:00Z');
      const endDate = new Date('2024-12-20T23:59:59Z');

      const appointments = await repository.findByDateRange(testStore.id, startDate, endDate);

      expect(appointments.length).toBe(2);
      appointments.forEach((appointment) => {
        expect(appointment.appointmentDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(appointment.appointmentDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        expect(appointment.storeId).toBe(testStore.id);
        expect(appointment.user).toBeDefined();
        expect(appointment.store).toBeDefined();
        expect(appointment.service).toBeDefined();
      });
    });

    it('should return appointments ordered by appointmentDate ASC', async () => {
      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-18T14:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-16T10:00:00Z',
      };
      const inputDto3: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-17T12:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);
      await repository.create(inputDto3, testUser.id);

      const startDate = new Date('2024-12-15T00:00:00Z');
      const endDate = new Date('2024-12-20T23:59:59Z');

      const appointments = await repository.findByDateRange(testStore.id, startDate, endDate);

      expect(appointments.length).toBe(3);
      expect(appointments[0].appointmentDate.getTime()).toBeLessThan(appointments[1].appointmentDate.getTime());
      expect(appointments[1].appointmentDate.getTime()).toBeLessThan(appointments[2].appointmentDate.getTime());
    });

    it('should return only appointments for the specified store in date range', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondProvider = userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '111.222.333-44',
      });
      const savedSecondProvider = await userRepository.save(secondProvider);

      const secondStore = storeRepository.create({
        name: 'Second Store',
        userId: savedSecondProvider.id,
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
          street: 'Rua Teste 2',
          number: '456',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-200',
        },
        appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
      });
      const savedSecondStore = await storeRepository.save(secondStore);

      const inputDto1: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-15T10:00:00Z',
      };
      const inputDto2: CreateAppointmentDto = {
        storeId: savedSecondStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-16T14:00:00Z',
      };

      await repository.create(inputDto1, testUser.id);
      await repository.create(inputDto2, testUser.id);

      const startDate = new Date('2024-12-15T00:00:00Z');
      const endDate = new Date('2024-12-20T23:59:59Z');

      const appointments = await repository.findByDateRange(testStore.id, startDate, endDate);

      expect(appointments.length).toBe(1);
      expect(appointments[0].storeId).toBe(testStore.id);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when appointment does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      await expect(repository.update(fakeId, updateDto)).rejects.toThrow('Appointment not found');
    });

    it('should update appointment status', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Original notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.status).toBe(AppointmentStatus.CONFIRMED);
      expect(updatedAppointment.appointmentDate).toEqual(createdAppointment.appointmentDate);
      expect(updatedAppointment.notes).toBe(inputDto.notes);
    });

    it('should update appointment date', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        appointmentDate: '2024-12-26T14:00:00Z',
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.appointmentDate).toBeInstanceOf(Date);
      expect(updatedAppointment.appointmentDate.getTime()).toBe(new Date(updateDto.appointmentDate!).getTime());
      expect(updatedAppointment.status).toBe(createdAppointment.status);
    });

    it('should update appointment notes', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Original notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        notes: 'Updated notes',
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.notes).toBe(updateDto.notes);
      expect(updatedAppointment.appointmentDate).toEqual(createdAppointment.appointmentDate);
      expect(updatedAppointment.status).toBe(createdAppointment.status);
    });

    it('should update notes to null when notes is empty string', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Original notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        notes: '',
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.notes).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Original notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        appointmentDate: '2024-12-27T15:00:00Z',
        status: AppointmentStatus.COMPLETED,
        notes: 'Updated notes',
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.appointmentDate.getTime()).toBe(new Date(updateDto.appointmentDate!).getTime());
      expect(updatedAppointment.status).toBe(AppointmentStatus.COMPLETED);
      expect(updatedAppointment.notes).toBe(updateDto.notes);
    });

    it('should not update fields that are not provided', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Original notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CANCELLED,
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.status).toBe(AppointmentStatus.CANCELLED);
      expect(updatedAppointment.appointmentDate).toEqual(createdAppointment.appointmentDate);
      expect(updatedAppointment.notes).toBe(inputDto.notes);
    });

    it('should return appointment with all relations after update', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      const updateDto: UpdateAppointmentDto = {
        status: AppointmentStatus.CONFIRMED,
      };

      const updatedAppointment = await repository.update(createdAppointment.id, updateDto);

      expect(updatedAppointment).toBeDefined();
      expect(updatedAppointment.user).toBeDefined();
      expect(updatedAppointment.user.id).toBe(testUser.id);
      expect(updatedAppointment.store).toBeDefined();
      expect(updatedAppointment.store.id).toBe(testStore.id);
      expect(updatedAppointment.service).toBeDefined();
      expect(updatedAppointment.service.id).toBe(testService.id);
    });
  });

  describe('delete', () => {
    it('should delete appointment', async () => {
      const inputDto: CreateAppointmentDto = {
        storeId: testStore.id,
        serviceId: testService.id,
        appointmentDate: '2024-12-25T10:00:00Z',
        notes: 'Delete appointment notes',
      };

      const createdAppointment = await repository.create(inputDto, testUser.id);
      await repository.delete(createdAppointment.id);

      const foundAppointment = await repository.findById(createdAppointment.id);
      expect(foundAppointment).toBeNull();
    });

    it('should not throw error when deleting non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(repository.delete(fakeId)).resolves.not.toThrow();
    });
  });
});

