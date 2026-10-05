import "dotenv/config";
import { z } from "zod";
import { assertAbsoluteFileUrlInProduction } from "./validateDatabaseUrl";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().min(1),
  BUSINESS_TIMEZONE: z.string().min(1),
  // Comma-separated — the barber notification goes to every address here
  // (e.g. the barber's own inbox plus whoever else should see new bookings).
  BARBER_EMAIL: z
    .string()
    .min(1)
    .refine(
      (v) => v.split(",").every((e) => z.string().email().safeParse(e.trim()).success),
      "BARBER_EMAIL must be a comma-separated list of valid emails"
    ),
  // Absolute origin (no trailing slash) used to build the self-cancellation
  // link sent in the confirmation email — email clients render it outside
  // any request context, so there's no `headers()`/`Host` to read it from.
  APP_BASE_URL: z.string().url(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  BUSINESS_TIMEZONE: process.env.BUSINESS_TIMEZONE,
  BARBER_EMAIL: process.env.BARBER_EMAIL,
  APP_BASE_URL: process.env.APP_BASE_URL,
});

assertAbsoluteFileUrlInProduction(env.DATABASE_URL, process.env.NODE_ENV ?? "development");
