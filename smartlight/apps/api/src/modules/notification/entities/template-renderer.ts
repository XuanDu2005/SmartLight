/**
 * Simple `{{variable}}` template engine.
 *
 * Replaces every occurrence of `{{key}}` (and `{{ key }}`) with
 * `String(variables[key])`. Missing keys raise so callers can fail fast.
 */

export class TemplateRenderError extends Error {
  public readonly missing: string[];
  constructor(missing: string[]) {
    super(`Missing template variables: ${missing.join(', ')}`);
    this.name = 'TemplateRenderError';
    this.missing = missing;
  }
}

const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function extractVariables(template: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = VAR_PATTERN.exec(template)) !== null) {
    keys.add(match[1]);
  }
  return [...keys];
}

export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  const missing = extractVariables(template).filter(
    (k) => !(k in variables) || variables[k] === undefined || variables[k] === null,
  );
  if (missing.length > 0) {
    throw new TemplateRenderError(missing);
  }
  return template.replace(VAR_PATTERN, (_full, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? '' : String(value);
  });
}
