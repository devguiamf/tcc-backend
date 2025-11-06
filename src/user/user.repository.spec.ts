process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';
import { UserEntity } from './models/user.entity';
import { CreateUserDto } from './models/dto/create-user.dto';
import { UpdateUserDto } from './models/dto/update-user.dto';
import { UserType } from './models/types/user.types';
import * as bcrypt from 'bcrypt';

describe('UserRepository', () => {
  let repository: UserRepository;
  let typeOrmRepository: Repository<UserEntity>;
  let dataSource: DataSource;
  let module: TestingModule;

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
        TypeOrmModule.forFeature([UserEntity]),
      ],
      providers: [UserRepository],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    typeOrmRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await typeOrmRepository.clear();
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const inputDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await repository.create(inputDto);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(inputDto.name);
      expect(createdUser.email).toBe(inputDto.email);
      expect(createdUser.type).toBe(inputDto.type);
      expect(createdUser.phone).toBe(inputDto.phone);
      expect(createdUser.password).not.toBe(inputDto.password);
      expect(createdUser.password).toBeDefined();

      const isPasswordHashed = await bcrypt.compare(inputDto.password, createdUser.password);
      expect(isPasswordHashed).toBe(true);
    });

    it('should create a prestador user with CPF', async () => {
      const inputDto: CreateUserDto = {
        name: 'Jane Provider',
        email: 'jane@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      const createdUser = await repository.create(inputDto);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(inputDto.name);
      expect(createdUser.email).toBe(inputDto.email);
      expect(createdUser.type).toBe(inputDto.type);
      expect(createdUser.cpf).toBe(inputDto.cpf);
      expect(createdUser.password).not.toBe(inputDto.password);
    });

    it('should create user without optional fields', async () => {
      const inputDto: CreateUserDto = {
        name: 'Minimal User',
        email: 'minimal@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
      };

      const createdUser = await repository.create(inputDto);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(inputDto.name);
      expect(createdUser.email).toBe(inputDto.email);
      expect(createdUser.type).toBe(inputDto.type);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const users = await repository.findAll();

      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBe(0);
    });

    it('should return all users without password field', async () => {
      const inputDto1: CreateUserDto = {
        name: 'User One',
        email: 'user1@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };
      const inputDto2: CreateUserDto = {
        name: 'User Two',
        email: 'user2@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      await repository.create(inputDto1);
      await repository.create(inputDto2);

      const users = await repository.findAll();

      expect(users.length).toBe(2);
      users.forEach((user) => {
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('type');
      });
    });
  });

  describe('findById', () => {
    it('should return null when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const user = await repository.findById(fakeId);

      expect(user).toBeNull();
    });

    it('should return user by id without password field', async () => {
      const inputDto: CreateUserDto = {
        name: 'Find User',
        email: 'find@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await repository.create(inputDto);
      const foundUser = await repository.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.name).toBe(inputDto.name);
      expect(foundUser?.email).toBe(inputDto.email);
      expect(foundUser).not.toHaveProperty('password');
    });
  });

  describe('findByEmail', () => {
    it('should return null when email does not exist', async () => {
      const user = await repository.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should return user by email with password field', async () => {
      const inputDto: CreateUserDto = {
        name: 'Email User',
        email: 'email@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await repository.create(inputDto);
      const foundUser = await repository.findByEmail(inputDto.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(inputDto.email);
      expect(foundUser).toHaveProperty('password');
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should return null when email does not exist', async () => {
      const user = await repository.findByEmailWithPassword('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should return user by email with password field in select', async () => {
      const inputDto: CreateUserDto = {
        name: 'Password User',
        email: 'password@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await repository.create(inputDto);
      const foundUser = await repository.findByEmailWithPassword(inputDto.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(inputDto.email);
      expect(foundUser).toHaveProperty('password');
      expect(foundUser?.password).toBeDefined();

      const isPasswordValid = await bcrypt.compare(inputDto.password, foundUser!.password);
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      await expect(repository.update(fakeId, updateDto)).rejects.toThrow('User not found');
    });

    it('should update user name', async () => {
      const inputDto: CreateUserDto = {
        name: 'Original Name',
        email: 'update@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await repository.create(inputDto);
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = await repository.update(createdUser.id, updateDto);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe(updateDto.name);
      expect(updatedUser.email).toBe(inputDto.email);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateUserDto = {
        name: 'Original Name',
        email: 'multiuPDATE@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await repository.create(inputDto);
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        phone: '+5511888888888',
      };

      const updatedUser = await repository.update(createdUser.id, updateDto);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.name).toBe(updateDto.name);
      expect(updatedUser.phone).toBe(updateDto.phone);
      expect(updatedUser.email).toBe(inputDto.email);
    });

    it('should update CPF for prestador user', async () => {
      const inputDto: CreateUserDto = {
        name: 'CPF User',
        email: 'cpfupdate@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      const createdUser = await repository.create(inputDto);
      const updateDto: UpdateUserDto = {
        cpf: '987.654.321-00',
      };

      const updatedUser = await repository.update(createdUser.id, updateDto);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.cpf).toBe(updateDto.cpf);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const inputDto: CreateUserDto = {
        name: 'Delete User',
        email: 'delete@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await repository.create(inputDto);
      await repository.delete(createdUser.id);

      const foundUser = await repository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should not throw error when deleting non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(repository.delete(fakeId)).resolves.not.toThrow();
    });
  });
});

