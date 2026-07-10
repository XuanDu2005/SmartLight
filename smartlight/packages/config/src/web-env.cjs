"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWebEnv = exports.webEnvSchema = void 0;
const zod_1 = require("zod");
const env_1 = require("./env");
exports.webEnvSchema = env_1.baseEnvSchema.extend({
    VITE_API_BASE_URL: zod_1.z.string().url().default('http://localhost:4000'),
    VITE_APP_NAME: zod_1.z.string().default('SmartLight'),
    VITE_DEFAULT_LOCALE: zod_1.z.string().default('vi-VN'),
});
const parseWebEnv = () => exports.webEnvSchema.parse(process.env);
exports.parseWebEnv = parseWebEnv;
