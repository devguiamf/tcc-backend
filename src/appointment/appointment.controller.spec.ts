process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppointmentModule } from './appointment.module';
import { StoreModule } from '../store/store.module';
import { ServiceModule } from '../service/service.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { CoreModule } from '../core/core.module';
import { AppointmentEntity } from './models/appointment.entity';
import { StoreEntity } from '../store/models/store.entity';
import { ServiceEntity } from '../service/models/service.entity';
import { UserEntity } from '../user/models/user.entity';
import { UserType } from '../user/models/types/user.types';
import { AppointmentInterval } from '../store/models/types/store.types';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../user/user.repository';
import { StoreRepository } from '../store/store.repository';
import { ServiceRepository } from '../service/service.repository';
import { getAuthTokenFromService } from '../../test/helpers/auth-test.helper';

describe('AppointmentController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let appointmentRepository: Repository<AppointmentEntity>;
  let serviceRepository: Repository<ServiceEntity>;
  let storeRepository: Repository<StoreEntity>;
  let userRepository: Repository<UserEntity>;
  let userRepoService: UserRepository;
  let storeRepoService: StoreRepository;
  let serviceRepoService: ServiceRepository;
  let module: TestingModule;
  let testClient: UserEntity;
  let testProvider: UserEntity;
  let otherClient: UserEntity;
  let testStore: StoreEntity;
  let testService: ServiceEntity;
  let testClientToken: string;
  let testProviderToken: string;
  let otherClientToken: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [AppointmentEntity, StoreEntity, ServiceEntity, UserEntity],
          synchronize: true,
          logging: false,
        }),
        CoreModule,
        AppointmentModule,
        StoreModule,
        ServiceModule,
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
    appointmentRepository = module.get<Repository<AppointmentEntity>>(getRepositoryToken(AppointmentEntity));
    serviceRepository = module.get<Repository<ServiceEntity>>(getRepositoryToken(ServiceEntity));
    storeRepository = module.get<Repository<StoreEntity>>(getRepositoryToken(StoreEntity));
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    userRepoService = module.get<UserRepository>(UserRepository);
    storeRepoService = module.get<StoreRepository>(StoreRepository);
    serviceRepoService = module.get<ServiceRepository>(ServiceRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await appointmentRepository.clear();
    await serviceRepository.clear();
    await storeRepository.clear();
    await userRepository.clear();

    testClient = await userRepoService.create({
      name: 'Test Client',
      email: 'client@example.com',
      password: 'password123',
      type: UserType.CLIENTE,
      cpf: '123.456.789-00',
    });

    testProvider = await userRepoService.create({
      name: 'Test Provider',
      email: 'provider@example.com',
      password: 'password123',
      type: UserType.PRESTADOR,
      cpf: '987.654.321-00',
    });

    otherClient = await userRepoService.create({
      name: 'Other Client',
      email: 'otherclient@example.com',
      password: 'password123',
      type: UserType.CLIENTE,
      cpf: '111.222.333-44',
    });

    testStore = await storeRepoService.create({
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

    testService = await serviceRepoService.create(
      {
        title: 'Test Service',
        description: 'This is a test service description',
        price: 100.0,
        durationMinutes: 60,
      },
      testStore.id,
    );

    testClientToken = await getAuthTokenFromService(module, 'client@example.com', 'password123');
    testProviderToken = await getAuthTokenFromService(module, 'provider@example.com', 'password123');
    otherClientToken = await getAuthTokenFromService(module, 'otherclient@example.com', 'password123');
  });

  const createValidAppointmentDto = (overrides?: any) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const daysUntilMonday = (1 - futureDate.getDay() + 7) % 7 || 7;
    futureDate.setDate(futureDate.getDate() + daysUntilMonday);
    futureDate.setHours(10, 0, 0, 0);

    return {
      storeId: testStore.id,
      serviceId: testService.id,
      appointmentDate: futureDate.toISOString(),
      notes: 'Test appointment notes',
      ...overrides,
    };
  };

  describe('POST /appointments', () => {
    it('should create an appointment with valid data', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testClient.id);
      expect(response.body.storeId).toBe(createAppointmentDto.storeId);
      expect(response.body.serviceId).toBe(createAppointmentDto.serviceId);
      expect(response.body.notes).toBe(createAppointmentDto.notes);
      expect(response.body.status).toBe('pending');
      expect(response.body).toHaveProperty('appointmentDate');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create an appointment without optional notes', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        notes: undefined,
      });

      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.notes).toBeUndefined();
    });

    it('should return 401 when token is not provided', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      await request(app.getHttpServer())
        .post('/appointments')
        .send(createAppointmentDto)
        .expect(401);
    });

    it('should return 400 when user is not CLIENTE', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testProviderToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when storeId is missing', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        storeId: undefined,
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when storeId is not a valid UUID', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        storeId: 'not-a-uuid',
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when serviceId is missing', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        serviceId: undefined,
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when serviceId is not a valid UUID', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        serviceId: 'not-a-uuid',
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when appointmentDate is missing', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        appointmentDate: undefined,
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when appointmentDate is not a valid date string', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        appointmentDate: 'not-a-date',
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 400 when notes is too long', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        notes: 'a'.repeat(501),
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 404 when store does not exist', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        storeId: '00000000-0000-0000-0000-000000000000',
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(404);
    });

    it('should return 404 when service does not exist', async () => {
      const createAppointmentDto = createValidAppointmentDto({
        serviceId: '00000000-0000-0000-0000-000000000000',
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(404);
    });

    it('should return 400 when appointment date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const createAppointmentDto = createValidAppointmentDto({
        appointmentDate: pastDate.toISOString(),
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(400);
    });

    it('should return 409 when appointment time conflicts with existing appointment', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(409);
    });
  });

  describe('GET /appointments', () => {
    it('should return empty array when user has no appointments', async () => {
      const response = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return appointments for authenticated user', async () => {
      const createAppointmentDto1 = createValidAppointmentDto();
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 2);
      const daysUntilMonday2 = (1 - futureDate2.getDay() + 7) % 7 || 7;
      futureDate2.setDate(futureDate2.getDate() + daysUntilMonday2);
      futureDate2.setHours(14, 0, 0, 0);
      const createAppointmentDto2 = createValidAppointmentDto({
        appointmentDate: futureDate2.toISOString(),
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((appointment: any) => {
        expect(appointment.userId).toBe(testClient.id);
        expect(appointment).toHaveProperty('id');
        expect(appointment).toHaveProperty('storeId');
        expect(appointment).toHaveProperty('serviceId');
        expect(appointment).toHaveProperty('appointmentDate');
        expect(appointment).toHaveProperty('status');
      });
    });

    it('should return 401 when token is not provided', async () => {
      await request(app.getHttpServer())
        .get('/appointments')
        .expect(401);
    });
  });

  describe('GET /appointments/:id', () => {
    it('should return appointment by id for the owner', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointmentId);
      expect(response.body.userId).toBe(testClient.id);
      expect(response.body.storeId).toBe(createAppointmentDto.storeId);
    });

    it('should return appointment by id for provider from their store', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testProviderToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointmentId);
      expect(response.body.storeId).toBe(testStore.id);
    });

    it('should return 401 when token is not provided', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(404);
    });

    it('should return 403 when user tries to view another client appointment', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .expect(403);
    });
  });

  describe('GET /appointments/store/:storeId', () => {
    it('should return appointments by storeId for the store owner', async () => {
      const createAppointmentDto1 = createValidAppointmentDto();
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 2);
      const daysUntilMonday2 = (1 - futureDate2.getDay() + 7) % 7 || 7;
      futureDate2.setDate(futureDate2.getDate() + daysUntilMonday2);
      futureDate2.setHours(14, 0, 0, 0);
      const createAppointmentDto2 = createValidAppointmentDto({
        appointmentDate: futureDate2.toISOString(),
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/appointments/store/${testStore.id}`)
        .set('Authorization', `Bearer ${testProviderToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((appointment: any) => {
        expect(appointment.storeId).toBe(testStore.id);
        expect(appointment).toHaveProperty('id');
        expect(appointment).toHaveProperty('userId');
        expect(appointment).toHaveProperty('serviceId');
      });
    });

    it('should return empty array when store has no appointments', async () => {
      const response = await request(app.getHttpServer())
        .get(`/appointments/store/${testStore.id}`)
        .set('Authorization', `Bearer ${testProviderToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 401 when token is not provided', async () => {
      await request(app.getHttpServer())
        .get(`/appointments/store/${testStore.id}`)
        .expect(401);
    });

    it('should return 404 when store does not exist', async () => {
      const fakeStoreId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/appointments/store/${fakeStoreId}`)
        .set('Authorization', `Bearer ${testProviderToken}`)
        .expect(404);
    });

    it('should return 403 when user is not provider', async () => {
      await request(app.getHttpServer())
        .get(`/appointments/store/${testStore.id}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(403);
    });
  });

  describe('GET /appointments/available-slots/:storeId/:serviceId', () => {
    it('should return available time slots for a working day', async () => {
      const futureDate = new Date();
      const daysUntilMonday = (1 - futureDate.getDay() + 7) % 7 || 7;
      futureDate.setDate(futureDate.getDate() + daysUntilMonday);
      futureDate.setHours(0, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .get(`/appointments/available-slots/${testStore.id}/${testService.id}`)
        .query({ date: futureDate.toISOString() })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((slot: any) => {
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('date');
        expect(slot.date).toBe(futureDate.toISOString().split('T')[0]);
      });
    });

    it('should return empty array when store is closed on that day', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (7 - futureDate.getDay()));
      futureDate.setHours(0, 0, 0, 0);

      const response = await request(app.getHttpServer())
        .get(`/appointments/available-slots/${testStore.id}/${testService.id}`)
        .query({ date: futureDate.toISOString() })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 404 when store does not exist', async () => {
      const fakeStoreId = '00000000-0000-0000-0000-000000000000';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await request(app.getHttpServer())
        .get(`/appointments/available-slots/${fakeStoreId}/${testService.id}`)
        .query({ date: futureDate.toISOString() })
        .expect(404);
    });

    it('should return 404 when service does not exist', async () => {
      const fakeServiceId = '00000000-0000-0000-0000-000000000000';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await request(app.getHttpServer())
        .get(`/appointments/available-slots/${testStore.id}/${fakeServiceId}`)
        .query({ date: futureDate.toISOString() })
        .expect(404);
    });

    it('should exclude time slots with conflicts', async () => {
      const futureDate = new Date();
      const daysUntilMonday = (1 - futureDate.getDay() + 7) % 7 || 7;
      futureDate.setDate(futureDate.getDate() + daysUntilMonday);
      futureDate.setHours(10, 0, 0, 0);

      const createAppointmentDto = createValidAppointmentDto({
        appointmentDate: futureDate.toISOString(),
      });

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/appointments/available-slots/${testStore.id}/${testService.id}`)
        .query({ date: futureDate.toISOString() })
        .expect(200);

      const conflictingSlot = response.body.find((slot: any) => slot.startTime === '10:00');
      expect(conflictingSlot).toBeUndefined();
    });
  });

  describe('PUT /appointments/:id', () => {
    it('should update appointment status', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const updateAppointmentDto = {
        status: 'confirmed',
      };

      const response = await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(updateAppointmentDto)
        .expect(200);

      expect(response.body.status).toBe('confirmed');
      expect(response.body.id).toBe(appointmentId);
    });

    it('should update appointment notes', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const updateAppointmentDto = {
        notes: 'Updated notes',
      };

      const response = await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(updateAppointmentDto)
        .expect(200);

      expect(response.body.notes).toBe('Updated notes');
    });

    it('should return 401 when token is not provided', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const updateAppointmentDto = {
        status: 'confirmed',
      };

      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .send(updateAppointmentDto)
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateAppointmentDto = {
        status: 'confirmed',
      };

      await request(app.getHttpServer())
        .put(`/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(updateAppointmentDto)
        .expect(404);
    });

    it('should return 403 when user tries to update another user appointment', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const updateAppointmentDto = {
        status: 'confirmed',
      };

      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .send(updateAppointmentDto)
        .expect(403);
    });

    it('should return 400 when updating with invalid status', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const invalidUpdateDto = {
        status: 'invalid-status',
      };

      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });

    it('should return 400 when updating with notes too long', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const invalidUpdateDto = {
        notes: 'a'.repeat(501),
      };

      await request(app.getHttpServer())
        .put(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(invalidUpdateDto)
        .expect(400);
    });
  });

  describe('POST /appointments/:id/cancel', () => {
    it('should cancel appointment successfully', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(201);

      expect(response.body.status).toBe('cancelled');
      expect(response.body.id).toBe(appointmentId);
    });

    it('should return 401 when token is not provided', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/appointments/${fakeId}/cancel`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(404);
    });

    it('should return 403 when user tries to cancel another user appointment', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .expect(403);
    });

    it('should return 400 when appointment is already cancelled', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(400);
    });
  });

  describe('DELETE /appointments/:id', () => {
    it('should delete appointment successfully', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(404);
    });

    it('should return 401 when token is not provided', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .expect(401);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${testClientToken}`)
        .expect(404);
    });

    it('should return 403 when user tries to delete another user appointment', async () => {
      const createAppointmentDto = createValidAppointmentDto();

      const createResponse = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${testClientToken}`)
        .send(createAppointmentDto)
        .expect(201);

      const appointmentId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .expect(403);
    });
  });

  describe('GET /appointments/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/appointments/admin/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'Appointment module is working' });
    });
  });
});

