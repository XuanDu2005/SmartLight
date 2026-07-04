/* eslint-disable @typescript-eslint/no-var-requires */
export {};

/**
 * Process bootstrap: registers path mappings and ts-node transpile-only.
 *
 * Required by the runtime build output (dist/apps/api/src/main.js) which
 * keeps the workspace-package aliases (`@smartlight/config`, ...) and
 * therefore needs a Node-side resolver.
 *
 *   node -r ./dist/apps/api/src/register.js dist/apps/api/src/main.js
 */
const path = require('node:path');
const fs = require('node:fs');

const { register } = require('tsconfig-paths');
const tsNode = require('ts-node');

const tsConfigPath = path.resolve(__dirname, '../../../../../../tsconfig.base.json');
const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
const baseUrl = path.resolve(path.dirname(tsConfigPath), '.');

// Register path aliases so that `@smartlight/config` resolves to the
// matching workspace package on disk.
register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths || {},
});

// Allow Node to require `.ts` from workspace packages at runtime.
tsNode.register({
  transpileOnly: true,
  project: tsConfigPath,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});