import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { existsSync } from 'fs';
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
        imageUrl: uploadedFile.filePath,
      });
      return await this.mapToOutput(updatedStore);
    }
    return await this.mapToOutput(store);
  }

  async findAll(searchTerm?: string): Promise<StoreOutput[]> {
    const stores = await this.repository.findAll(searchTerm);
    const outputs = await Promise.all(
      stores.map((store) => this.mapToOutput(store)),
    );
    return outputs;
  }

  async findById(id: string): Promise<StoreOutput> {
    const store = await this.repository.findById(id);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    return await this.mapToOutput(store);
  }

  async findByUserId(userId: string): Promise<StoreOutput> {
    const store = await this.repository.findByUserId(userId);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado para este usuário');
    }
    return await this.mapToOutput(store);
  }

  async update(
    id: string,
    input: UpdateStoreDto,
    file?: Express.Multer.File,
  ): Promise<StoreOutput> {
    const existingStore = await this.repository.findById(id);
    if (!existingStore) {
      throw new NotFoundException('Estabelecimento não encontrado');
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
        imageUrl: uploadedFile.filePath,
      });
      return await this.mapToOutput(finalStore);
    }
    return await this.mapToOutput(store);
  }

  async delete(id: string): Promise<void> {
    const store = await this.repository.findById(id);
    if (!store) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    await this.fileService.deleteByModuleAndEntityId(FileModule.STORE, id);
    await this.repository.delete(id);
  }

  private async validateStoreData(input: CreateStoreDto): Promise<void> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new BadRequestException('Apenas usuários do tipo PRESTADOR podem ter um estabelecimento');
    }
    const existingStore = await this.repository.findByUserId(input.userId);
    if (existingStore) {
      throw new ConflictException('Usuário já possui um estabelecimento');
    }
    this.validateWorkingHours(input.workingHours);
  }

  private async validateUserCanHaveStore(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (user.type !== UserType.PRESTADOR) {
      throw new BadRequestException('Apenas usuários do tipo PRESTADOR podem ter um estabelecimento');
    }
    const existingStore = await this.repository.findByUserId(userId);
    if (existingStore) {
      throw new ConflictException('Usuário já possui um estabelecimento');
    }
  }

  private validateWorkingHours(workingHours: Array<{ dayOfWeek: number; isOpen: boolean; openTime?: string; closeTime?: string }>): void {
    if (workingHours.length !== 7) {
      throw new BadRequestException('Horário de funcionamento deve incluir todos os 7 dias da semana');
    }
    const daysOfWeek = new Set(workingHours.map((wh) => wh.dayOfWeek));
    if (daysOfWeek.size !== 7) {
      throw new BadRequestException('Cada dia da semana deve ser único');
    }
    for (const wh of workingHours) {
      if (wh.isOpen && (!wh.openTime || !wh.closeTime)) {
        throw new BadRequestException('Horário de abertura e fechamento são obrigatórios quando o estabelecimento está aberto');
      }
    }
  }

  private async mapToOutput(store: StoreEntity): Promise<StoreOutput> {
    let imageBase64: string | undefined;
    if (store.imageUrl) {
      if (existsSync(store.imageUrl)) {
        const base64 = await this.fileService.getFileBase64(store.imageUrl);
        if (base64) {
          const files = await this.fileService.findByModuleAndEntityId(
            FileModule.STORE,
            store.id,
          );
          const mimeType = files.length > 0 ? files[0].mimeType : 'image/jpeg';
          imageBase64 = `data:${mimeType};base64,${base64}`;
        }
      }
    }
    return {
      id: store.id,
      name: store.name,
      userId: store.userId,
      workingHours: store.workingHours,
      location: store.location,
      appointmentInterval: store.appointmentInterval,
      imageUrl: store.imageUrl || undefined,
      imageBase64,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }
}

