import { z } from 'zod';
import { baseEnvSchema } from './env';

export const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  API_CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((s) => s.split(',').map((x) => x.trim())),

  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  JWT_REMEMBER_ME_TTL_SEC: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CALLBACK_URL: z
    .string()
    .default('http://localhost:4000/v1/auth/oauth/google/callback'),

  FACEBOOK_OAUTH_CLIENT_ID: z.string().optional(),
  FACEBOOK_OAUTH_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_OAUTH_CALLBACK_URL: z
    .string()
    .default('http://localhost:4000/v1/auth/oauth/facebook/callback'),

  FRONTEND_BASE_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_BASE_URL: z.string().url().default('http://localhost:5174'),

  THROTTLE_TTL_SEC: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(20),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('no-reply@smartlight.vn'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const parseApiEnv = (): ApiEnv => apiEnvSchema.parse(process.env);
