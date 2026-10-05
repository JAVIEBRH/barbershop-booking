export interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface CreateServiceInput {
  name: string;
  durationMinutes: number;
  price: number;
}
