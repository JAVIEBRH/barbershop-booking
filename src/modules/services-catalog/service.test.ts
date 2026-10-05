import { describe, it, expect, vi, beforeEach } from "vitest";
import { servicesCatalogService } from "./service";
import { servicesCatalogRepository } from "./repository";

vi.mock("./repository", () => ({
  servicesCatalogRepository: {
    findManyActive: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe("servicesCatalogService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects creating a service with non-positive duration", async () => {
    await expect(
      servicesCatalogService.create({ name: "Corte", durationMinutes: 0, price: 5000 })
    ).rejects.toThrow(/duración/i);
    expect(servicesCatalogRepository.create).not.toHaveBeenCalled();
  });

  it("creates a service with valid input", async () => {
    vi.mocked(servicesCatalogRepository.create).mockResolvedValue({
      id: "1", name: "Corte", durationMinutes: 30, price: 5000, active: true,
    } as never);

    const result = await servicesCatalogService.create({ name: "Corte", durationMinutes: 30, price: 5000 });

    expect(result.id).toBe("1");
    expect(servicesCatalogRepository.create).toHaveBeenCalledWith({ name: "Corte", durationMinutes: 30, price: 5000 });
  });

  it("listAll returns every service regardless of active state (the admin view)", async () => {
    vi.mocked(servicesCatalogRepository.findMany).mockResolvedValue([
      { id: "1", name: "Corte", durationMinutes: 30, price: 5000, active: true },
      { id: "2", name: "Viejo", durationMinutes: 20, price: 3000, active: false },
    ] as never);

    const result = await servicesCatalogService.listAll();

    expect(result).toHaveLength(2);
    expect(servicesCatalogRepository.findManyActive).not.toHaveBeenCalled();
  });

  it("rejects updating a service to a non-positive duration", async () => {
    await expect(servicesCatalogService.update("1", { durationMinutes: 0 })).rejects.toThrow(/duración/i);
    expect(servicesCatalogRepository.update).not.toHaveBeenCalled();
  });

  it("rejects updating a service to a negative price", async () => {
    await expect(servicesCatalogService.update("1", { price: -100 })).rejects.toThrow(/precio/i);
    expect(servicesCatalogRepository.update).not.toHaveBeenCalled();
  });

  it("allows updating just the active flag without touching duration/price", async () => {
    vi.mocked(servicesCatalogRepository.update).mockResolvedValue({
      id: "1", name: "Corte", durationMinutes: 30, price: 5000, active: false,
    } as never);

    await servicesCatalogService.update("1", { active: false });

    expect(servicesCatalogRepository.update).toHaveBeenCalledWith("1", { active: false });
  });
});
