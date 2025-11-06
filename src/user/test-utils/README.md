# Test Utils

Utilitários para facilitar a configuração de testes com SQLite em memória.

## TestDatabaseModule

Módulo reutilizável para configurar TypeORM com SQLite em memória nos testes.

### Uso

```typescript
import { TestDatabaseModule } from './test-utils';

const module = await Test.createTestingModule({
  imports: [
    TestDatabaseModule.forRoot({
      entities: [UserEntity],
      synchronize: true,
      logging: false,
    }),
    // outros imports...
  ],
  providers: [UserRepository],
}).compile();
```

## createTestModule

Função helper para criar um módulo de teste com configuração SQLite simplificada.

### Uso

```typescript
import { createTestModule } from './test-utils/create-test-module';

const module = await createTestModule({
  entities: [UserEntity],
  providers: [UserRepository],
  synchronize: true,
  logging: false,
});
```

## Test Helpers

Funções utilitárias para gerenciar o ciclo de vida do banco de dados de teste.

### createTestDatabaseContext

Cria um contexto de teste com DataSource e Module.

```typescript
import { createTestDatabaseContext } from './test-utils';

const context = await createTestDatabaseContext(module);
```

### cleanupTestDatabase

Limpa todas as tabelas do banco de dados de teste.

```typescript
import { cleanupTestDatabase } from './test-utils';

beforeEach(async () => {
  await cleanupTestDatabase(context);
});
```

### closeTestDatabase

Fecha a conexão do banco de dados e o módulo de teste.

```typescript
import { closeTestDatabase } from './test-utils';

afterAll(async () => {
  await closeTestDatabase(context);
});
```

### getRepository

Obtém um repositório TypeORM para uma entidade específica.

```typescript
import { getRepository } from './test-utils';

const userRepository = getRepository<UserEntity>(module, UserEntity);
```

### getDataSource

Obtém a instância do DataSource do módulo de teste.

```typescript
import { getDataSource } from './test-utils';

const dataSource = getDataSource(module);
```

## Exemplo Completo

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { createTestModule, createTestDatabaseContext, cleanupTestDatabase, closeTestDatabase } from './test-utils';
import { UserEntity } from './models/user.entity';
import { UserRepository } from './user.repository';

describe('UserRepository', () => {
  let repository: UserRepository;
  let context: TestDatabaseContext;

  beforeAll(async () => {
    const module = await createTestModule({
      entities: [UserEntity],
      providers: [UserRepository],
    });
    
    context = await createTestDatabaseContext(module);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await closeTestDatabase(context);
  });

  beforeEach(async () => {
    await cleanupTestDatabase(context);
  });

  // seus testes aqui...
});
```

## Vantagens

1. **Reutilização**: Configuração centralizada para todos os testes
2. **Simplicidade**: Menos código boilerplate
3. **Consistência**: Todos os testes usam a mesma configuração
4. **Manutenibilidade**: Mudanças na configuração em um único lugar
5. **Type Safety**: Tipagem completa do TypeScript

