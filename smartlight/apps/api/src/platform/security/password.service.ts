/**
 * Password hashing helpers (Argon2id).
 *
 * Per docs/05-software-architecture/06_SECURITY_ARCHITECTURE.md \u00a73.4:
 *   - algorithm: argon2id
 *   - memory cost: 64 MB
 *   - time cost: 3
 *   - parallelism: 4
 */
import * as argon2 from 'argon2';

const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
});

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}