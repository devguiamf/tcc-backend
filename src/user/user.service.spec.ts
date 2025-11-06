process.env.DB_TYPE = 'sqlite';

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserEntity } from './models/user.entity';
import { CreateUserDto } from './models/dto/create-user.dto';
import { UpdateUserDto } from './models/dto/update-user.dto';
import { UserType } from './models/types/user.types';

describe('UserService', () => {
  let service: UserService;
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
      providers: [UserService, UserRepository],
    }).compile();

    service = module.get<UserService>(UserService);
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
    it('should create a cliente user successfully', async () => {
      const inputDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const result = await service.create(inputDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(inputDto.name);
      expect(result.email).toBe(inputDto.email);
      expect(result.type).toBe(inputDto.type);
      expect(result.phone).toBe(inputDto.phone);
      expect(result).not.toHaveProperty('password');
      expect(result.cpf).toBeUndefined();
    });

    it('should create a prestador user successfully', async () => {
      const inputDto: CreateUserDto = {
        name: 'Jane Provider',
        email: 'jane@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      const result = await service.create(inputDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(inputDto.name);
      expect(result.email).toBe(inputDto.email);
      expect(result.type).toBe(inputDto.type);
      expect(result.cpf).toBe(inputDto.cpf);
      expect(result).not.toHaveProperty('password');
      expect(result.phone).toBe(undefined);
    });

    it('should throw ConflictException when email already exists', async () => {
      const inputDto: CreateUserDto = {
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      await service.create(inputDto);

      const duplicateDto: CreateUserDto = {
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511888888888',
      };

      await expect(service.create(duplicateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(duplicateDto)).rejects.toThrow('Email already in use');
    });

    it('should throw BadRequestException when cliente user has no phone', async () => {
      const inputDto: CreateUserDto = {
        name: 'Invalid Client',
        email: 'invalid@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow('Phone is required for cliente type');
    });

    it('should throw BadRequestException when prestador user has no CPF', async () => {
      const inputDto: CreateUserDto = {
        name: 'Invalid Provider',
        email: 'invalid2@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
      };

      await expect(service.create(inputDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(inputDto)).rejects.toThrow('CPF is required for prestador type');
    });
  });

  describe('findAll', () => {
    it('should return empty array when no users exist', async () => {
      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return all users without password', async () => {
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

      await service.create(inputDto1);
      await service.create(inputDto2);

      const result = await service.findAll();

      expect(result.length).toBe(2);
      result.forEach((user) => {
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

  describe('findById', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.findById(fakeId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(fakeId)).rejects.toThrow('User not found');
    });

    it('should return user by id without password', async () => {
      const inputDto: CreateUserDto = {
        name: 'Find User',
        email: 'find@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      const result = await service.findById(createdUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(createdUser.id);
      expect(result.name).toBe(inputDto.name);
      expect(result.email).toBe(inputDto.email);
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      await expect(service.update(fakeId, updateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(fakeId, updateDto)).rejects.toThrow('User not found');
    });

    it('should update user name', async () => {
      const inputDto: CreateUserDto = {
        name: 'Original Name',
        email: 'update@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const result = await service.update(createdUser.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.email).toBe(inputDto.email);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException when updating to duplicate email', async () => {
      const inputDto1: CreateUserDto = {
        name: 'First User',
        email: 'first@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };
      const inputDto2: CreateUserDto = {
        name: 'Second User',
        email: 'second@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511888888888',
      };

      const createdUser1 = await service.create(inputDto1);
      await service.create(inputDto2);

      const updateDto: UpdateUserDto = {
        email: 'second@example.com',
      };

      await expect(service.update(createdUser1.id, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.update(createdUser1.id, updateDto)).rejects.toThrow('Email already in use');
    });

    it('should allow updating to same email', async () => {
      const inputDto: CreateUserDto = {
        name: 'Same Email User',
        email: 'same@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        email: 'same@example.com',
      };

      const result = await service.update(createdUser.id, updateDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(inputDto.email);
      expect(result.name).toBe(updateDto.name);
    });

    it('should update multiple fields', async () => {
      const inputDto: CreateUserDto = {
        name: 'Original Name',
        email: 'multiuPDATE@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        phone: '+5511888888888',
      };

      const result = await service.update(createdUser.id, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.phone).toBe(updateDto.phone);
      expect(result.email).toBe(inputDto.email);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(service.delete(fakeId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(fakeId)).rejects.toThrow('User not found');
    });

    it('should delete user successfully', async () => {
      const inputDto: CreateUserDto = {
        name: 'Delete User',
        email: 'delete@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      await service.delete(createdUser.id);

      await expect(service.findById(createdUser.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToOutput', () => {
    it('should map user entity to output correctly with all fields', async () => {
      const inputDto: CreateUserDto = {
        name: 'Complete User',
        email: 'complete@example.com',
        password: 'password123',
        type: UserType.PRESTADOR,
        cpf: '123.456.789-00',
      };

      const result = await service.create(inputDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('cpf');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('password');
    });

    it('should map optional fields as undefined when null', async () => {
      const inputDto: CreateUserDto = {
        name: 'Optional User',
        email: 'optional@example.com',
        password: 'password123',
        type: UserType.CLIENTE,
        phone: '+5511999999999',
      };

      const createdUser = await service.create(inputDto);
      const result = await service.findById(createdUser.id);

      expect(result.cpf).toBeUndefined();
    });
  });
});

