import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export interface TestDatabaseConfig {
  entities: any[];
  synchronize?: boolean;
  logging?: boolean;
}

@Module({})
export class TestDatabaseModule {
  static forRoot(config: TestDatabaseConfig): DynamicModule {
    process.env.DB_TYPE = 'sqlite';
    const databaseConfig: DataSourceOptions = {
      type: 'sqlite',
      database: ':memory:',
      entities: config.entities,
      synchronize: config.synchronize ?? true,
      logging: config.logging ?? false,
    };

    return {
      module: TestDatabaseModule,
      imports: [TypeOrmModule.forRoot(databaseConfig), TypeOrmModule.forFeature(config.entities)],
      exports: [TypeOrmModule],
    };
  }
}

