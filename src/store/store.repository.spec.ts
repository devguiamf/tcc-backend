process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { StoreRepository } from './store.repository';
import { StoreEntity } from './models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { CreateStoreDto } from './models/dto/create-store.dto';
import { UpdateStoreDto } from './models/dto/update-store.dto';
import { UserType } from '../user/models/types/user.types';
import * as bcrypt from 'bcrypt';

describe('StoreRepository', () => {
  let repository: StoreRepository;
  let typeOrmRepository: Repository<StoreEntity>;
  let userRepository: Repository<UserEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testUser: UserEntity;

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
      providers: [StoreRepository],
    }).compile();

    repository = module.get<StoreRepository>(StoreRepository);
    typeOrmRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
    await userRepository.clear();
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = userRepository.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '123.456.789-00',
    });
    testUser = await userRepository.save(testUser);
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
    it('should create a store with all fields', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/image.jpg',
      };

      const createdStore = await repository.create(inputDto);

      expect(createdStore).toBeDefined();
      expect(createdStore.id).toBeDefined();
      expect(createdStore.name).toBe(inputDto.name);
      expect(createdStore.userId).toBe(inputDto.userId);
      expect(createdStore.workingHours).toEqual(inputDto.workingHours);
      expect(createdStore.location).toEqual(inputDto.location);
      expect(createdStore.imageUrl).toBe(inputDto.imageUrl);
      expect(createdStore.createdAt).toBeDefined();
      expect(createdStore.updatedAt).toBeDefined();
    });

    it('should create a store without optional imageUrl', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Store Without Image',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);

      expect(createdStore).toBeDefined();
      expect(createdStore.id).toBeDefined();
      expect(createdStore.name).toBe(inputDto.name);
      expect(createdStore.imageUrl).toBeNull();
    });

    it('should create a store with minimal location data', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Minimal Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: {
          street: 'Rua Minimal',
          number: '456',
          neighborhood: 'Vila',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
      };

      const createdStore = await repository.create(inputDto);

      expect(createdStore).toBeDefined();
      expect(createdStore.location.complement).toBeUndefined();
      expect(createdStore.location.latitude).toBeUndefined();
      expect(createdStore.location.longitude).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no stores exist', async () => {
      const stores = await repository.findAll();

      expect(stores).toBeDefined();
      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBe(0);
    });

    it('should return all stores with user relation', async () => {
      const inputDto1: CreateStoreDto = {
        name: 'Store One',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });
      const savedSecondUser = await userRepository.save(secondUser);

      const inputDto2: CreateStoreDto = {
        name: 'Store Two',
        userId: savedSecondUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await repository.create(inputDto1);
      await repository.create(inputDto2);

      const stores = await repository.findAll();

      expect(stores.length).toBe(2);
      stores.forEach((store) => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('name');
        expect(store).toHaveProperty('userId');
        expect(store).toHaveProperty('user');
        expect(store.user).toBeDefined();
        expect(store.user.id).toBeDefined();
      });
    });
  });

  describe('findById', () => {
    it('should return null when store does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const store = await repository.findById(fakeId);

      expect(store).toBeNull();
    });

    it('should return store by id with user relation', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Find Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);
      const foundStore = await repository.findById(createdStore.id);

      expect(foundStore).toBeDefined();
      expect(foundStore?.id).toBe(createdStore.id);
      expect(foundStore?.name).toBe(inputDto.name);
      expect(foundStore?.userId).toBe(inputDto.userId);
      expect(foundStore?.user).toBeDefined();
      expect(foundStore?.user.id).toBe(testUser.id);
    });
  });

  describe('findByUserId', () => {
    it('should return null when user has no store', async () => {
      const store = await repository.findByUserId(testUser.id);

      expect(store).toBeNull();
    });

    it('should return store by userId with user relation', async () => {
      const inputDto: CreateStoreDto = {
        name: 'User Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await repository.create(inputDto);
      const foundStore = await repository.findByUserId(testUser.id);

      expect(foundStore).toBeDefined();
      expect(foundStore?.userId).toBe(testUser.id);
      expect(foundStore?.name).toBe(inputDto.name);
      expect(foundStore?.user).toBeDefined();
      expect(foundStore?.user.id).toBe(testUser.id);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when store does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
      };

      await expect(repository.update(fakeId, updateDto)).rejects.toThrow('Store not found');
    });

    it('should update store name', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Original Name',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);
      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
      };

      const updatedStore = await repository.update(createdStore.id, updateDto);

      expect(updatedStore).toBeDefined();
      expect(updatedStore.name).toBe(updateDto.name);
      expect(updatedStore.userId).toBe(inputDto.userId);
      expect(updatedStore.location).toEqual(inputDto.location);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Original Name',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);
      const newWorkingHours = createValidWorkingHours();
      newWorkingHours[1].openTime = '10:00';
      newWorkingHours[1].closeTime = '19:00';

      const updateDto: UpdateStoreDto = {
        name: 'Updated Name',
        workingHours: newWorkingHours,
        imageUrl: 'https://example.com/new-image.jpg',
      };

      const updatedStore = await repository.update(createdStore.id, updateDto);

      expect(updatedStore).toBeDefined();
      expect(updatedStore.name).toBe(updateDto.name);
      expect(updatedStore.workingHours).toEqual(updateDto.workingHours);
      expect(updatedStore.imageUrl).toBe(updateDto.imageUrl);
    });

    it('should update location', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Location Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);
      const newLocation = {
        street: 'Rua Nova',
        number: '789',
        neighborhood: 'Novo Bairro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
      };

      const updateDto: UpdateStoreDto = {
        location: newLocation,
      };

      const updatedStore = await repository.update(createdStore.id, updateDto);

      expect(updatedStore).toBeDefined();
      expect(updatedStore.location.street).toBe(newLocation.street);
      expect(updatedStore.location.city).toBe(newLocation.city);
      expect(updatedStore.location.state).toBe(newLocation.state);
    });

    it('should update imageUrl to null', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Image Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/old-image.jpg',
      };

      const createdStore = await repository.create(inputDto);
      const updateDto: UpdateStoreDto = {
        imageUrl: null,
      };

      const updatedStore = await repository.update(createdStore.id, updateDto);

      expect(updatedStore).toBeDefined();
      expect(updatedStore.imageUrl).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete store', async () => {
      const inputDto: CreateStoreDto = {
        name: 'Delete Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createdStore = await repository.create(inputDto);
      await repository.delete(createdStore.id);

      const foundStore = await repository.findById(createdStore.id);
      expect(foundStore).toBeNull();
    });

    it('should not throw error when deleting non-existent store', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(repository.delete(fakeId)).resolves.not.toThrow();
    });
  });
});

