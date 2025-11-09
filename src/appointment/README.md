# Appointment Module - TODO

## Visão Geral

Este documento descreve o escopo e as tarefas necessárias para implementar o módulo de agendamento (appointment) do sistema. O módulo permite que clientes autenticados agendem serviços em lojas, com cálculo automático de horários disponíveis baseado no funcionamento da loja, intervalo de agendamento e agendamentos existentes.

## Análise do Escopo

### Entidades Relacionadas

- **UserEntity**: Representa usuários do sistema (CLIENTE ou PRESTADOR)
- **StoreEntity**: Representa lojas com:
  - `workingHours`: Array com horários de funcionamento por dia da semana
  - `appointmentInterval`: Intervalo mínimo entre agendamentos (5, 10, 15 ou 30 minutos)
- **ServiceEntity**: Representa serviços oferecidos pelas lojas com:
  - `durationMinutes`: Duração do serviço em minutos
  - `storeId`: Relação com a loja

### Requisitos Funcionais

1. **Autenticação**: Apenas usuários autenticados (tipo CLIENTE) podem criar agendamentos
2. **Seleção**: Cliente deve selecionar:
   - Loja (storeId)
   - Serviço (serviceId)
   - Horário (calculado automaticamente ou fornecido pelo cliente)
3. **Cálculo de Horários**: Sistema deve calcular horários disponíveis considerando:
   - Horário de funcionamento da loja (`workingHours`)
   - Intervalo de agendamento da loja (`appointmentInterval`)
   - Duração do serviço (`durationMinutes`)
   - Agendamentos já existentes (evitar conflitos)

### Regras de Negócio

1. Cliente só pode agendar para si mesmo
2. Horário deve estar dentro do horário de funcionamento da loja
3. Não pode haver sobreposição de agendamentos para a mesma loja
4. Deve respeitar o `appointmentInterval` da loja entre agendamentos
5. Deve considerar a duração do serviço ao verificar disponibilidade
6. Agendamentos passados não podem ser criados ou modificados

## Estrutura do Módulo

```
src/appointment/
├── models/
│   ├── dto/
│   │   ├── create-appointment.dto.ts
│   │   └── update-appointment.dto.ts
│   ├── types/
│   │   └── appointment.types.ts
│   └── appointment.entity.ts
├── appointment.controller.ts
├── appointment.controller.spec.ts
├── appointment.service.ts
├── appointment.service.spec.ts
├── appointment.repository.ts
├── appointment.repository.spec.ts
├── appointment.module.ts
├── appointment.http
└── README.md
```

## Tarefas de Implementação

### 1. Modelos e Tipos

#### 1.1. Entity (`appointment.entity.ts`)
- [ ] Criar entidade `AppointmentEntity` com:
  - `id`: UUID (Primary Key)
  - `userId`: UUID (Foreign Key para UserEntity)
  - `storeId`: UUID (Foreign Key para StoreEntity)
  - `serviceId`: UUID (Foreign Key para ServiceEntity)
  - `appointmentDate`: DateTime (data e hora do agendamento)
  - `status`: Enum (PENDING, CONFIRMED, COMPLETED, CANCELLED)
  - `notes`: string opcional (observações do cliente)
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - Relações ManyToOne com User, Store e Service

#### 1.2. Types (`appointment.types.ts`)
- [ ] Criar enum `AppointmentStatus`:
  - `PENDING`: Agendamento pendente
  - `CONFIRMED`: Agendamento confirmado
  - `COMPLETED`: Serviço realizado
  - `CANCELLED`: Agendamento cancelado
- [ ] Criar interface `AppointmentOutput` com todos os campos da entidade
- [ ] Criar interface `AvailableTimeSlot`:
  - `startTime`: string (HH:mm)
  - `endTime`: string (HH:mm)
  - `date`: string (YYYY-MM-DD)

#### 1.3. DTOs

##### 1.3.1. Create Appointment DTO (`create-appointment.dto.ts`)
- [ ] `storeId`: UUID (obrigatório, deve existir)
- [ ] `serviceId`: UUID (obrigatório, deve existir e pertencer à loja)
- [ ] `appointmentDate`: DateTime (obrigatório, formato ISO)
- [ ] `notes`: string (opcional, máximo 500 caracteres)
- [ ] Validações:
  - `storeId` deve ser um UUID válido
  - `serviceId` deve ser um UUID válido
  - `appointmentDate` deve ser uma data futura
  - `appointmentDate` deve estar dentro do horário de funcionamento
  - `appointmentDate` não deve conflitar com outros agendamentos

##### 1.3.2. Update Appointment DTO (`update-appointment.dto.ts`)
- [ ] `appointmentDate`: DateTime (opcional)
- [ ] `status`: AppointmentStatus (opcional)
- [ ] `notes`: string (opcional)
- [ ] Validações:
  - Se `appointmentDate` for fornecido, deve ser futura
  - Apenas cliente pode atualizar seus próprios agendamentos
  - Status só pode ser alterado para valores válidos

### 2. Repository (`appointment.repository.ts`)

