import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ServiceRepository } from './service.repository';
import { StoreRepository } from '../store/store.repository';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';
import { ServiceOutput } from './models/types/service.types';
import { ServiceEntity } from './models/service.entity';

@Injectable()
export class ServiceService {
  constructor(
    private readonly repository: ServiceRepository,
    private readonly storeRepository: StoreRepository,
  ) {}

  async create(input: CreateServiceDto, userId: string): Promise<ServiceOutput> {
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }
    const service = await this.repository.create(input, store.id);
    return this.mapToOutput(service);
  }

  async findAll(): Promise<ServiceOutput[]> {
    const services = await this.repository.findAll();
    return services.map((service) => this.mapToOutput(service));
  }

  async findById(id: string): Promise<ServiceOutput> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return this.mapToOutput(service);
  }

  async findByStoreId(storeId: string): Promise<ServiceOutput[]> {
    const services = await this.repository.findByStoreId(storeId);
    return services.map((service) => this.mapToOutput(service));
  }

  async findByUserId(userId: string): Promise<ServiceOutput[]> {
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }
    const services = await this.repository.findByStoreId(store.id);
    return services.map((service) => this.mapToOutput(service));
  }

  async update(id: string, input: UpdateServiceDto, userId: string): Promise<ServiceOutput> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const store = await this.storeRepository.findByUserId(userId);
    if (!store || service.storeId !== store.id) {
      throw new ForbiddenException('You can only update services from your own store');
    }
    const updatedService = await this.repository.update(id, input);
    return this.mapToOutput(updatedService);
  }

  async delete(id: string, userId: string): Promise<void> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const store = await this.storeRepository.findByUserId(userId);
    if (!store || service.storeId !== store.id) {
      throw new ForbiddenException('You can only delete services from your own store');
    }
    await this.repository.delete(id);
  }

  private mapToOutput(service: ServiceEntity): ServiceOutput {
    return {
      id: service.id,
      title: service.title,
      description: service.description,
      price: Number(service.price),
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl || undefined,
      storeId: service.storeId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}

