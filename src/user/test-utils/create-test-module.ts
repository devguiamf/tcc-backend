import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { TestDatabaseModule } from './test-database.module';

export interface CreateTestModuleOptions {
  entities: any[];
  providers?: any[];
  controllers?: any[];
  imports?: any[];
  synchronize?: boolean;
  logging?: boolean;
}

export async function createTestModule(
  options: CreateTestModuleOptions,
): Promise<TestingModule> {
  process.env.DB_TYPE = 'sqlite';
  const { entities, providers = [], controllers = [], imports = [], synchronize = true, logging = false } = options;

  const databaseConfig: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    entities,
    synchronize,
    logging,
  };

  return await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(databaseConfig),
      TypeOrmModule.forFeature(entities),
      ...imports,
    ],
    providers,
    controllers,
  }).compile();
}

export async function createTestModuleWithDatabase(
  options: CreateTestModuleOptions,
): Promise<TestingModule> {
  const { entities, providers = [], controllers = [], imports = [], synchronize = true, logging = false } = options;

  return await Test.createTestingModule({
    imports: [
      TestDatabaseModule.forRoot({
        entities,
        synchronize,
        logging,
      }),
      ...imports,
    ],
    providers,
    controllers,
  }).compile();
}