- [ ] `create(input: CreateAppointmentDto, userId: string)`: Criar agendamento
- [ ] `findById(id: string)`: Buscar por ID com relações
- [ ] `findByUserId(userId: string)`: Buscar agendamentos do usuário
- [ ] `findByStoreId(storeId: string)`: Buscar agendamentos da loja
- [ ] `findByServiceId(serviceId: string)`: Buscar agendamentos do serviço
- [ ] `findByDateRange(storeId: string, startDate: Date, endDate: Date)`: Buscar agendamentos em um período
- [ ] `findConflictingAppointments(storeId: string, startTime: Date, endTime: Date, excludeId?: string)`: Buscar conflitos
- [ ] `update(id: string, input: UpdateAppointmentDto)`: Atualizar agendamento
- [ ] `delete(id: string)`: Deletar agendamento

### 3. Service (`appointment.service.ts`)

#### 3.1. Métodos CRUD
- [ ] `create(input: CreateAppointmentDto, userId: string)`: Criar agendamento
  - Validar que usuário é do tipo CLIENTE
  - Validar que loja existe
  - Validar que serviço existe e pertence à loja
  - Validar horário disponível
  - Criar agendamento com status PENDING
- [ ] `findAll()`: Listar todos os agendamentos (opcional, pode ser removido se não necessário)
- [ ] `findById(id: string)`: Buscar por ID
- [ ] `findByUserId(userId: string)`: Buscar agendamentos do usuário
- [ ] `findByStoreId(storeId: string)`: Buscar agendamentos da loja
- [ ] `findAvailableTimeSlots(storeId: string, serviceId: string, date: string)`: Calcular horários disponíveis
- [ ] `update(id: string, input: UpdateAppointmentDto, userId: string)`: Atualizar agendamento
  - Validar que usuário é dono do agendamento
  - Validar novo horário se fornecido
- [ ] `cancel(id: string, userId: string)`: Cancelar agendamento
- [ ] `delete(id: string, userId: string)`: Deletar agendamento

#### 3.2. Métodos Auxiliares (Privados)
- [ ] `validateAppointmentTime(storeId: string, serviceId: string, appointmentDate: Date)`: Validar horário
  - Verificar se está dentro do horário de funcionamento
  - Verificar se não conflita com outros agendamentos
  - Considerar `appointmentInterval` e `durationMinutes`
- [ ] `calculateAvailableTimeSlots(store: StoreEntity, service: ServiceEntity, date: Date, existingAppointments: AppointmentEntity[])`: Calcular slots disponíveis
  - Gerar slots baseados em `workingHours` do dia
  - Aplicar `appointmentInterval`
  - Considerar `durationMinutes` do serviço
  - Remover slots conflitantes
- [ ] `isWithinWorkingHours(workingHours: WorkingHours[], appointmentDate: Date)`: Verificar se está no horário de funcionamento
- [ ] `hasConflict(startTime: Date, endTime: Date, existingAppointments: AppointmentEntity[])`: Verificar conflitos
- [ ] `mapToOutput(appointment: AppointmentEntity)`: Mapear entidade para output

### 4. Controller (`appointment.controller.ts`)

- [ ] `POST /appointments`: Criar agendamento
  - Usar `@UseGuards(JwtAuthGuard)`
  - Usar `@CurrentUser()` para pegar userId
  - Retornar `AppointmentOutput`
- [ ] `GET /appointments`: Listar agendamentos do usuário autenticado
  - Usar `@UseGuards(JwtAuthGuard)`
  - Usar `@CurrentUser()` para filtrar
- [ ] `GET /appointments/:id`: Buscar agendamento por ID
  - Usar `@UseGuards(JwtAuthGuard)`
  - Validar que usuário é dono ou prestador da loja
- [ ] `GET /appointments/store/:storeId`: Buscar agendamentos da loja
  - Usar `@UseGuards(JwtAuthGuard)`
  - Validar que usuário é dono da loja
- [ ] `GET /appointments/available-slots/:storeId/:serviceId`: Buscar horários disponíveis
  - Query param: `date` (YYYY-MM-DD)
  - Pode ser público ou autenticado
- [ ] `PUT /appointments/:id`: Atualizar agendamento
  - Usar `@UseGuards(JwtAuthGuard)`
  - Validar que usuário é dono
- [ ] `DELETE /appointments/:id`: Cancelar/Deletar agendamento
  - Usar `@UseGuards(JwtAuthGuard)`
  - Validar que usuário é dono
- [ ] `GET /appointments/admin/test`: Endpoint de teste

### 5. Module (`appointment.module.ts`)

- [ ] Importar `TypeOrmModule.forFeature([AppointmentEntity])`
- [ ] Importar `StoreModule` (para acessar StoreRepository)
- [ ] Importar `ServiceModule` (para acessar ServiceRepository)
- [ ] Importar `UserModule` (para acessar UserRepository, se necessário)
- [ ] Registrar `AppointmentController`
- [ ] Registrar `AppointmentService` e `AppointmentRepository`
- [ ] Exportar `AppointmentService` e `AppointmentRepository` (se necessário)

### 6. Integração com AppModule

- [ ] Adicionar `AppointmentModule` aos imports de `app.module.ts`

