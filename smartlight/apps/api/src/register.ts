/* eslint-disable @typescript-eslint/no-var-requires */
export {};

/**
 * Process bootstrap: registers path mappings so that `@smartlight/*` aliases
 * resolve at runtime. Required because the production build keeps workspace
 * aliases (see apps/api/tsconfig.build.json).
 *
 *   node -r ./dist/apps/api/src/register.js dist/apps/api/src/main.js
 *
 * In the production Docker image, `@smartlight/shared` and `@smartlight/config`
 * ship as compiled CJS JavaScript under `packages/{shared,config}/dist`. The
 * path mappings below rewrite the source-only entries in
 * `tsconfig.base.json` (which point at .ts files) to the compiled .js files.
 */
const path = require('node:path');
const fs = require('node:fs');

const { register } = require('tsconfig-paths');

const tsConfigPath = path.resolve(__dirname, '../../../../../../tsconfig.base.json');
const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
const baseUrl = path.resolve(path.dirname(tsConfigPath), '.');

// Rewrite path mappings from .ts sources to compiled .js bundles.
const paths: Record<string, string[]> = {};
for (const [alias, targets] of Object.entries(tsConfig.compilerOptions.paths || {})) {
  paths[alias] = (targets as unknown as string[]).map((t: string) => {
    if (typeof t !== 'string') return t;
    return t
      .replace('/packages/shared/src/', '/packages/shared/dist/')
      .replace('/packages/config/src/', '/packages/config/dist/config/src/')
      .replace(/\.ts$/, '.js');
  });
}

register({
  baseUrl,
  paths,
});