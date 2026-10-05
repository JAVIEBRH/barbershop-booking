export interface CreateAppointmentInput {
  date: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  idempotencyKey: string;
}

export interface AppointmentResult {
  id: string;
  date: string;
  horaInicio: string;
  horaFin: string;
  clientName: string;
  cancelToken: string;
}

export interface AppointmentSummary extends AppointmentResult {
  clientPhone: string;
  clientEmail: string;
  status: string;
  serviceName: string;
  price: number;
}
