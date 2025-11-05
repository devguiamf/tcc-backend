# Backend TCC - Sistema de Agendamento

Backend desenvolvido com NestJS para sistema de agendamento, utilizando MySQL como banco de dados relacional.

## Tecnologias

- **NestJS**: Framework Node.js progressivo
- **TypeORM**: ORM para MySQL
- **MySQL**: Banco de dados MySQL (Docker)
- **TypeScript**: Linguagem de programação
- **class-validator**: Validação de DTOs
- **class-transformer**: Transformação de objetos
- **Docker**: Containerização do banco de dados

## Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Docker e Docker Compose instalados

## Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd backend-tcc
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com as configurações do banco de dados:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=app_user
DB_PASSWORD=app_password
DB_DATABASE=backend_tcc
```

4. Inicie o banco de dados MySQL com Docker:
```bash
docker-compose up -d
```

## Execução

### Desenvolvimento
```bash
npm run start:dev
```

### Produção
```bash
npm run build
npm run start:prod
```

## Estrutura do Projeto

```
src/
├── appointment/          # Módulo de agendamento
│   ├── models/          # Entidades, DTOs e tipos
│   ├── appointment.controller.ts
│   ├── appointment.service.ts
│   ├── appointment.repository.ts
│   └── appointment.module.ts
├── core/                # Módulo core (configurações globais)
│   ├── config/          # Configurações de banco de dados
│   └── core.module.ts
├── shared/              # Módulo compartilhado
│   └── shared.module.ts
├── app.module.ts        # Módulo raiz
└── main.ts              # Arquivo de bootstrap
```

## API Endpoints

### Agendamentos

- `POST /appointments` - Criar novo agendamento
- `GET /appointments` - Listar todos os agendamentos
- `GET /appointments/:id` - Buscar agendamento por ID
- `GET /appointments/range?startDate=&endDate=` - Buscar agendamentos por período
- `PUT /appointments/:id` - Atualizar agendamento
- `DELETE /appointments/:id` - Deletar agendamento
- `GET /appointments/admin/test` - Teste de saúde do módulo

## Configuração do Banco de Dados MySQL

### Iniciar o MySQL com Docker

```bash
docker-compose up -d
```

### Parar o MySQL

```bash
docker-compose down
```

### Parar e remover volumes (dados serão perdidos)

```bash
docker-compose down -v
```

### Ver logs do MySQL

```bash
docker-compose logs -f mysql
```

### Credenciais padrão do MySQL

- **Host**: localhost
- **Porta**: 3306
- **Database**: backend_tcc
- **Username**: app_user
- **Password**: app_password
- **Root Password**: rootpassword

> **Nota**: Altere as senhas em produção no arquivo `docker-compose.yml` e `.env`

## Scripts Disponíveis

- `npm run build` - Compilar o projeto
- `npm run start` - Iniciar aplicação
- `npm run start:dev` - Iniciar em modo desenvolvimento (watch)
- `npm run start:prod` - Iniciar em modo produção
- `npm run lint` - Executar linter
- `npm run test` - Executar testes
- `npm run test:e2e` - Executar testes end-to-end

## Desenvolvimento

O projeto segue os princípios de Clean Architecture e SOLID, com:

- Separação de responsabilidades (Controller, Service, Repository)
- Validação de dados com DTOs
- TypeScript strict mode
- Arquitetura modular do NestJS

## Licença

UNLICENSED

