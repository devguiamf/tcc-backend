import { ServiceOutput } from "@/service/models/types/service.types";
import { StoreOutput } from "@/store/models/types/store.types";
import { UserOutput } from "@/user/models/types/user.types";

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface AppointmentOutput {
  id: string;
  userId: string;
  storeId: string;
  serviceId: string;
  appointmentDate: Date;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  store?: StoreOutput;
  service?: ServiceOutput;
  user?: UserOutput;
}

export interface AvailableTimeSlot {
  startTime: string;
  endTime: string;
  date: string;
}

