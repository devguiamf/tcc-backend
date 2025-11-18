import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { FileModule } from './types/file.types';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  module: FileModule;

  @Column({ type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @CreateDateColumn()
  createdAt: Date;
}

