import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceEntity } from './models/service.entity';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';

@Injectable()
export class ServiceRepository {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly repository: Repository<ServiceEntity>,
  ) {}

  async create(input: CreateServiceDto, storeId: string): Promise<ServiceEntity> {
    const service = this.repository.create({
      ...input,
      storeId,
      imageUrl: input.imageUrl || null,
    });
    return await this.repository.save(service);
  }

  async findAll(): Promise<ServiceEntity[]> {
    return await this.repository.find({
      relations: ['store'],
    });
  }

  async findById(id: string): Promise<ServiceEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['store'],
    });
  }

  async findByStoreId(storeId: string): Promise<ServiceEntity[]> {
    return await this.repository.find({
      where: { storeId },
      relations: ['store'],
    });
  }

  async update(id: string, input: UpdateServiceDto): Promise<ServiceEntity> {
    const service = await this.repository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    await this.repository.update(id, input);
    return await this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

