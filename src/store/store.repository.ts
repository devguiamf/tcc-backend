import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from './models/store.entity';
import { CreateStoreDto } from './models/dto/create-store.dto';
import { UpdateStoreDto } from './models/dto/update-store.dto';

@Injectable()
export class StoreRepository {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly repository: Repository<StoreEntity>,
  ) {}

  async create(input: CreateStoreDto): Promise<StoreEntity> {
    const store = this.repository.create({
      name: input.name,
      userId: input.userId,
      workingHours: input.workingHours,
      location: input.location,
      appointmentInterval: input.appointmentInterval,
      imageUrl: input.imageUrl || null,
    });
    return await this.repository.save(store);
  }

  async findAll(): Promise<StoreEntity[]> {
    return await this.repository.find({
      relations: ['user'],
    });
  }

  async findById(id: string): Promise<StoreEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<StoreEntity | null> {
    return await this.repository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async update(id: string, input: UpdateStoreDto): Promise<StoreEntity> {
    const store = await this.repository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    await this.repository.update(id, input);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

