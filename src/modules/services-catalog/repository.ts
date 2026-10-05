import { prisma } from "@/lib/prisma";
import type { CreateServiceInput } from "./types";

export const servicesCatalogRepository = {
  findManyActive() {
    return prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  },
  /** All services regardless of active state — the admin list needs this
   * (an inactive service should stay visible with a switch to reactivate
   * it, never vanish silently), unlike the client booking wizard which
   * only ever wants findManyActive. */
  findMany() {
    return prisma.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  },
  create(input: CreateServiceInput) {
    return prisma.service.create({ data: input });
  },
  update(id: string, input: Partial<CreateServiceInput> & { active?: boolean }) {
    return prisma.service.update({ where: { id }, data: input });
  },
};
