import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().default(7),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  OTP_PROVIDER: z.enum(['sandbox']).default('sandbox'),
  OTP_SANDBOX_CODE: z.string().regex(/^\d{6}$/).optional(),
  OTP_TTL_SECONDS: z.coerce.number().int().default(300),
  OTP_RESEND_SECONDS: z.coerce.number().int().default(45),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().default(5),

  GPS_STALE_AFTER_SECONDS: z.coerce.number().int().default(60),
  GPS_OFFLINE_AFTER_SECONDS: z.coerce.number().int().default(300),
  GPS_MAX_FIX_AGE_SECONDS: z.coerce.number().int().default(120),

  // Payments
  PAYMENT_PROVIDER: z.enum(['sandbox', 'sslcommerz']).default('sandbox'),
  API_BASE_URL: z.string().url().default('http://localhost:4777'),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),
  BOOKING_PENDING_EXPIRE_MINUTES: z.coerce.number().int().min(5).default(15),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
