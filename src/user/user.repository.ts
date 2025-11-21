import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './models/user.entity';
import { CreateUserDto } from './models/dto/create-user.dto';
import { UpdateUserDto } from './models/dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async create(input: CreateUserDto): Promise<UserEntity> {
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = this.repository.create({
      ...input,
      password: hashedPassword,
    });
    return await this.repository.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.repository.find({
      select: ['id', 'name', 'email', 'type', 'cpf', 'phone', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'type', 'cpf', 'phone', 'createdAt', 'updatedAt'],
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return await this.repository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'type', 'cpf', 'phone', 'createdAt', 'updatedAt'],
    });
  }

  async update(id: string, input: UpdateUserDto): Promise<UserEntity> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const updateData: Partial<UserEntity> = { ...input };
    if (input.password) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

