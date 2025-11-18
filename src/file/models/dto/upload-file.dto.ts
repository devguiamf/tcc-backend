import { IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { FileModule } from '../types/file.types';

export class UploadFileDto {
  @IsEnum(FileModule)
  @IsNotEmpty()
  module: FileModule;

  @IsUUID()
  @IsNotEmpty()
  entityId: string;
}

