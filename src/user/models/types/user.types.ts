export enum UserType {
  CLIENTE = 'cliente',
  PRESTADOR = 'prestador',
}

export interface UserOutput {
  id: string;
  name: string;
  email: string;
  type: UserType;
  cpf?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

