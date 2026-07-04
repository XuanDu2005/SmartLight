import { z } from 'zod';
import { Environment } from '@smartlight/shared';

/**
 * Base env schema shared by all apps. Specific apps extend this with their
 * own additional requirements (apiEnvSchema, webEnvSchema, adminEnvSchema).
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum([
      Environment.DEVELOPMENT,
      Environment.PREVIEW,
      Environment.STAGING,
      Environment.PRODUCTION,
      Environment.TEST,
    ])
    .default(Environment.DEVELOPMENT),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export const parseBaseEnv = (): BaseEnv => baseEnvSchema.parse(process.env);
