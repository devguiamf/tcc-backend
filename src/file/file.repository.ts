import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './models/file.entity';
import { FileModule } from './models/types/file.types';

@Injectable()
export class FileRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>,
  ) {}

  async create(input: {
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    module: FileModule;
    entityId: string;
    filePath: string;
  }): Promise<FileEntity> {
    const file = this.repository.create(input);
    return await this.repository.save(file);
  }

  async findById(id: string): Promise<FileEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByModuleAndEntityId(
    module: FileModule,
    entityId: string,
  ): Promise<FileEntity[]> {
    return await this.repository.find({
      where: { module, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteByModuleAndEntityId(
    module: FileModule,
    entityId: string,
  ): Promise<void> {
    await this.repository.delete({ module, entityId });
  }
}

