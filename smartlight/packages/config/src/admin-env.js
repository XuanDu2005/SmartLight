"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAdminEnv = exports.adminEnvSchema = void 0;
const zod_1 = require("zod");
const env_1 = require("./env");
exports.adminEnvSchema = env_1.baseEnvSchema.extend({
    VITE_ADMIN_API_BASE_URL: zod_1.z.string().url().default('http://localhost:4000'),
});
const parseAdminEnv = () => exports.adminEnvSchema.parse(process.env);
exports.parseAdminEnv = parseAdminEnv;
