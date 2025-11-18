import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { StoreRepository } from './store.repository';
import { UserRepository } from '../user/user.repository';
import { FileService } from '../file/file.service';
import { CreateStoreDto } from './models/dto/create-store.dto';
import { UpdateStoreDto } from './models/dto/update-store.dto';
import { StoreOutput } from './models/types/store.types';
import { StoreEntity } from './models/store.entity';
import { UserType } from '../user/models/types/user.types';
import { FileModule } from '../file/models/types/file.types';

@Injectable()
export class StoreService {
  constructor(
    private readonly repository: StoreRepository,
    private readonly userRepository: UserRepository,
    private readonly fileService: FileService,
  ) {}

  async create(input: CreateStoreDto, file?: Express.Multer.File): Promise<StoreOutput> {
    await this.validateStoreData(input);
    const store = await this.repository.create(input);
    if (file) {
      const uploadedFile = await this.fileService.upload(
        file,
        FileModule.STORE,
        store.id,
      );
      const updatedStore = await this.repository.update(store.id, {
        imageUrl: uploadedFile.url,
      });
      return this.mapToOutput(updatedStore);
    }
    return this.mapToOutput(store);
  }

  async findAll(): Promise<StoreOutput[]> {
    const stores = await this.repository.findAll();
    return stores.map((store) => this.mapToOutput(store));
  }

  async findById(id: string): Promise<StoreOutput> {
    const store = await this.repository.findById(id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return this.mapToOutput(store);
  }

  async findByUserId(userId: string): Promise<StoreOutput> {
    const store = await this.repository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }
    return this.mapToOutput(store);
  }

  async update(
    id: string,
    input: UpdateStoreDto,
    file?: Express.Multer.File,
  ): Promise<StoreOutput> {
    const existingStore = await this.repository.findById(id);
    if (!existingStore) {
      throw new NotFoundException('Store not found');
    }
    if (input.userId && input.userId !== existingStore.userId) {
      await this.validateUserCanHaveStore(input.userId);
    }
    const store = await this.repository.update(id, input);
    if (file) {
      const uploadedFile = await this.fileService.upload(
        file,
        FileModule.STORE,
        id,
      );
      const finalStore = await this.repository.update(id, {
        imageUrl: uploadedFile.url,
      });
      return this.mapToOutput(finalStore);
    }
    return this.mapToOutput(store);
  }

  async delete(id: string): Promise<void> {
    const store = await this.repository.findById(id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    await this.fileService.deleteByModuleAndEntityId(FileModule.STORE, id);
    await this.repository.delete(id);
  }

  async uploadImage(
    file: Express.Multer.File,
    storeId: string,
  ): Promise<StoreOutput> {
    const store = await this.repository.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    const uploadedFile = await this.fileService.upload(
      file,
      FileModule.STORE,
      storeId,
    );
    const updatedStore = await this.repository.update(storeId, {
      imageUrl: uploadedFile.url,
    });
    return this.mapToOutput(updatedStore);
  }

  private async validateStoreData(input: CreateStoreDto): Promise<void> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new BadRequestException('Only users of type PRESTADOR can have a store');
    }
    const existingStore = await this.repository.findByUserId(input.userId);
    if (existingStore) {
      throw new ConflictException('User already has a store');
    }
    this.validateWorkingHours(input.workingHours);
  }

  private async validateUserCanHaveStore(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new BadRequestException('Only users of type PRESTADOR can have a store');
    }
    const existingStore = await this.repository.findByUserId(userId);
    if (existingStore) {
      throw new ConflictException('User already has a store');
    }
  }

  private validateWorkingHours(workingHours: Array<{ dayOfWeek: number; isOpen: boolean; openTime?: string; closeTime?: string }>): void {
    if (workingHours.length !== 7) {
      throw new BadRequestException('Working hours must include all 7 days of the week');
    }
    const daysOfWeek = new Set(workingHours.map((wh) => wh.dayOfWeek));
    if (daysOfWeek.size !== 7) {
      throw new BadRequestException('Each day of the week must be unique');
    }
    for (const wh of workingHours) {
      if (wh.isOpen && (!wh.openTime || !wh.closeTime)) {
        throw new BadRequestException('Open time and close time are required when store is open');
      }
    }
  }

  private mapToOutput(store: StoreEntity): StoreOutput {
    return {
      id: store.id,
      name: store.name,
      userId: store.userId,
      workingHours: store.workingHours,
      location: store.location,
      appointmentInterval: store.appointmentInterval,
      imageUrl: store.imageUrl || undefined,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }
}

