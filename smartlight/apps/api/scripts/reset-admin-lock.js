/**
 * Bootstrap-only reset utility.
 *
 * Resets the seeded super-admin's lockout state. Use this when local
 * development has triggered the brute-force lockout and you need to
 * continue smoke-testing. NEVER expose this script in production.
 */
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.adminUser.updateMany({
      data: { failedLoginCount: 0, lockedUntil: null, status: 'ACTIVE' },
    });
    console.log(`[reset-admin] reset ${result.count} admin user(s)`);
  } finally {
    await prisma.$disconnect();
  }
})();