process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServiceModule } from './service.module';
import { StoreModule } from '../store/store.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { CoreModule } from '../core/core.module';
import { ServiceEntity } from './models/service.entity';
import { StoreEntity } from '../store/models/store.entity';
import { UserEntity } from '../user/models/user.entity';
import { UserType } from '../user/models/types/user.types';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../user/user.repository';
import { StoreRepository } from '../store/store.repository';
import { getAuthTokenFromService } from '../../test/helpers/auth-test.helper';
import { AppointmentInterval } from '../store/models/types/store.types';

describe('ServiceController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let serviceRepository: Repository<ServiceEntity>;
  let storeRepository: Repository<StoreEntity>;
  let userRepository: Repository<UserEntity>;
  let userRepoService: UserRepository;
  let storeRepoService: StoreRepository;
  let module: TestingModule;
  let testUser: UserEntity;
  let otherUser: UserEntity;
  let testStore: StoreEntity;
  let otherStore: StoreEntity;
  let testUserToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [ServiceEntity, StoreEntity, UserEntity],
          synchronize: true,
          logging: false,
        }),
        CoreModule,
        ServiceModule,
        StoreModule,
        UserModule,
        AuthModule,
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
    serviceRepository = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    storeRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    userRepoService = module.get<UserRepository>(UserRepository);
    storeRepoService = module.get<StoreRepository>(StoreRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await serviceRepository.clear();
    await storeRepository.clear();
    await userRepository.clear();

    
    testUser = await userRepoService.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: 'password123',
      type: UserType.PRESTADOR,
      cpf: '123.456.789-00',
    });

    testStore = await storeRepoService.create({
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

    otherUser = await userRepoService.create({
      name: 'Other Provider',
      email: 'other@example.com',
      password: 'password123',
      type: UserType.PRESTADOR,
      cpf: '987.654.321-00',
    });

    otherStore = await storeRepoService.create({
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

    testUserToken = await getAuthTokenFromService(module, 'provider@example.com', 'password123');
    otherUserToken = await getAuthTokenFromService(module, 'other@example.com', 'password123');
  });

  describe('POST /services', () => {
    it('should create a service with valid data', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'https://example.com/image.jpg',
      };

      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createServiceDto.title);
      expect(response.body.description).toBe(createServiceDto.description);
      expect(response.body.price).toBe(createServiceDto.price);
      expect(response.body.durationMinutes).toBe(createServiceDto.durationMinutes);
      expect(response.body.imageUrl).toBe(createServiceDto.imageUrl);
      expect(response.body.storeId).toBe(testStore.id);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create a service without optional imageUrl', async () => {
      const createServiceDto = {
        title: 'Service Without Image',
        description: 'This is a service without image description',
        price: 50.0,
        durationMinutes: 30,
      };

      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createServiceDto.title);
      expect(response.body.imageUrl).toBeUndefined();
    });

    it('should return 401 when token is not provided', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .send(createServiceDto)
        .expect(401);
    });

    it('should return 404 when user has no store', async () => {
      const userWithoutStore = await userRepoService.create({
        name: 'No Store Provider',
        email: 'nostore@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '111.222.333-44',
      });

      const userWithoutStoreToken = await getAuthTokenFromService(
        module,
        'nostore@example.com',
        'password123',
      );

      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${userWithoutStoreToken}`)
        .send(createServiceDto)
        .expect(404);
    });

    it('should return 400 when title is too short', async () => {
      const createServiceDto = {
        title: 'A',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when title is missing', async () => {
      const createServiceDto = {
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when description is too short', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'Short',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when description is missing', async () => {
      const createServiceDto = {
        title: 'Test Service',
        price: 100.0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when price is too low', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 0,
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when price is missing', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        durationMinutes: 60,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when durationMinutes is too low', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 0,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when durationMinutes is too high', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 1441,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when durationMinutes is missing', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });

    it('should return 400 when imageUrl is not a valid URL', async () => {
      const createServiceDto = {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
        imageUrl: 'not-a-valid-url',
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(400);
    });
  });

  describe('GET /services', () => {
    it('should return empty array when no services exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/services')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return all services', async () => {
      const createServiceDto1 = {
        title: 'Service One',
        description: 'First service description',
        price: 100.0,
        durationMinutes: 60,
      };
      const createServiceDto2 = {
        title: 'Service Two',
        description: 'Second service description',
        price: 200.0,
        durationMinutes: 90,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(createServiceDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/services')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((service: any) => {
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

  describe('GET /services/my-services', () => {
    it('should return services for authenticated user', async () => {
      const createServiceDto1 = {
        title: 'My Service One',
        description: 'First service description',
        price: 100.0,
        durationMinutes: 60,
      };
      const createServiceDto2 = {
        title: 'My Service Two',
        description: 'Second service description',
        price: 200.0,
        durationMinutes: 90,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/services/my-services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((service: any) => {
        expect(service.storeId).toBe(testStore.id);
      });
    });

    it('should return 401 when token is not provided', async () => {
      await request(app.getHttpServer())
        .get('/services/my-services')
        .expect(401);
    });

    it('should return 404 when user has no store', async () => {
      const userWithoutStore = await userRepoService.create({
        name: 'No Store Provider',
        email: 'nostore2@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '555.666.777-88',
      });

      const userWithoutStoreToken = await getAuthTokenFromService(
        module,
        'nostore2@example.com',
        'password123',
      );

      await request(app.getHttpServer())
        .get('/services/my-services')
        .set('Authorization', `Bearer ${userWithoutStoreToken}`)
        .expect(404);
    });
  });

  describe('GET /services/store/:storeId', () => {
    it('should return services by storeId', async () => {
      const createServiceDto1 = {
        title: 'Store One Service',
        description: 'Service for first store',
        price: 100.0,
        durationMinutes: 60,
      };
      const createServiceDto2 = {
        title: 'Store Two Service',
        description: 'Service for second store',
        price: 200.0,
        durationMinutes: 90,
      };

      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(createServiceDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/services/store/${testStore.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].storeId).toBe(testStore.id);
      expect(response.body[0].title).toBe(createServiceDto1.title);
    });

    it('should return empty array when store has no services', async () => {
      const response = await request(app.getHttpServer())
        .get(`/services/store/${testStore.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /services/:id', () => {
    it('should return service by id', async () => {
      const createServiceDto = {
        title: 'Find Service',
        description: 'Service to be found',
        price: 150.0,
        durationMinutes: 45,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/services/${serviceId}`)
        .expect(200);

      expect(response.body.id).toBe(serviceId);
      expect(response.body.title).toBe(createServiceDto.title);
      expect(response.body.storeId).toBe(testStore.id);
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/services/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /services/:id', () => {
    it('should update service successfully', async () => {
      const createServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const updateServiceDto = {
        title: 'Updated Title',
        description: 'Updated description',
        price: 150.0,
        durationMinutes: 90,
      };

      const response = await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateServiceDto)
        .expect(200);

      expect(response.body.title).toBe(updateServiceDto.title);
      expect(response.body.description).toBe(updateServiceDto.description);
      expect(response.body.price).toBe(updateServiceDto.price);
      expect(response.body.durationMinutes).toBe(updateServiceDto.durationMinutes);
      expect(response.body.storeId).toBe(testStore.id);
    });

    it('should return 401 when token is not provided', async () => {
      const createServiceDto = {
        title: 'Original Title',
        description: 'Original description',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const updateServiceDto = {
        title: 'Updated Title',
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .send(updateServiceDto)
        .expect(401);
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateServiceDto = {
        title: 'Updated Title',
      };

      await request(app.getHttpServer())
        .put(`/services/${fakeId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateServiceDto)
        .expect(404);
    });

    it('should return 403 when user tries to update service from another store', async () => {
      const createServiceDto = {
        title: 'Other Store Service',
        description: 'Service from other store',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const updateServiceDto = {
        title: 'Updated Title',
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateServiceDto)
        .expect(403);
    });

    it('should return 400 when updating with invalid title', async () => {
      const createServiceDto = {
        title: 'Validation Service',
        description: 'Service for validation',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const invalidUpdateDto = {
        title: 'A',
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when updating with invalid description', async () => {
      const createServiceDto = {
        title: 'Validation Service',
        description: 'Service for validation',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const invalidUpdateDto = {
        description: 'Short',
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when updating with invalid price', async () => {
      const createServiceDto = {
        title: 'Validation Service',
        description: 'Service for validation',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const invalidUpdateDto = {
        price: 0,
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when updating with invalid imageUrl', async () => {
      const createServiceDto = {
        title: 'Validation Service',
        description: 'Service for validation',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      const invalidUpdateDto = {
        imageUrl: 'not-a-valid-url',
      };

      await request(app.getHttpServer())
        .put(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });
  });

  describe('DELETE /services/:id', () => {
    it('should delete service successfully', async () => {
      const createServiceDto = {
        title: 'Delete Service',
        description: 'Service to be deleted',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/services/${serviceId}`)
        .expect(404);
    });

    it('should return 401 when token is not provided', async () => {
      const createServiceDto = {
        title: 'Delete Service',
        description: 'Service to be deleted',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/services/${serviceId}`)
        .expect(401);
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/services/${fakeId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });

    it('should return 403 when user tries to delete service from another store', async () => {
      const createServiceDto = {
        title: 'Other Store Service',
        description: 'Service from other store',
        price: 100.0,
        durationMinutes: 60,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(createServiceDto)
        .expect(201);

      const serviceId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/services/${serviceId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('GET /services/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/services/admin/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'Service module is working' });
    });
  });
});

