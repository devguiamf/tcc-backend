import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreEntity } from './models/store.entity';
import { StoreRepository } from './store.repository';
import { UserModule } from '../user/user.module';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([StoreEntity]), UserModule, FileModule],
  controllers: [StoreController],
  providers: [StoreService, StoreRepository],
  exports: [StoreService, StoreRepository],
})
export class StoreModule {}

