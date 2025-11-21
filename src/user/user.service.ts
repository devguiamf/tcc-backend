import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './models/dto/create-user.dto';
import { UpdateUserDto } from './models/dto/update-user.dto';
import { UserOutput, UserType } from './models/types/user.types';
import { UserEntity } from './models/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(input: CreateUserDto): Promise<UserOutput> {
    await this.validateUserData(input);
    const user = await this.repository.create(input);
    return this.mapToOutput(user);
  }

  async findAll(): Promise<UserOutput[]> {
    const users = await this.repository.findAll();
    return users.map((user) => this.mapToOutput(user));
  }

  async findById(id: string): Promise<UserOutput> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.mapToOutput(user);
  }

  async update(id: string, input: UpdateUserDto): Promise<UserOutput> {
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (input.email) {
      const emailExists = await this.repository.findByEmail(input.email);
      if (emailExists && emailExists.id !== id) {
        throw new ConflictException('E-mail já está em uso');
      }
    }
    const user = await this.repository.update(id, input);
    return this.mapToOutput(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.repository.delete(id);
  }

  private async validateUserData(input: CreateUserDto): Promise<void> {
    const emailExists = await this.repository.findByEmail(input.email);
    if (emailExists) {
      throw new ConflictException('E-mail já está em uso');
    }
    if (input.type === UserType.CLIENTE && !input.phone) {
      throw new BadRequestException('Telefone é obrigatório para tipo cliente');
    }
    if (input.type === UserType.PRESTADOR && !input.cpf) {
      throw new BadRequestException('CPF é obrigatório para tipo prestador');
    }
  }

  private mapToOutput(user: UserEntity): UserOutput {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      cpf: user.cpf || undefined,
      phone: user.phone || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

