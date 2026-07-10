"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseApiEnv = exports.apiEnvSchema = void 0;
const zod_1 = require("zod");
const env_1 = require("./env");
exports.apiEnvSchema = env_1.baseEnvSchema.extend({
    API_PORT: zod_1.z.coerce.number().int().positive().default(4000),
    API_BASE_URL: zod_1.z.string().url().default('http://localhost:4000'),
    API_CORS_ORIGINS: zod_1.z
        .string()
        .default('http://localhost:5173,http://localhost:5174')
        .transform((s) => s.split(',').map((x) => x.trim())),
    DATABASE_URL: zod_1.z.string().min(1),
    DIRECT_URL: zod_1.z.string().min(1).optional(),
    REDIS_URL: zod_1.z.string().optional(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_TTL_SEC: zod_1.z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SEC: zod_1.z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
    JWT_REMEMBER_ME_TTL_SEC: zod_1.z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
    GOOGLE_OAUTH_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_OAUTH_CLIENT_SECRET: zod_1.z.string().optional(),
    GOOGLE_OAUTH_CALLBACK_URL: zod_1.z
        .string()
        .default('http://localhost:4000/v1/auth/oauth/google/callback'),
    FACEBOOK_OAUTH_CLIENT_ID: zod_1.z.string().optional(),
    FACEBOOK_OAUTH_CLIENT_SECRET: zod_1.z.string().optional(),
    FACEBOOK_OAUTH_CALLBACK_URL: zod_1.z
        .string()
        .default('http://localhost:4000/v1/auth/oauth/facebook/callback'),
    FRONTEND_BASE_URL: zod_1.z.string().url().default('http://localhost:5173'),
    ADMIN_BASE_URL: zod_1.z.string().url().default('http://localhost:5174'),
    THROTTLE_TTL_SEC: zod_1.z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: zod_1.z.coerce.number().int().positive().default(20),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    RESEND_API_KEY: zod_1.z.string().optional(),
    EMAIL_FROM: zod_1.z.string().email().default('no-reply@smartlight.vn'),
});
const parseApiEnv = () => exports.apiEnvSchema.parse(process.env);
exports.parseApiEnv = parseApiEnv;
