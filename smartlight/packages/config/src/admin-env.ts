import { z } from 'zod';
import { baseEnvSchema } from './env';

export const adminEnvSchema = baseEnvSchema.extend({
  VITE_ADMIN_API_BASE_URL: z.string().url().default('http://localhost:4000'),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;
export const parseAdminEnv = (): AdminEnv => adminEnvSchema.parse(process.env);