### 7. Migração

- [ ] Criar migration para tabela `appointments`:
  - `id`: UUID, Primary Key
  - `userId`: UUID, Foreign Key para `users.id`
  - `storeId`: UUID, Foreign Key para `stores.id`
  - `serviceId`: UUID, Foreign Key para `services.id`
  - `appointmentDate`: DateTime
  - `status`: Enum (PENDING, CONFIRMED, COMPLETED, CANCELLED)
  - `notes`: VARCHAR(500), nullable
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - Índices:
    - `idx_appointments_user_id` em `userId`
    - `idx_appointments_store_id` em `storeId`
    - `idx_appointments_service_id` em `serviceId`
    - `idx_appointments_date` em `appointmentDate`
    - `idx_appointments_store_date` em `storeId` e `appointmentDate` (composto)

### 8. Testes

#### 8.1. Repository Tests (`appointment.repository.spec.ts`)
- [ ] Testar `create`
- [ ] Testar `findById`
- [ ] Testar `findByUserId`
- [ ] Testar `findByStoreId`
- [ ] Testar `findByServiceId`
- [ ] Testar `findByDateRange`
- [ ] Testar `findConflictingAppointments`
- [ ] Testar `update`
- [ ] Testar `delete`

#### 8.2. Service Tests (`appointment.service.spec.ts`)
- [ ] Testar `create` com sucesso
- [ ] Testar `create` com usuário não CLIENTE
- [ ] Testar `create` com loja inexistente
- [ ] Testar `create` com serviço inexistente
- [ ] Testar `create` com serviço de outra loja
- [ ] Testar `create` com horário fora do funcionamento
- [ ] Testar `create` com horário conflitante
- [ ] Testar `findById`
- [ ] Testar `findByUserId`
- [ ] Testar `findByStoreId`
- [ ] Testar `findAvailableTimeSlots`
- [ ] Testar `update`
- [ ] Testar `cancel`
- [ ] Testar `delete`
- [ ] Testar validações de horário

#### 8.3. Controller Tests (`appointment.controller.spec.ts`)
- [ ] Testar `POST /appointments`
- [ ] Testar `GET /appointments`
- [ ] Testar `GET /appointments/:id`
- [ ] Testar `GET /appointments/store/:storeId`
- [ ] Testar `GET /appointments/available-slots/:storeId/:serviceId`
- [ ] Testar `PUT /appointments/:id`
- [ ] Testar `DELETE /appointments/:id`
- [ ] Testar autenticação em todos os endpoints protegidos
- [ ] Testar autorização (usuário só pode ver/editar seus próprios agendamentos)

### 9. Documentação HTTP (`appointment.http`)

- [ ] Criar arquivo com exemplos de requisições:
  - POST criar agendamento
  - GET listar agendamentos do usuário
  - GET buscar por ID
  - GET buscar agendamentos da loja
  - GET buscar horários disponíveis
  - PUT atualizar agendamento
  - DELETE cancelar agendamento

### 10. README (`README.md`)

- [ ] Documentar endpoints
- [ ] Documentar regras de negócio
- [ ] Documentar exemplos de uso
- [ ] Documentar cálculos de horários disponíveis

## Algoritmo de Cálculo de Horários Disponíveis

### Pseudocódigo

```
1. Buscar loja por storeId
2. Buscar serviço por serviceId
3. Verificar se serviço pertence à loja
4. Buscar workingHours do dia da semana da data solicitada
5. Se loja não está aberta nesse dia, retornar array vazio
6. Buscar agendamentos existentes para a loja na data solicitada
7. Gerar slots de tempo:
   a. Começar do openTime
   b. Criar slot de durationMinutes
   c. Avançar appointmentInterval minutos
   d. Repetir até closeTime
8. Para cada slot gerado:
   a. Verificar se não conflita com agendamentos existentes
   b. Verificar se está dentro do horário de funcionamento
   c. Se válido, adicionar à lista de disponíveis
9. Retornar lista de slots disponíveis
```

## Considerações de Implementação

1. **Timezone**: Considerar timezone do servidor ou adicionar suporte a timezone
2. **Performance**: Índices compostos na tabela para otimizar consultas por loja e data
3. **Validação de Conflitos**: Considerar margem de segurança entre agendamentos (ex: 5 minutos entre fim de um e início de outro)
4. **Status de Agendamento**: Implementar fluxo de estados (PENDING → CONFIRMED → COMPLETED)
5. **Notificações**: Considerar futura implementação de notificações (email/SMS) para confirmação e lembretes
6. **Histórico**: Manter histórico de alterações (pode ser implementado futuramente com auditoria)

## Dependências

- `@nestjs/common`
- `@nestjs/typeorm`
- `typeorm`
- `class-validator`
- `class-transformer`
- Módulos: `StoreModule`, `ServiceModule`, `UserModule`, `CoreModule`

## Ordem de Implementação Sugerida

1. Types e Entity
2. Repository e testes do Repository
3. Service e testes do Service (focar no cálculo de horários)
4. DTOs
5. Controller e testes do Controller
6. Module e integração
7. Migração
8. Documentação HTTP
9. README final

