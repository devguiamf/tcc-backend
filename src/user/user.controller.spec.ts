process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user.module';
import { UserEntity } from './models/user.entity';
import { UserType } from './models/types/user.types';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UserController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let repository: Repository<UserEntity>;
  let module: TestingModule;
  let createdUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [UserEntity],
          synchronize: true,
          logging: false,
        }),
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
    repository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
    await module.close();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  describe('POST /users', () => {
    it('should create a cliente user with valid data', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.type).toBe(UserType.CLIENTE);
      expect(response.body.phone).toBe(createUserDto.phone);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('cpf');

      createdUserId = response.body.id;
    });

    it('should create a prestador user with valid data', async () => {
      const createUserDto = {
        name: 'Jane Provider',
        email: 'jane@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body.type).toBe(UserType.PRESTADOR);
      expect(response.body.cpf).toBe(createUserDto.cpf);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('phone');
    });

    it('should return 400 when cliente user has no phone', async () => {
      const createUserDto = {
        name: 'Invalid Client',
        email: 'invalid@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 when prestador user has no CPF', async () => {
      const createUserDto = {
        name: 'Invalid Provider',
        email: 'invalid2@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 409 when email already exists', async () => {
      const createUserDto = {
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const duplicateDto = {
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511888888888',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(duplicateDto)
        .expect(409);
    });

    it('should return 400 when email format is invalid', async () => {
      const createUserDto = {
        name: 'Invalid Email',
        email: 'invalid-email',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 when password is too short', async () => {
      const createUserDto = {
        name: 'Short Password',
        email: 'short@example.com',
        password: '12345',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 when name is too short', async () => {
      const createUserDto = {
        name: 'A',
        email: 'shortname@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 when CPF format is invalid', async () => {
      const createUserDto = {
        name: 'Invalid CPF',
        email: 'invalidcpf@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '12345678900',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 when phone format is invalid', async () => {
      const createUserDto = {
        name: 'Invalid Phone',
        email: 'invalidphone@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '12345',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return empty array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return all users without password', async () => {
      const createUserDto1 = {
        name: 'User One',
        email: 'user1@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };
      const createUserDto2 = {
        name: 'User Two',
        email: 'user2@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto2)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('type');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const createUserDto = {
        name: 'Find User',
        email: 'find@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.name).toBe(createUserDto.name);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const createUserDto = {
        name: 'Original Name',
        email: 'update@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userId = createResponse.body.id;

      const updateUserDto = {
        name: 'Updated Name',
        phone: '+5511888888888',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .send(updateUserDto)
        .expect(200);

      expect(response.body.name).toBe(updateUserDto.name);
      expect(response.body.phone).toBe(updateUserDto.phone);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateUserDto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .put(`/users/${fakeId}`)
        .send(updateUserDto)
        .expect(404);
    });

    it('should return 409 when updating to duplicate email', async () => {
      const createUserDto1 = {
        name: 'First User',
        email: 'first@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };
      const createUserDto2 = {
        name: 'Second User',
        email: 'second@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511888888888',
      };

      const createResponse1 = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto1)
        .expect(201);
      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto2)
        .expect(201);

      const userId1 = createResponse1.body.id;

      const updateUserDto = {
        email: 'second@example.com',
      };

      await request(app.getHttpServer())
        .put(`/users/${userId1}`)
        .send(updateUserDto)
        .expect(409);
    });

    it('should validate update DTO fields', async () => {
      const createUserDto = {
        name: 'Validation User',
        email: 'validation@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userId = createResponse.body.id;

      const invalidUpdateDto = {
        name: 'A',
        phone: '12345',
      };

      await request(app.getHttpServer())
        .put(`/users/${userId}`)
        .send(invalidUpdateDto)
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      const createUserDto = {
        name: 'Delete User',
        email: 'delete@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const userId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/users/${fakeId}`)
        .expect(404);
    });
  });

  describe('GET /users/admin/test', () => {
    it('should return test message', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/admin/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'User module is working' });
    });
  });
});

