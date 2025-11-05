export interface ServiceOutput {
  id: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

