import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { FileRepository } from './file.repository';
import { FileEntity } from './models/file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  providers: [FileService, FileRepository],
  exports: [FileService, FileRepository],
})
export class FileModule {}

