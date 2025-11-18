import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { ServiceRepository } from './service.repository';
import { StoreRepository } from '../store/store.repository';
import { FileService } from '../file/file.service';
import { CreateServiceDto } from './models/dto/create-service.dto';
import { UpdateServiceDto } from './models/dto/update-service.dto';
import { ServiceOutput } from './models/types/service.types';
import { ServiceEntity } from './models/service.entity';
import { FileModule } from '../file/models/types/file.types';

@Injectable()
export class ServiceService {
  constructor(
    private readonly repository: ServiceRepository,
    private readonly storeRepository: StoreRepository,
    private readonly fileService: FileService,
  ) {}

  async create(
    input: CreateServiceDto,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<ServiceOutput> {
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }
    const service = await this.repository.create(input, store.id);
    if (file) {
      const uploadedFile = await this.fileService.upload(
        file,
        FileModule.SERVICE,
        service.id,
      );
      const updatedService = await this.repository.update(service.id, {
        imageUrl: uploadedFile.filePath,
      });
      return await this.mapToOutput(updatedService);
    }
    return await this.mapToOutput(service);
  }

  async findAll(): Promise<ServiceOutput[]> {
    const services = await this.repository.findAll();
    const outputs = await Promise.all(
      services.map((service) => this.mapToOutput(service)),
    );
    return outputs;
  }

  async findById(id: string): Promise<ServiceOutput> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return await this.mapToOutput(service);
  }

  async findByStoreId(storeId: string): Promise<ServiceOutput[]> {
    const services = await this.repository.findByStoreId(storeId);
    const outputs = await Promise.all(
      services.map((service) => this.mapToOutput(service)),
    );
    return outputs;
  }

  async findByUserId(userId: string): Promise<ServiceOutput[]> {
    const store = await this.storeRepository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }
    const services = await this.repository.findByStoreId(store.id);
    const outputs = await Promise.all(
      services.map((service) => this.mapToOutput(service)),
    );
    return outputs;
  }

  async update(
    id: string,
    input: UpdateServiceDto,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<ServiceOutput> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    const store = await this.storeRepository.findByUserId(userId);
    if (!store || service.storeId !== store.id) {
      throw new ForbiddenException('You can only update services from your own store');
    }
    const updatedService = await this.repository.update(id, input);
    if (file) {
      const uploadedFile = await this.fileService.upload(
        file,
        FileModule.SERVICE,
        id,
      );
      const finalService = await this.repository.update(id, {
        imageUrl: uploadedFile.filePath,
      });
      return await this.mapToOutput(finalService);
    }
    return await this.mapToOutput(updatedService);
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
    await this.fileService.deleteByModuleAndEntityId(FileModule.SERVICE, id);
    await this.repository.delete(id);
  }

  private async mapToOutput(service: ServiceEntity): Promise<ServiceOutput> {
    let imageBase64: string | undefined;
    if (service.imageUrl) {
      if (existsSync(service.imageUrl)) {
        const base64 = await this.fileService.getFileBase64(service.imageUrl);
        if (base64) {
          const files = await this.fileService.findByModuleAndEntityId(
            FileModule.SERVICE,
            service.id,
          );
          const mimeType = files.length > 0 ? files[0].mimeType : 'image/jpeg';
          imageBase64 = `data:${mimeType};base64,${base64}`;
        }
      }
    }
    return {
      id: service.id,
      title: service.title,
      description: service.description,
      price: Number(service.price),
      durationMinutes: service.durationMinutes,
      imageUrl: service.imageUrl || undefined,
      imageBase64,
      storeId: service.storeId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}

