"use server";

import { revenueService } from "./service";
import { requireAdminSession } from "@/modules/auth/guard";

export async function getRevenueSummaryAction() {
  await requireAdminSession();
  return revenueService.getSummary();
}
