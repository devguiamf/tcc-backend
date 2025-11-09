import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../user/models/user.entity';
import { StoreEntity } from '../../store/models/store.entity';
import { ServiceEntity } from '../../service/models/service.entity';
import { AppointmentStatus } from './types/appointment.types';

@Entity('appointments')
export class AppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => StoreEntity)
  @JoinColumn({ name: 'storeId' })
  store: StoreEntity;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => ServiceEntity)
  @JoinColumn({ name: 'serviceId' })
  service: ServiceEntity;

  @Column({ type: 'datetime' })
  appointmentDate: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

