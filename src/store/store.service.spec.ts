process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreRepository } from './store.repository';
import { UserRepository } from '../user/user.repository';
import { StoreEntity } from './models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { CreateStoreDto } from './models/dto/create-store.dto';
import { UpdateStoreDto } from './models/dto/update-store.dto';
import { UserType } from '../user/models/types/user.types';
import * as bcrypt from 'bcrypt';

describe('StoreService', () => {
  let service: StoreService;
  let repository: StoreRepository;
  let userRepository: UserRepository;
  let typeOrmRepository: Repository<StoreEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testUser: UserEntity;
  let clienteUser: UserEntity;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [StoreEntity, UserEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([StoreEntity, UserEntity]),
      ],
      providers: [StoreService, StoreRepository, UserRepository],
    }).compile();

    service = module.get<StoreService>(StoreService);
    repository = module.get<StoreRepository>(StoreRepository);
    userRepository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
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

    clienteUser = await userRepository.create({
      name: 'Test Client',
      email: 'client@example.com',
      password: hashedPassword,
      type: UserType.CLIENTE,
      phone: '+5511999999999',
    });
  });

  const createValidWorkingHours = () => {
    return [
      { dayOfWeek: 0, isOpen: false },
      { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      { dayOfWeek: 6, isOpen: false },
    ];
  };

  const createValidLocation = () => {
    return {
      street: 'Rua Teste',
      number: '123',
      complement: 'Apto 45',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      latitude: -23.5505,
      longitude: -46.6333,
    };
  };

  describe('create', () => {
    it('should create a store successfully', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = await service.create(inputDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(inputDto.name);
      expect(result.userId).toBe(inputDto.userId);
      expect(result.workingHours).toEqual(inputDto.workingHours);
      expect(result.location).toEqual(inputDto.location);
      expect(result.imageUrl).toBe(inputDto.imageUrl);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create a store without optional imageUrl', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Store Without Image',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const result = await service.create(inputDto);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeUndefined();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: fakeUserId,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(inputDto)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when user is not PRESTADOR', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: clienteUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow(
        'Only users of type PRESTADOR can have a store',
      );
    });

    it('should throw ConflictException when user already has a store', async () => {
      const inputDto: CreateStoreDto = {
        name: 'First Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await service.create(inputDto);

      const duplicateDto: CreateStoreDto = {
        name: 'Second Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await expect(service.create(duplicateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(duplicateDto)).rejects.toThrow('User already has a store');
    });

    it('should throw BadRequestException when working hours has less than 7 days', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ];

      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow(
        'Working hours must include all 7 days of the week',
      );
    });

    it('should throw BadRequestException when working hours has duplicate days', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ];

      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow(
        'Each day of the week must be unique',
      );
    });

    it('should throw BadRequestException when store is open but missing openTime', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ];

      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow(
        'Open time and close time are required when store is open',
      );
    });

    it('should throw BadRequestException when store is open but missing closeTime', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ];

      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow(
        'Open time and close time are required when store is open',
      );
    });

    it('should allow store closed without openTime and closeTime', async () => {
      const validWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: false },
        { dayOfWeek: 2, isOpen: false },
        { dayOfWeek: 3, isOpen: false },
        { dayOfWeek: 4, isOpen: false },
        { dayOfWeek: 5, isOpen: false },
        { dayOfWeek: 6, isOpen: false },
      ];

      const inputDto: CreateStoreDto = {
        name: 'Closed Store',
        userId: testUser.id,
        workingHours: validWorkingHours,
        location: createValidLocation(),
      };

      const result = await service.create(inputDto);

      expect(result).toBeDefined();
      expect(result.workingHours.every((wh) => wh.isOpen === false)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no stores exist', async () => {
      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return all stores', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = await userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });

      const inputDto1: CreateStoreDto = {
        name: 'Store One',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };
      const inputDto2: CreateStoreDto = {
        name: 'Store Two',
        userId: secondUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await service.create(inputDto1);
      await service.create(inputDto2);

      const result = await service.findAll();

      expect(result.length).toBe(2);
      result.forEach((store) => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('name');
        expect(store).toHaveProperty('userId');
        expect(store).toHaveProperty('workingHours');
        expect(store).toHaveProperty('location');
        expect(store).toHaveProperty('createdAt');
        expect(store).toHaveProperty('updatedAt');
      });
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(fakeId)).rejects.toThrow('Store not found');
    });

    it('should return store by id', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Find Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const result = await service.findById(createdStore.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdStore.id);
      expect(result.name).toBe(inputDto.name);
      expect(result.userId).toBe(inputDto.userId);
    });
  });

  describe('findByUserId', () => {
    it('should throw NotFoundException when user has no store', async () => {
      await expect(service.findByUserId(testUser.id)).rejects.toThrow(NotFoundException);
      await expect(service.findByUserId(testUser.id)).rejects.toThrow(
        'Store not found for this user',
      );
    });

    it('should return store by userId', async () => {
      const inputDto: CreateStoreDto = {
        name: 'User Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await service.create(inputDto);
      const result = await service.findByUserId(testUser.id);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.name).toBe(inputDto.name);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
      };

      await expect(service.update(fakeId, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(fakeId, updateDto)).rejects.toThrow('Store not found');
    });

    it('should update store name', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Original Name',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
      };

      const result = await service.update(createdStore.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.userId).toBe(inputDto.userId);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Original Name',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const newWorkingHours = createValidWorkingHours();
      newWorkingHours[1].openTime = '10:00';
      newWorkingHours[1].closeTime = '19:00';

      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
        workingHours: newWorkingHours,
        imageUrl: 'https://example.com/new-image.jpg',
      };

      const result = await service.update(createdStore.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.workingHours).toEqual(updateDto.workingHours);
      expect(result.imageUrl).toBe(updateDto.imageUrl);
    });

    it('should throw NotFoundException when updating userId to non-existent user', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateStoreDto = {
        userId: fakeUserId,
      };

      await expect(service.update(createdStore.id, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(createdStore.id, updateDto)).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException when updating userId to CLIENTE user', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const updateDto: UpdateStoreDto = {
        userId: clienteUser.id,
      };

      await expect(service.update(createdStore.id, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(createdStore.id, updateDto)).rejects.toThrow(
        'Only users of type PRESTADOR can have a store',
      );
    });

    it('should throw ConflictException when updating userId to user that already has store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = await userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });

      const inputDto1: CreateStoreDto = {
        name: 'First Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };
      const inputDto2: CreateStoreDto = {
        name: 'Second Store',
        userId: secondUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore1 = await service.create(inputDto1);
      await service.create(inputDto2);

      const updateDto: UpdateStoreDto = {
        userId: secondUser.id,
      };

      await expect(service.update(createdStore1.id, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update(createdStore1.id, updateDto)).rejects.toThrow(
        'User already has a store',
      );
    });

    it('should allow updating userId to same user', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
        userId: testUser.id,
      };

      const result = await service.update(createdStore.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.userId).toBe(testUser.id);
    });

    it('should update imageUrl to undefined', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Image Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/old-image.jpg',
      };

      const createdStore = await service.create(inputDto);
      const updateDto: UpdateStoreDto = {
        imageUrl: null,
      };

      const result = await service.update(createdStore.id, updateDto);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.delete(fakeId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(fakeId)).rejects.toThrow('Store not found');
    });

    it('should delete store successfully', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Delete Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await service.create(inputDto);
      await service.delete(createdStore.id);

      await expect(service.findById(createdStore.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToOutput', () => {
    it('should map store entity to output correctly with all fields', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Complete Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = await service.create(inputDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('workingHours');
      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should map imageUrl as undefined when null', async () => {
      const inputDto: CreateStoreDto = {
        name: 'No Image Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const result = await service.create(inputDto);

      expect(result.imageUrl).toBeUndefined();
    });
  });
});

