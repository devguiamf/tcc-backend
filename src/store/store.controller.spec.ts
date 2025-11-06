process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreModule } from './store.module';
import { UserModule } from '../user/user.module';
import { StoreEntity } from './models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { UserType } from '../user/models/types/user.types';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../user/user.repository';
import * as bcrypt from 'bcrypt';

describe('StoreController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storeRepository: Repository<StoreEntity>;
  let userRepository: Repository<UserEntity>;
  let userRepoService: UserRepository;
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
        StoreModule,
        UserModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = module.get<DataSource>(DataSource);
    storeRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    userRepoService = module.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await storeRepository.clear();
    await userRepository.clear();

    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await userRepoService.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: hashedPassword,
      type: UserType.PRESTADOR,
      cpf: '123.456.789-00',
    });

    clienteUser = await userRepoService.create({
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

  describe('POST /stores', () => {
    it('should create a store with valid data', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'https://example.com/image.jpg',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createStoreDto.name);
      expect(response.body.userId).toBe(createStoreDto.userId);
      expect(response.body.workingHours).toEqual(createStoreDto.workingHours);
      expect(response.body.location).toEqual(createStoreDto.location);
      expect(response.body.imageUrl).toBe(createStoreDto.imageUrl);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a store without optional imageUrl', async () => {
      const createStoreDto = {
        name: 'Store Without Image',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createStoreDto.name);
      expect(response.body.imageUrl).toBeUndefined();
    });

    it('should return 400 when user is not PRESTADOR', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: clienteUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 404 when user does not exist', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const createStoreDto = {
        name: 'Test Store',
        userId: fakeUserId,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(404);
    });

    it('should return 409 when user already has a store', async () => {
      const createStoreDto = {
        name: 'First Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const duplicateDto = {
        name: 'Second Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(duplicateDto)
        .expect(409);
    });

    it('should return 400 when name is too short', async () => {
      const createStoreDto = {
        name: 'A',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when name is missing', async () => {
      const createStoreDto = {
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when userId is missing', async () => {
      const createStoreDto = {
        name: 'Test Store',
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when workingHours has less than 7 days', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: [
          { dayOfWeek: 0, isOpen: false },
          { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        ],
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when workingHours is missing', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when location is missing', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when location street is too short', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: {
          ...createValidLocation(),
          street: 'AB',
        },
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when zipCode format is invalid', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: {
          ...createValidLocation(),
          zipCode: '12345',
        },
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when state length is invalid', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: {
          ...createValidLocation(),
          state: 'S',
        },
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when imageUrl is not a valid URL', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
        imageUrl: 'not-a-valid-url',
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when openTime format is invalid', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '25:00', closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ];

      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when closeTime format is invalid', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '60:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ];

      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });

    it('should return 400 when dayOfWeek is out of range', async () => {
      const invalidWorkingHours = [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 7, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { dayOfWeek: 6, isOpen: false },
      ];

      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: invalidWorkingHours,
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(400);
    });
  });

  describe('GET /stores', () => {
    it('should return empty array when no stores exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return all stores', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = await userRepoService.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });

      const createStoreDto1 = {
        name: 'Store One',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };
      const createStoreDto2 = {
        name: 'Store Two',
        userId: secondUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/stores')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((store: any) => {
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

  describe('GET /stores/:id', () => {
    it('should return store by id', async () => {
      const createStoreDto = {
        name: 'Find Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/stores/${storeId}`)
        .expect(200);

      expect(response.body.id).toBe(storeId);
      expect(response.body.name).toBe(createStoreDto.name);
      expect(response.body.userId).toBe(createStoreDto.userId);
    });

    it('should return 404 for non-existent store', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/stores/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /stores/user/:userId', () => {
    it('should return store by userId', async () => {
      const createStoreDto = {
        name: 'User Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/stores/user/${testUser.id}`)
        .expect(200);

      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.name).toBe(createStoreDto.name);
    });

    it('should return 404 when user has no store', async () => {
      await request(app.getHttpServer())
        .get(`/stores/user/${testUser.id}`)
        .expect(404);
    });
  });

  describe('PUT /stores/:id', () => {
    it('should update store successfully', async () => {
      const createStoreDto = {
        name: 'Original Name',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;

      const updateStoreDto = {
        name: 'Updated Name',
        imageUrl: 'https://example.com/new-image.jpg',
      };

      const response = await request(app.getHttpServer())
        .put(`/stores/${storeId}`)
        .send(updateStoreDto)
        .expect(200);

      expect(response.body.name).toBe(updateStoreDto.name);
      expect(response.body.imageUrl).toBe(updateStoreDto.imageUrl);
      expect(response.body.userId).toBe(createStoreDto.userId);
    });

    it('should return 404 for non-existent store', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateStoreDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put(`/stores/${fakeId}`)
        .send(updateStoreDto)
        .expect(404);
    });

    it('should return 400 when updating with invalid name', async () => {
      const createStoreDto = {
        name: 'Validation Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;

      const invalidUpdateDto = {
        name: 'A',
      };

      await request(app.getHttpServer())
        .put(`/stores/${storeId}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when updating with invalid imageUrl', async () => {
      const createStoreDto = {
        name: 'Validation Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;

      const invalidUpdateDto = {
        imageUrl: 'not-a-valid-url',
      };

      await request(app.getHttpServer())
        .put(`/stores/${storeId}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when user is not PRESTADOR', async () => {
      const createStoreDto = {
        name: 'Test Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;
      const updateStoreDto = {
        userId: clienteUser.id,
      };

      await request(app.getHttpServer())
        .put(`/stores/${storeId}`)
        .send(updateStoreDto)
        .expect(400);
    });

    it('should return 409 when updating userId to user that already has store', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondUser = await userRepoService.create({
        name: 'Second Provider',
        email: 'provider2@example.com',
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: '987.654.321-00',
      });

      const createStoreDto1 = {
        name: 'First Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };
      const createStoreDto2 = {
        name: 'Second Store',
        userId: secondUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse1 = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto2)
        .expect(201);

      const storeId1 = createResponse1.body.id;

      const updateStoreDto = {
        userId: secondUser.id,
      };

      await request(app.getHttpServer())
        .put(`/stores/${storeId1}`)
        .send(updateStoreDto)
        .expect(409);
    });
  });

  describe('DELETE /stores/:id', () => {
    it('should delete store successfully', async () => {
      const createStoreDto = {
        name: 'Delete Store',
        userId: testUser.id,
        workingHours: createValidWorkingHours(),
        location: createValidLocation(),
      };

      const createResponse = await request(app.getHttpServer())
        .post('/stores')
        .send(createStoreDto)
        .expect(201);

      const storeId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/stores/${storeId}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/stores/${storeId}`)
        .expect(404);
    });

    it('should return 404 for non-existent store', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/stores/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /stores/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores/admin/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'Store module is working' });
    });
  });
});

