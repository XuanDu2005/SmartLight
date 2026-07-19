/**
 * Minimal seed: create only super admin user + roles + permissions
 * to allow login. Full seed runs separately when needed.
 */
const { PrismaClient, AdminUserStatus, RoleScope, UserStatus, AuthProvider } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: 'catalog.product.read', category: 'catalog', displayName: 'Read products' },
  { code: 'cart.write', category: 'cart', displayName: 'Manage own cart' },
  { code: 'order.read.own', category: 'order', displayName: 'Read own orders' },
  { code: 'review.write', category: 'review', displayName: 'Write reviews' },
  { code: 'user.profile.write.own', category: 'user', displayName: 'Edit own profile' },
  { code: 'catalog.product.write.all', category: 'catalog', displayName: 'Manage all products' },
  { code: 'catalog.product.read.all', category: 'catalog', displayName: 'Read all products' },
  { code: 'order.read.all', category: 'order', displayName: 'Read all orders' },
  { code: 'order.write.all', category: 'order', displayName: 'Manage all orders' },
  { code: 'payment.read.all', category: 'payment', displayName: 'Read all payments' },
  { code: 'payment.refund.all', category: 'payment', displayName: 'Issue refunds' },
  { code: 'user.read.all', category: 'user', displayName: 'Read all users' },
  { code: 'user.write.all', category: 'user', displayName: 'Manage all users' },
  { code: 'rbac.write.all', category: 'rbac', displayName: 'Manage roles & permissions' },
  { code: 'audit.read.all', category: 'audit', displayName: 'Read audit log' },
  { code: 'inventory.read.all', category: 'inventory', displayName: 'Read all inventory' },
  { code: 'inventory.write.all', category: 'inventory', displayName: 'Manage all inventory' },
];

const ROLES = [
  { code: 'customer', displayName: 'Customer', permissions: ['catalog.product.read', 'cart.write', 'order.read.own', 'review.write', 'user.profile.write.own'] },
  { code: 'support', displayName: 'Support Agent', permissions: ['order.read.all', 'payment.read.all', 'user.read.all'] },
  { code: 'inventory_manager', displayName: 'Inventory Manager', permissions: ['catalog.product.read.all', 'inventory.read.all', 'inventory.write.all'] },
  { code: 'super_admin', displayName: 'Super Admin', permissions: PERMISSIONS.map(p => p.code) },
];

async function main() {
  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { displayName: p.displayName, category: p.category },
      create: p,
    });
  }

  console.log('Seeding roles...');
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { displayName: r.displayName, scope: RoleScope.SYSTEM },
      create: { code: r.code, displayName: r.displayName, scope: RoleScope.SYSTEM },
    });
    for (const permCode of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log('Seeding admin user...');
  const superAdminRole = await prisma.role.findUnique({ where: { code: 'super_admin' } });
  const adminPassword = 'Admin@123456';
  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@smartlight.vn' },
    update: {
      passwordHash,
      status: AdminUserStatus.ACTIVE,
    },
    create: {
      email: 'admin@smartlight.vn',
      passwordHash,
      displayName: 'Super Admin',
      status: AdminUserStatus.ACTIVE,
    },
  });

  if (superAdminRole) {
    await prisma.adminUserRole.upsert({
      where: { adminUserId_roleId: { adminUserId: admin.id, roleId: superAdminRole.id } },
      update: {},
      create: { adminUserId: admin.id, roleId: superAdminRole.id },
    });
  }

  console.log('\n=== Admin login ready ===');
  console.log('Email:    admin@smartlight.vn');
  console.log('Password: Admin@123456');
  console.log('=========================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
