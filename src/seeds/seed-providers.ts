import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../user/models/user.entity';
import { StoreEntity } from '../store/models/store.entity';
import { ServiceEntity } from '../service/models/service.entity';
import { AppointmentEntity } from '../appointment/models/appointment.entity';
import { UserType } from '../user/models/types/user.types';
import {
  WorkingHours,
  Location,
  AppointmentInterval,
} from '../store/models/types/store.types';
import { AppointmentStatus } from '../appointment/models/types/appointment.types';

config();

interface ProviderData {
  user: {
    name: string;
    email: string;
    password: string;
    cpf: string;
    phone: string;
  };
  store: {
    name: string;
    location: Location;
    appointmentInterval: AppointmentInterval;
  };
  services: Array<{
    title: string;
    description: string;
    price: number;
    durationMinutes: number;
  }>;
}

const DEFAULT_WORKING_HOURS: WorkingHours[] = [
  { dayOfWeek: 0, isOpen: false },
  { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '18:00' },
  { dayOfWeek: 6, isOpen: true, openTime: '09:00', closeTime: '14:00' },
];

// 5 Prestadores - um de cada ramo
const PROVIDERS_DATA: ProviderData[] = [
  // ==================== BARBEARIA ====================
  {
    user: {
      name: 'Carlos Silva',
      email: 'carlos.barbearia@email.com',
      password: 'senha123',
      cpf: '11122233344',
      phone: '11999990001',
    },
    store: {
      name: 'Barbearia do Carlos',
      location: {
        street: 'Rua das Flores',
        number: '123',
        complement: 'Loja A',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01001-000',
        latitude: -23.5505,
        longitude: -46.6333,
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    },
    services: [
      {
        title: 'Corte Masculino',
        description: 'Corte moderno masculino com máquina e tesoura, inclui lavagem.',
        price: 45.0,
        durationMinutes: 30,
      },
      {
        title: 'Barba Completa',
        description: 'Aparar e modelar barba com navalha, toalha quente e balm.',
        price: 35.0,
        durationMinutes: 30,
      },
      {
        title: 'Corte + Barba',
        description: 'Combo completo: corte masculino e barba modelada.',
        price: 70.0,
        durationMinutes: 60,
      },
      {
        title: 'Degradê',
        description: 'Corte estilo degradê (fade) com acabamento perfeito.',
        price: 55.0,
        durationMinutes: 45,
      },
      {
        title: 'Pigmentação de Barba',
        description: 'Aplicação de pigmento para preencher falhas na barba.',
        price: 80.0,
        durationMinutes: 45,
      },
    ],
  },

  // ==================== PODOLOGIA ====================
  {
    user: {
      name: 'Ana Paula Costa',
      email: 'ana.podologia@email.com',
      password: 'senha123',
      cpf: '22233344455',
      phone: '11999990002',
    },
    store: {
      name: 'Clínica de Podologia Ana Paula',
      location: {
        street: 'Rua Augusta',
        number: '800',
        complement: 'Sala 501',
        neighborhood: 'Consolação',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01304-001',
        latitude: -23.5537,
        longitude: -46.6566,
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    },
    services: [
      {
        title: 'Tratamento de Unha Encravada',
        description: 'Remoção e tratamento completo de unha encravada com técnica especializada.',
        price: 120.0,
        durationMinutes: 60,
      },
      {
        title: 'Podologia Básica',
        description: 'Corte, lixamento e hidratação das unhas dos pés e remoção de calosidades.',
        price: 80.0,
        durationMinutes: 45,
      },
      {
        title: 'Tratamento de Micose',
        description: 'Avaliação e tratamento completo para micose nas unhas.',
        price: 100.0,
        durationMinutes: 45,
      },
      {
        title: 'Reflexologia Podal',
        description: 'Massagem terapêutica nos pés para relaxamento e bem-estar.',
        price: 90.0,
        durationMinutes: 50,
      },
      {
        title: 'Órtese Ungueal',
        description: 'Aplicação de órtese para correção do formato da unha encravada.',
        price: 150.0,
        durationMinutes: 60,
      },
    ],
  },

  // ==================== FISIOTERAPIA ====================
  {
    user: {
      name: 'Dr. Marcos Santos',
      email: 'marcos.fisio@email.com',
      password: 'senha123',
      cpf: '33344455566',
      phone: '11999990003',
    },
    store: {
      name: 'FisioVida Clínica',
      location: {
        street: 'Rua Vergueiro',
        number: '1200',
        complement: 'Conjunto 45',
        neighborhood: 'Vila Mariana',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '04101-000',
        latitude: -23.5788,
        longitude: -46.6394,
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    },
    services: [
      {
        title: 'Fisioterapia Ortopédica',
        description: 'Tratamento para lesões musculares, articulares e ósseas.',
        price: 150.0,
        durationMinutes: 60,
      },
      {
        title: 'RPG - Reeducação Postural',
        description: 'Sessão de reeducação postural global para correção da postura.',
        price: 180.0,
        durationMinutes: 60,
      },
      {
        title: 'Pilates Clínico',
        description: 'Exercícios de pilates adaptados para reabilitação.',
        price: 120.0,
        durationMinutes: 50,
      },
      {
        title: 'Terapia Manual',
        description: 'Técnicas de manipulação para alívio de dor e melhora da mobilidade.',
        price: 140.0,
        durationMinutes: 45,
      },
      {
        title: 'Acupuntura',
        description: 'Sessão de acupuntura para tratamento de dores e inflamações.',
        price: 130.0,
        durationMinutes: 45,
      },
    ],
  },

  // ==================== YOGA ====================
  {
    user: {
      name: 'Maya Patel',
      email: 'maya.yoga@email.com',
      password: 'senha123',
      cpf: '44455566677',
      phone: '11999990004',
    },
    store: {
      name: 'Shanti Yoga Studio',
      location: {
        street: 'Rua Harmonia',
        number: '77',
        neighborhood: 'Vila Madalena',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '05435-000',
        latitude: -23.5535,
        longitude: -46.6901,
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    },
    services: [
      {
        title: 'Hatha Yoga',
        description: 'Aula tradicional de yoga com posturas clássicas e respiração.',
        price: 60.0,
        durationMinutes: 60,
      },
      {
        title: 'Vinyasa Flow',
        description: 'Sequência dinâmica de posturas sincronizadas com respiração.',
        price: 70.0,
        durationMinutes: 60,
      },
      {
        title: 'Yoga para Iniciantes',
        description: 'Aula introdutória para quem está começando na prática de yoga.',
        price: 50.0,
        durationMinutes: 60,
      },
      {
        title: 'Yoga Restaurativo',
        description: 'Prática suave com posturas de relaxamento profundo.',
        price: 65.0,
        durationMinutes: 75,
      },
      {
        title: 'Meditação Guiada',
        description: 'Sessão de meditação com técnicas de mindfulness.',
        price: 40.0,
        durationMinutes: 30,
      },
    ],
  },

  // ==================== MASSAGEM ====================
  {
    user: {
      name: 'Renata Souza',
      email: 'renata.massage@email.com',
      password: 'senha123',
      cpf: '55566677788',
      phone: '11999990005',
    },
    store: {
      name: 'Spa Serenidade',
      location: {
        street: 'Rua Pamplona',
        number: '300',
        complement: 'Casa',
        neighborhood: 'Jardim Paulista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01405-000',
        latitude: -23.5655,
        longitude: -46.6535,
      },
      appointmentInterval: AppointmentInterval.THIRTY_MINUTES,
    },
    services: [
      {
        title: 'Massagem Relaxante',
        description: 'Massagem suave para alívio do estresse e relaxamento muscular.',
        price: 120.0,
        durationMinutes: 60,
      },
      {
        title: 'Massagem Desportiva',
        description: 'Massagem profunda para atletas e praticantes de atividade física.',
        price: 140.0,
        durationMinutes: 60,
      },
      {
        title: 'Massagem com Pedras Quentes',
        description: 'Terapia com pedras vulcânicas aquecidas para relaxamento profundo.',
        price: 160.0,
        durationMinutes: 75,
      },
      {
        title: 'Shiatsu',
        description: 'Massagem japonesa com pressão nos pontos de energia do corpo.',
        price: 130.0,
        durationMinutes: 60,
      },
      {
        title: 'Quick Massage',
        description: 'Massagem rápida nas costas, ombros e pescoço.',
        price: 60.0,
        durationMinutes: 30,
      },
    ],
  },
];

// Nomes brasileiros para gerar 100 clientes
const FIRST_NAMES = [
  'João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Juliana', 'Gabriel', 'Fernanda',
  'Mateus', 'Camila', 'Rafael', 'Amanda', 'Bruno', 'Beatriz', 'Diego', 'Carolina',
  'Felipe', 'Daniela', 'Gustavo', 'Eduarda', 'Henrique', 'Gabriela', 'Igor', 'Helena',
  'José', 'Isabela', 'Leonardo', 'Larissa', 'Marcelo', 'Letícia', 'Nicolas', 'Manuela',
  'Otávio', 'Natália', 'Paulo', 'Olivia', 'Ricardo', 'Patrícia', 'Samuel', 'Rafaela',
  'Thiago', 'Sabrina', 'Vinícius', 'Tatiana', 'William', 'Vanessa', 'André', 'Yasmin',
  'Caio', 'Aline',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Gonçalves', 'Santana', 'Teixeira', 'Araújo', 'Pinto', 'Correia', 'Moura', 'Campos',
];

function generateCPF(index: number): string {
  const base = (70000000000 + index).toString();
  return base.padStart(11, '0');
}

function generatePhone(index: number): string {
  return `119${(80000000 + index).toString()}`;
}

function generateClients(count: number): Array<{
  name: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
}> {
  const clients: Array<{
    name: string;
    email: string;
    password: string;
    cpf: string;
    phone: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const secondLastName = LAST_NAMES[(i + 5) % LAST_NAMES.length];

    clients.push({
      name: `${firstName} ${lastName} ${secondLastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
      password: 'senha123',
      cpf: generateCPF(i),
      phone: generatePhone(i),
    });
  }

  return clients;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomStatus(): AppointmentStatus {
  const statuses = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
  ];
  return getRandomElement(statuses);
}

function generateAppointmentDate(daysOffset: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

interface StoreWithServices {
  store: StoreEntity;
  services: ServiceEntity[];
}

async function runSeed(): Promise<void> {
  console.log('🌱 Iniciando seed completo...\n');

  const dataSource = new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'agendoo_user',
    password: 'agendoo_password',
    database: 'agendoo',
    entities: [path.join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexão com banco de dados estabelecida\n');

    const userRepository = dataSource.getRepository(UserEntity);
    const storeRepository = dataSource.getRepository(StoreEntity);
    const serviceRepository = dataSource.getRepository(ServiceEntity);
    const appointmentRepository = dataSource.getRepository(AppointmentEntity);

    let usersCreated = 0;
    let storesCreated = 0;
    let servicesCreated = 0;
    let clientsCreated = 0;
    let appointmentsCreated = 0;

    const storesWithServices: StoreWithServices[] = [];

    // ==================== CRIAR PRESTADORES E LOJAS ====================
    console.log('═'.repeat(50));
    console.log('📋 CRIANDO PRESTADORES E LOJAS');
    console.log('═'.repeat(50));

    for (const providerData of PROVIDERS_DATA) {
      const existingUser = await userRepository.findOne({
        where: { email: providerData.user.email },
      });

      if (existingUser) {
        console.log(`⚠️  Usuário ${providerData.user.email} já existe, pulando...`);
        const existingStore = await storeRepository.findOne({
          where: { userId: existingUser.id },
        });
        if (existingStore) {
          const existingServices = await serviceRepository.find({
            where: { storeId: existingStore.id },
          });
          storesWithServices.push({ store: existingStore, services: existingServices });
        }
        continue;
      }

      const hashedPassword = await hashPassword(providerData.user.password);
      const user = userRepository.create({
        name: providerData.user.name,
        email: providerData.user.email,
        password: hashedPassword,
        type: UserType.PRESTADOR,
        cpf: providerData.user.cpf,
        phone: providerData.user.phone,
      });

      const savedUser = await userRepository.save(user);
      usersCreated++;
      console.log(`👤 Prestador criado: ${savedUser.name} (${savedUser.email})`);

      const store = storeRepository.create({
        name: providerData.store.name,
        userId: savedUser.id,
        workingHours: DEFAULT_WORKING_HOURS,
        location: providerData.store.location,
        appointmentInterval: providerData.store.appointmentInterval,
        imageUrl: null,
      });

      const savedStore = await storeRepository.save(store);
      storesCreated++;
      console.log(`🏪 Loja criada: ${savedStore.name}`);

      const storeServices: ServiceEntity[] = [];
      for (const serviceData of providerData.services) {
        const service = serviceRepository.create({
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price,
          durationMinutes: serviceData.durationMinutes,
          storeId: savedStore.id,
          imageUrl: null,
        });

        const savedService = await serviceRepository.save(service);
        storeServices.push(savedService);
        servicesCreated++;
        console.log(`  📋 Serviço: ${savedService.title} - R$ ${savedService.price}`);
      }

      storesWithServices.push({ store: savedStore, services: storeServices });
      console.log('');
    }

    // ==================== CRIAR CLIENTES ====================
    console.log('═'.repeat(50));
    console.log('👥 CRIANDO 100 CLIENTES');
    console.log('═'.repeat(50));

    const clientsData = generateClients(100);
    const savedClients: UserEntity[] = [];

    for (const clientData of clientsData) {
      const existingClient = await userRepository.findOne({
        where: { email: clientData.email },
      });

      if (existingClient) {
        savedClients.push(existingClient);
        continue;
      }

      const hashedPassword = await hashPassword(clientData.password);
      const client = userRepository.create({
        name: clientData.name,
        email: clientData.email,
        password: hashedPassword,
        type: UserType.CLIENTE,
        cpf: clientData.cpf,
        phone: clientData.phone,
      });

      const savedClient = await userRepository.save(client);
      savedClients.push(savedClient);
      clientsCreated++;

      if (clientsCreated % 20 === 0) {
        console.log(`  ✅ ${clientsCreated} clientes criados...`);
      }
    }

    console.log(`\n👥 Total de clientes criados: ${clientsCreated}\n`);

    // ==================== CRIAR AGENDAMENTOS ====================
    console.log('═'.repeat(50));
    console.log('📅 CRIANDO AGENDAMENTOS');
    console.log('═'.repeat(50));

    if (storesWithServices.length < 2) {
      console.log('⚠️  Menos de 2 lojas disponíveis, pulando agendamentos...');
    } else {
      // Loja com MUITOS agendamentos (índice 0 - Barbearia)
      const popularStore = storesWithServices[0];
      // Loja com POUCOS agendamentos (índice 4 - Massagem)
      const unpopularStore = storesWithServices[storesWithServices.length - 1];

      console.log(`\n🔥 Loja POPULAR: ${popularStore.store.name}`);
      console.log(`❄️  Loja com POUCOS agendamentos: ${unpopularStore.store.name}\n`);

      // Gerar 80 agendamentos para a loja popular (últimos 30 dias + próximos 30 dias)
      console.log('📅 Gerando agendamentos para loja popular...');
      for (let i = 0; i < 80; i++) {
        const client = savedClients[i % savedClients.length];
        const service = getRandomElement(popularStore.services);
        const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 a +30 dias
        const hour = 8 + Math.floor(Math.random() * 10); // 8h às 17h

        const appointment = appointmentRepository.create({
          userId: client.id,
          storeId: popularStore.store.id,
          serviceId: service.id,
          appointmentDate: generateAppointmentDate(daysOffset, hour),
          status: daysOffset < 0 ? getRandomStatus() : AppointmentStatus.PENDING,
          notes: null,
        });

        await appointmentRepository.save(appointment);
        appointmentsCreated++;
      }
      console.log(`  ✅ 80 agendamentos criados para ${popularStore.store.name}`);

      // Gerar 5 agendamentos para a loja com poucos agendamentos
      console.log('📅 Gerando agendamentos para loja com poucos agendamentos...');
      for (let i = 0; i < 5; i++) {
        const client = savedClients[(i + 50) % savedClients.length];
        const service = getRandomElement(unpopularStore.services);
        const daysOffset = Math.floor(Math.random() * 60) - 30;
        const hour = 9 + Math.floor(Math.random() * 8);

        const appointment = appointmentRepository.create({
          userId: client.id,
          storeId: unpopularStore.store.id,
          serviceId: service.id,
          appointmentDate: generateAppointmentDate(daysOffset, hour),
          status: daysOffset < 0 ? getRandomStatus() : AppointmentStatus.PENDING,
          notes: null,
        });

        await appointmentRepository.save(appointment);
        appointmentsCreated++;
      }
      console.log(`  ✅ 5 agendamentos criados para ${unpopularStore.store.name}`);

      // Gerar agendamentos moderados para as outras lojas (15-25 cada)
      for (let storeIndex = 1; storeIndex < storesWithServices.length - 1; storeIndex++) {
        const storeData = storesWithServices[storeIndex];
        const appointmentCount = 15 + Math.floor(Math.random() * 10); // 15-24 agendamentos

        console.log(`📅 Gerando agendamentos para ${storeData.store.name}...`);
        for (let i = 0; i < appointmentCount; i++) {
          const clientIndex = (storeIndex * 20 + i) % savedClients.length;
          const client = savedClients[clientIndex];
          const service = getRandomElement(storeData.services);
          const daysOffset = Math.floor(Math.random() * 60) - 30;
          const hour = 8 + Math.floor(Math.random() * 10);

          const appointment = appointmentRepository.create({
            userId: client.id,
            storeId: storeData.store.id,
            serviceId: service.id,
            appointmentDate: generateAppointmentDate(daysOffset, hour),
            status: daysOffset < 0 ? getRandomStatus() : AppointmentStatus.PENDING,
            notes: null,
          });

          await appointmentRepository.save(appointment);
          appointmentsCreated++;
        }
        console.log(`  ✅ ${appointmentCount} agendamentos criados para ${storeData.store.name}`);
      }
    }

    // ==================== RESUMO ====================
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RESUMO DO SEED');
    console.log('═'.repeat(50));
    console.log(`   👤 Prestadores criados: ${usersCreated}`);
    console.log(`   🏪 Lojas criadas: ${storesCreated}`);
    console.log(`   📋 Serviços criados: ${servicesCreated}`);
    console.log(`   👥 Clientes criados: ${clientsCreated}`);
    console.log(`   📅 Agendamentos criados: ${appointmentsCreated}`);
    console.log('═'.repeat(50));

    console.log('\n📍 DISTRIBUIÇÃO DE AGENDAMENTOS:');
    for (const storeData of storesWithServices) {
      const count = await appointmentRepository.count({
        where: { storeId: storeData.store.id },
      });
      const indicator = count >= 50 ? '🔥' : count <= 10 ? '❄️' : '📊';
      console.log(`   ${indicator} ${storeData.store.name}: ${count} agendamentos`);
    }

    console.log('\n✅ Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Conexão com banco de dados encerrada');
  }
}

runSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
