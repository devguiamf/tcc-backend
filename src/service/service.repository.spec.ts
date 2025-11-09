process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { ServiceRepository } from './service.repository';
import { ServiceEntity } from './models/service.entity';
import { StoreEntity } from '../store/models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';
import { UserType } from '../user/models/types/user.types';
import * as bcrypt from 'bcrypt';

describe('ServiceRepository', () => {
  let repository: ServiceRepository;
  let typeOrmRepository: Repository<ServiceEntity>;
  let storeRepository: Repository<StoreEntity>;
  let userRepository: Repository<UserEntity>;
  let dataSource: DataSource;
  let module: TestingModule;
  let testStore: StoreEntity;

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
      providers: [ServiceRepository],
    }).compile();

    repository = module.get<ServiceRepository>(ServiceRepository);
    typeOrmRepository = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    storeRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
    await storeRepository.clear();
    await userRepository.clear();

    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = userRepository.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '123.456.789-00',
    });
    const savedUser = await userRepository.save(testUser);

    testStore = storeRepository.create({
      name: 'Test Store',
      userId: savedUser.id,
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
    });
    testStore = await storeRepository.save(testStore);
  });

  describe('create', () => {
    it('should create a service with all fields', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/image.jpg',
      };

      const createdService = await repository.create(inputDto, testStore.id);

      expect(createdService).toBeDefined();
      expect(createdService.id).toBeDefined();
      expect(createdService.title).toBe(inputDto.title);
      expect(createdService.description).toBe(inputDto.description);
      expect(createdService.price).toBe(inputDto.price);
      expect(createdService.durationMinutes).toBe(inputDto.durationMinutes);
      expect(createdService.imageUrl).toBe(inputDto.imageUrl);
      expect(createdService.storeId).toBe(testStore.id);
      expect(createdService.createdAt).toBeDefined();
      expect(createdService.updatedAt).toBeDefined();
    });

    it('should create a service without optional imageUrl', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Service Without Image',
        description: 'This is a service without image description',
        price: 50.0,
        durationMinutes: 30,
      };

      const createdService = await repository.create(inputDto, testStore.id);

      expect(createdService).toBeDefined();
      expect(createdService.id).toBeDefined();
      expect(createdService.title).toBe(inputDto.title);
      expect(createdService.imageUrl).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no services exist', async () => {
      const services = await repository.findAll();

      expect(services).toBeDefined();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBe(0);
    });

    it('should return all services with store relation', async () => {
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

      await repository.create(inputDto1, testStore.id);
      await repository.create(inputDto2, testStore.id);

      const services = await repository.findAll();

      expect(services.length).toBe(2);
      services.forEach((service) => {
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('title');
        expect(service).toHaveProperty('storeId');
        expect(service).toHaveProperty('store');
        expect(service.store).toBeDefined();
        expect(service.store.id).toBeDefined();
      });
    });
  });

  describe('findById', () => {
    it('should return null when service does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const service = await repository.findById(fakeId);

      expect(service).toBeNull();
    });

    it('should return service by id with store relation', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Find Service',
        description: 'Service to be found',
        price: 150.0,
        durationMinutes: 45,
      };

      const createdService = await repository.create(inputDto, testStore.id);
      const foundService = await repository.findById(createdService.id);

      expect(foundService).toBeDefined();
      expect(foundService?.id).toBe(createdService.id);
      expect(foundService?.title).toBe(inputDto.title);
      expect(foundService?.storeId).toBe(testStore.id);
      expect(foundService?.store).toBeDefined();
      expect(foundService?.store.id).toBe(testStore.id);
    });
  });

  describe('findByStoreId', () => {
    it('should return empty array when store has no services', async () => {
      const services = await repository.findByStoreId(testStore.id);

      expect(services).toBeDefined();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBe(0);
    });

    it('should return services by storeId with store relation', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = userRepository.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });
      const savedSecondUser = await userRepository.save(secondUser);

      const secondStore = storeRepository.create({
        name: 'Second Store',
        userId: savedSecondUser.id,
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
      });
      const savedSecondStore = await storeRepository.save(secondStore);

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

      await repository.create(inputDto1, testStore.id);
      await repository.create(inputDto2, savedSecondStore.id);

      const services = await repository.findByStoreId(testStore.id);

      expect(services.length).toBe(1);
      expect(services[0].storeId).toBe(testStore.id);
      expect(services[0].title).toBe(inputDto1.title);
      expect(services[0].store).toBeDefined();
      expect(services[0].store.id).toBe(testStore.id);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when service does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
      };

      await expect(repository.update(fakeId, updateDto)).rejects.toThrow('Service not found');
    });

    it('should update service title', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await repository.create(inputDto, testStore.id);
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
      };

      const updatedService = await repository.update(createdService.id, updateDto);

      expect(updatedService).toBeDefined();
      expect(updatedService.title).toBe(updateDto.title);
      expect(updatedService.description).toBe(inputDto.description);
      expect(updatedService.price).toBe(inputDto.price);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await repository.create(inputDto, testStore.id);
      const updateDto: UpdateServiceDto = {
        title: 'Updated Title',
        description: 'Updated description',
        price: 150.0,
        durationMinutes: 90,
      };

      const updatedService = await repository.update(createdService.id, updateDto);

      expect(updatedService).toBeDefined();
      expect(updatedService.title).toBe(updateDto.title);
      expect(updatedService.description).toBe(updateDto.description);
      expect(updatedService.price).toBe(updateDto.price);
      expect(updatedService.durationMinutes).toBe(updateDto.durationMinutes);
    });

    it('should update imageUrl to null', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Image Service',
        description: 'Service with image',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/old-image.jpg',
      };

      const createdService = await repository.create(inputDto, testStore.id);
      const updateDto: UpdateServiceDto = {
        imageUrl: null,
      };

      const updatedService = await repository.update(createdService.id, updateDto);

      expect(updatedService).toBeDefined();
      expect(updatedService.imageUrl).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete service', async () => {
      const inputDto: CreateServiceDto = {
        title: 'Delete Service',
        description: 'Service to be deleted',
        price: 100.0,
        durationMinutes: 60,
      };

      const createdService = await repository.create(inputDto, testStore.id);
      await repository.delete(createdService.id);

      const foundService = await repository.findById(createdService.id);
      expect(foundService).toBeNull();
    });

    it('should not throw error when deleting non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(repository.delete(fakeId)).resolves.not.toThrow();
    });
  });
});

