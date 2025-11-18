import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, unlinkSync, createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { FileRepository } from './file.repository';
import { FileModule, FileOutput } from './models/types/file.types';
import { FileEntity } from './models/file.entity';

@Injectable()
export class FileService {
  private readonly uploadPath: string;

  constructor(
    private readonly repository: FileRepository,
    private readonly configService: ConfigService,
  ) {
    this.uploadPath =
      this.configService.get<string>('UPLOAD_PATH') || './uploads';
    this.ensureUploadDirectoryExists();
  }

  async upload(
    file: Express.Multer.File,
    module: FileModule,
    entityId: string,
  ): Promise<FileOutput> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const fileName = this.generateFileName(file.originalname);
    const modulePath = join(this.uploadPath, module);
    this.ensureDirectoryExists(modulePath);
    const filePath = join(modulePath, fileName);
    await writeFile(filePath, file.buffer);
    const fileEntity = await this.repository.create({
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      module,
      entityId,
      filePath,
    });
    return this.mapToOutput(fileEntity);
  }

  async findById(id: string): Promise<FileOutput> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return this.mapToOutput(file);
  }

  async findByModuleAndEntityId(
    module: FileModule,
    entityId: string,
  ): Promise<FileOutput[]> {
    const files = await this.repository.findByModuleAndEntityId(module, entityId);
    return files.map((file) => this.mapToOutput(file));
  }

  async getFileStream(id: string): Promise<{
    stream: NodeJS.ReadableStream;
    mimeType: string;
    fileName: string;
  }> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (!existsSync(file.filePath)) {
      throw new NotFoundException('File not found on disk');
    }
    const stream = createReadStream(file.filePath);
    return {
      stream,
      mimeType: file.mimeType,
      fileName: file.originalName,
    };
  }

  async delete(id: string): Promise<void> {
    const file = await this.repository.findById(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (existsSync(file.filePath)) {
      unlinkSync(file.filePath);
    }
    await this.repository.delete(id);
  }

  async deleteByModuleAndEntityId(
    module: FileModule,
    entityId: string,
  ): Promise<void> {
    const files = await this.repository.findByModuleAndEntityId(module, entityId);
    for (const file of files) {
      if (existsSync(file.filePath)) {
        unlinkSync(file.filePath);
      }
    }
    await this.repository.deleteByModuleAndEntityId(module, entityId);
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const nameWithoutExtension = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9]/g, '_');
    return `${nameWithoutExtension}_${timestamp}_${randomString}.${extension}`;
  }

  private ensureUploadDirectoryExists(): void {
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  private ensureDirectoryExists(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  }

  private mapToOutput(file: FileEntity): FileOutput {
    const baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    return {
      id: file.id,
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      module: file.module,
      entityId: file.entityId,
      filePath: file.filePath,
      url: `${baseUrl}/files/${file.id}/download`,
      createdAt: file.createdAt,
    };
  }
}

