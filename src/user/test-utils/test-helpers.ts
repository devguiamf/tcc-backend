import { TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

export interface TestDatabaseContext {
  dataSource: DataSource;
  module: TestingModule;
}

export async function createTestDatabaseContext(
  module: TestingModule,
): Promise<TestDatabaseContext> {
  const dataSource = module.get<DataSource>(DataSource);
  return {
    dataSource,
    module,
  };
}

export async function cleanupTestDatabase(context: TestDatabaseContext): Promise<void> {
  const { dataSource } = context;
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
}

export async function closeTestDatabase(context: TestDatabaseContext): Promise<void> {
  const { dataSource, module } = context;
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  await module.close();
}

export function getRepository<T>(
  module: TestingModule,
  entity: new () => T,
): Repository<T> {
  return module.get<Repository<T>>(getRepositoryToken(entity));
}

export function getDataSource(module: TestingModule): DataSource {
  return module.get<DataSource>(DataSource);
}

