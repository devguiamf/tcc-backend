export enum AppointmentInterval {
  FIVE_MINUTES = 5,
  TEN_MINUTES = 10,
  FIFTEEN_MINUTES = 15,
  THIRTY_MINUTES = 30,
}

export interface WorkingHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Location {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export interface StoreOutput {
  id: string;
  name: string;
  userId: string;
  workingHours: WorkingHours[];
  location: Location;
  appointmentInterval: AppointmentInterval;
  imageUrl?: string;
  imageBase64?: string;
  createdAt: Date;
  updatedAt: Date;
}

