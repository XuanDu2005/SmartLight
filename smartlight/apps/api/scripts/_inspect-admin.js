const { PrismaClient } = require('@prisma/client');
(async () => {
  const p = new PrismaClient();
  const u = await p.adminUser.findUnique({ where: { email: 'admin@smartlight.vn' } });
  console.log(JSON.stringify({
    exists: !!u,
    status: u && u.status,
    failed: u && u.failedLoginCount,
    lockedUntil: u && u.lockedUntil,
    hasHash: !!(u && u.passwordHash),
    hashStart: u && u.passwordHash && u.passwordHash.slice(0, 20),
    roles: u && u.roles ? u.roles.map(r => r.role && r.role.code) : 'n/a'
  }, null, 2));

  // Reset lockout regardless
  const r = await p.adminUser.updateMany({
    where: { email: 'admin@smartlight.vn' },
    data: { failedLoginCount: 0, lockedUntil: null, status: 'ACTIVE' },
  });
  console.log('reset count:', r.count);
  await p.$disconnect();
})();
