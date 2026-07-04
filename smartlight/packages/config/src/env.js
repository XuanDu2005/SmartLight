"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBaseEnv = exports.baseEnvSchema = void 0;
const zod_1 = require("zod");
const shared_1 = require("@smartlight/shared");
/**
 * Base env schema shared by all apps. Specific apps extend this with their
 * own additional requirements (apiEnvSchema, webEnvSchema, adminEnvSchema).
 */
exports.baseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum([
        shared_1.Environment.DEVELOPMENT,
        shared_1.Environment.PREVIEW,
        shared_1.Environment.STAGING,
        shared_1.Environment.PRODUCTION,
        shared_1.Environment.TEST,
    ])
        .default(shared_1.Environment.DEVELOPMENT),
    LOG_LEVEL: zod_1.z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .default('info'),
});
const parseBaseEnv = () => exports.baseEnvSchema.parse(process.env);
exports.parseBaseEnv = parseBaseEnv;
