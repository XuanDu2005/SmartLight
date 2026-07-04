import { z } from 'zod';
import { baseEnvSchema } from './env';

export const webEnvSchema = baseEnvSchema.extend({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000'),
  VITE_APP_NAME: z.string().default('SmartLight'),
  VITE_DEFAULT_LOCALE: z.string().default('vi-VN'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export const parseWebEnv = (): WebEnv => webEnvSchema.parse(process.env);
