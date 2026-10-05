import { servicesCatalogRepository } from "./repository";
import type { CreateServiceInput, ServiceItem } from "./types";

function assertValid(input: Partial<CreateServiceInput>): void {
  if (input.durationMinutes !== undefined && input.durationMinutes <= 0) {
    throw new Error("La duración del servicio debe ser mayor a 0 minutos");
  }
  if (input.price !== undefined && input.price < 0) {
    throw new Error("El precio no puede ser negativo");
  }
}

export const servicesCatalogService = {
  async listActive(): Promise<ServiceItem[]> {
    return servicesCatalogRepository.findManyActive();
  },

  /** Admin-only view — includes inactive services so one never just
   * disappears; the admin UI toggles `active` back on from here. */
  async listAll(): Promise<ServiceItem[]> {
    return servicesCatalogRepository.findMany();
  },

  async create(input: CreateServiceInput): Promise<ServiceItem> {
    assertValid(input);
    return servicesCatalogRepository.create(input);
  },

  async update(id: string, input: Partial<CreateServiceInput> & { active?: boolean }): Promise<ServiceItem> {
    assertValid(input);
    return servicesCatalogRepository.update(id, input);
  },
};
