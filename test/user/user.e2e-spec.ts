import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../../src/user/user.module';
import { UserEntity } from '../../src/user/models/user.entity';
import { UserType } from '../../src/user/models/types/user.types';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a cliente user with name, email, password and phone', async () => {
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

    it('should create a prestador user with name, cpf, password and email', async () => {
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

    it('should reject cliente without phone', async () => {
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

    it('should reject prestador without cpf', async () => {
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

    it('should reject duplicate email', async () => {
      const createUserDto = {
        name: 'Duplicate Email',
        email: 'john@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511888888888',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(409);
    });

    it('should validate email format', async () => {
      const createUserDto = {
        name: 'Invalid Email',
        email: 'invalid-email',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511777777777',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('should validate password length', async () => {
      const createUserDto = {
        name: 'Short Password',
        email: 'short@example.com',
        password: '12345',
        type: UserType.CLIENTE,
        phone: '+5511666666666',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .expect(200);

      expect(response.body.id).toBe(createdUserId);
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
    it('should update a user', async () => {
      const updateUserDto = {
        name: 'Updated Name',
        phone: '+5511999999998',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${createdUserId}`)
        .send(updateUserDto)
        .expect(200);

      expect(response.body.name).toBe(updateUserDto.name);
      expect(response.body.phone).toBe(updateUserDto.phone);
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
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .expect(204);
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

