"use server";

import { revalidatePath } from "next/cache";
import { servicesCatalogService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";
import type { CreateServiceInput } from "./types";

export async function listActiveServicesAction() {
  return servicesCatalogService.listActive();
}

export async function listAllServicesAction() {
  await requireAdminSession();
  return servicesCatalogService.listAll();
}

export async function createServiceAction(input: CreateServiceInput) {
  await requireAdminSession();
  const result = await servicesCatalogService.create(input);
  // Without this, a newly added service doesn't appear in the admin list
  // until a manual reload — Next.js only re-renders the current route after
  // a Server Action when the action itself asks for it.
  revalidatePath("/admin/servicios");
  return result;
}

export async function updateServiceAction(id: string, input: Partial<CreateServiceInput> & { active?: boolean }) {
  await requireAdminSession();
  const result = await servicesCatalogService.update(id, input);
  revalidatePath("/admin/servicios");
  return result;
}
