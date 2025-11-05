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
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

