process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceRepository } from './service.repository';
import { StoreRepository } from '../store/store.repository';
import { UserRepository } from '../user/user.repository';
import { ServiceEntity } from './models/service.entity';
import { StoreEntity } from '../store/models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';
import { UserType } from '../user/models/types/user.types';
import * as bcrypt from 'bcrypt';
import { AppointmentInterval } from '../store/models/types/store.types';

describe('ServiceService', () => {
  let service: ServiceService;
  let repository: ServiceRepository;
  let storeRepository: StoreRepository;
  let userRepository: UserRepository;
  let typeOrmRepository: Repository<ServiceEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testUser: UserEntity;
  let testStore: StoreEntity;
  let otherUser: UserEntity;
  let otherStore: StoreEntity;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ServiceEntity, StoreEntity, UserEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([ServiceEntity, StoreEntity, UserEntity]),
      ],
      providers: [ServiceService, ServiceRepository, StoreRepository, UserRepository],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
    repository = module.get<ServiceRepository>(ServiceRepository);
    storeRepository = module.get<StoreRepository>(StoreRepository);
    userRepository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
    const storeRepo = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    await storeRepo.clear();
    const userRepo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    await userRepo.clear();

    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await userRepository.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '123.456.789-00',
    });

    testStore = await storeRepository.create({
      name: 'Test Store',
      userId: testUser.id,
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

    const hashedPassword2 = await bcrypt.hash('password123', 10);
    otherUser = await userRepository.create({
      name: 'Other Provider',
      email: 'other@example.com',
      password: hashedPassword2,
      type: UserType.PRESTADOR,
      cpf: '987.654.321-00',
    });

    otherStore = await storeRepository.create({
      name: 'Other Store',
      userId: otherUser.id,
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
  });

  describe('create', () => {
    it('should create a service successfully', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = await service.create(inputDto, testUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(inputDto.title);
      expect(result.description).toBe(inputDto.description);
      expect(result.price).toBe(inputDto.price);
      expect(result.durationMinutes).toBe(inputDto.durationMinutes);
      expect(result.imageUrl).toBe(inputDto.imageUrl);
      expect(result.storeId).toBe(testStore.id);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create a service without optional imageUrl', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Service Without Image',
        description: 'This is a service without image description',
        price: 50.0,
        durationMinutes: 30,
      };

      const result = await service.create(inputDto, testUser.id);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeUndefined();
    });

    it('should throw NotFoundException when user has no store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithoutStore = await userRepository.create({
        name: 'No Store Provider',
        email: 'nostore@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '111.222.333-44',
      });

      const inputDto: CreateServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      };

      await expect(service.create(inputDto, userWithoutStore.id)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(inputDto, userWithoutStore.id)).rejects.toThrow(
        'Store not found for this user',
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array when no services exist', async () => {
      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return all services', async () => {
      const inputDto1: CreateServiceDto = {
        title: 'Service One',
        description: 'First service description',
        price: 100.0,
        durationMinutes: 60,
      };
      const inputDto2: CreateServiceDto = {
        title: 'Service Two',
        description: 'Second service description',
        price: 200.0,
        durationMinutes: 90,
      };

      await service.create(inputDto1, testUser.id);
      await service.create(inputDto2, testUser.id);

      const result = await service.findAll();

      expect(result.length).toBe(2);
      result.forEach((service) => {
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('title');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('price');
        expect(service).toHaveProperty('durationMinutes');
        expect(service).toHaveProperty('storeId');
        expect(service).toHaveProperty('createdAt');
        expect(service).toHaveProperty('updatedAt');
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when service does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(fakeId)).rejects.toThrow('Service not found');
    });

    it('should return service by id', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Find Service',
        description: 'Service to be found',
        price: 150.0,
        durationMinutes: 45,
      };

      const createdService = await service.create(inputDto, testUser.id);
      const result = await service.findById(createdService.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdService.id);
      expect(result.title).toBe(inputDto.title);
      expect(result.storeId).toBe(testStore.id);
    });
  });

  describe('findByStoreId', () => {
    it('should return empty array when store has no services', async () => {
      const result = await service.findByStoreId(testStore.id);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return services by storeId', async () => {
      const inputDto1: CreateServiceDto = {
        title: 'Store One Service',
        description: 'Service for first store',
        price: 100.0,
        durationMinutes: 60,
      };
      const inputDto2: CreateServiceDto = {
        title: 'Store Two Service',
        description: 'Service for second store',
        price: 200.0,
        durationMinutes: 90,
      };

      await service.create(inputDto1, testUser.id);
      await service.create(inputDto2, otherUser.id);

      const result = await service.findByStoreId(testStore.id);

      expect(result.length).toBe(1);
      expect(result[0].storeId).toBe(testStore.id);
      expect(result[0].title).toBe(inputDto1.title);
    });
  });

  describe('findByUserId', () => {
    it('should throw NotFoundException when user has no store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithoutStore = await userRepository.create({
        name: 'No Store Provider',
        email: 'nostore2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '555.666.777-88',
      });

      await expect(service.findByUserId(userWithoutStore.id)).rejects.toThrow(NotFoundException);
      await expect(service.findByUserId(userWithoutStore.id)).rejects.toThrow(
        'Store not found for this user',
      );
    });

    it('should return services by userId', async () => {
      const inputDto: CreateServiceDto = {
        title: 'User Service',
        description: 'Service for user',
        price: 100.0,
        durationMinutes: 60,
      };

      await service.create(inputDto, testUser.id);
      const result = await service.findByUserId(testUser.id);

      expect(result.length).toBe(1);
      expect(result[0].storeId).toBe(testStore.id);
      expect(result[0].title).toBe(inputDto.title);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when service does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
      };

      await expect(service.update(fakeId, updateDto, testUser.id)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(fakeId, updateDto, testUser.id)).rejects.toThrow(
        'Service not found',
      );
    });

    it('should throw ForbiddenException when user tries to update service from another store', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Other Store Service',
        description: 'Service from other store',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await service.create(inputDto, otherUser.id);
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
      };

      await expect(service.update(createdService.id, updateDto, testUser.id)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update(createdService.id, updateDto, testUser.id)).rejects.toThrow(
        'You can only update services from your own store',
      );
    });

    it('should update service title', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await service.create(inputDto, testUser.id);
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
      };

      const result = await service.update(createdService.id, updateDto, testUser.id);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(inputDto.description);
      expect(result.price).toBe(inputDto.price);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await service.create(inputDto, testUser.id);
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
        description: 'Updated description',
        price: 150.0,
        durationMinutes: 90,
      };

      const result = await service.update(createdService.id, updateDto, testUser.id);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(result.price).toBe(updateDto.price);
      expect(result.durationMinutes).toBe(updateDto.durationMinutes);
    });

    it('should update imageUrl to undefined', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Image Service',
        description: 'Service with image',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/old-image.jpg',
      };

      const createdService = await service.create(inputDto, testUser.id);
      const updateDto: UpdateServiceDto = {
        imageUrl: null,
      };

      const result = await service.update(createdService.id, updateDto, testUser.id);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when service does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.delete(fakeId, testUser.id)).rejects.toThrow(NotFoundException);
      await expect(service.delete(fakeId, testUser.id)).rejects.toThrow('Service not found');
    });

    it('should throw ForbiddenException when user tries to delete service from another store', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Other Store Service',
        description: 'Service from other store',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await service.create(inputDto, otherUser.id);

      await expect(service.delete(createdService.id, testUser.id)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.delete(createdService.id, testUser.id)).rejects.toThrow(
        'You can only delete services from your own store',
      );
    });

    it('should delete service successfully', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Delete Service',
        description: 'Service to be deleted',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await service.create(inputDto, testUser.id);
      await service.delete(createdService.id, testUser.id);

      await expect(service.findById(createdService.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToOutput', () => {
    it('should map service entity to output correctly with all fields', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Complete Service',
        description: 'Complete service description',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = await service.create(inputDto, testUser.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('durationMinutes');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('storeId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(typeof result.price).toBe('number');
    });

    it('should map imageUrl as undefined when null', async () => {
      const inputDto: CreateServiceDto = {
        title: 'No Image Service',
        description: 'Service without image',
        price: 100.0,
        durationMinutes: 60,
      };

      const result = await service.create(inputDto, testUser.id);

      expect(result.imageUrl).toBeUndefined();
    });
  });
});

