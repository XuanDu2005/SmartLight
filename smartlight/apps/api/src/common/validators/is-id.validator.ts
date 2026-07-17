import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Accepts any string that is *either* a valid UUID (any version) or a CUID
 * (the format Prisma uses by default with `@default(cuid())`).
 *
 * Why this exists:
 *   The DB stores all primary keys as text columns containing CUIDs
 *   (`cm...`, ~25 chars). The original DTOs in this codebase used
 *   `@IsUUID()` which rejected those values at the validation layer even
 *   though the database itself accepts them — every admin write path
 *   failed with 400 "id must be a UUID".
 *
 *   Replacing the validator with this one keeps the door open for either
 *   format, which mirrors the actual data we persist.
 */
const CUID_RE = /^c[a-z0-9]{20,30}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ValidatorConstraint({ name: 'IsId', async: false })
class IsIdConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (value.length === 0) return false;
    return UUID_RE.test(value) || CUID_RE.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a UUID or CUID`;
  }
}

export function IsId(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      constraints: [],
      validator: IsIdConstraint,
    });
  };
}