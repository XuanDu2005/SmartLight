/**
 * SmartLight seed script.
 *
 * Creates the foundational records every fresh database needs:
 *   1. Permission + role catalog (system roles: customer, admin, catalog_manager, support)
 *   2. Super admin user (from env) wired to the admin role
 *   3. Default binding of `customer` role to every existing user (idempotent)
 */
import { PrismaClient, AdminUserStatus, RoleScope } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

interface RoleSeed {
  code: string;
  displayName: string;
  permissions: string[];
}

const PERMISSION_SEEDS: { code: string; category: string; displayName: string }[] = [
  // Customer-side (defaults applied at login)
  { code: 'catalog.product.read', category: 'catalog', displayName: 'Read products' },
  { code: 'cart.write', category: 'cart', displayName: 'Manage own cart' },
  { code: 'order.read.own', category: 'order', displayName: 'Read own orders' },
  { code: 'review.write', category: 'review', displayName: 'Write reviews' },
  { code: 'user.profile.write.own', category: 'user', displayName: 'Edit own profile' },

  // Admin-side
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
];

const ROLE_SEEDS: RoleSeed[] = [
  {
    code: 'customer',
    displayName: 'Customer',
    permissions: [
      'catalog.product.read',
      'cart.write',
      'order.read.own',
      'review.write',
      'user.profile.write.own',
    ],
  },
  {
    code: 'support',
    displayName: 'Support Agent',
    permissions: ['order.read.all', 'payment.read.all', 'user.read.all'],
  },
  {
    code: 'catalog_manager',
    displayName: 'Catalog Manager',
    permissions: [
      'catalog.product.read.all',
      'catalog.product.write.all',
    ],
  },
  {
    code: 'admin',
    displayName: 'Admin',
    permissions: [
      'catalog.product.read.all',
      'catalog.product.write.all',
      'order.read.all',
      'order.write.all',
      'payment.read.all',
      'payment.refund.all',
      'user.read.all',
      'user.write.all',
    ],
  },
  {
    code: 'super_admin',
    displayName: 'Super Admin',
    permissions: PERMISSION_SEEDS.map((p) => p.code),
  },
];

async function main(): Promise<void> {
  // 1. Permissions
  for (const p of PERMISSION_SEEDS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { displayName: p.displayName, category: p.category },
      create: p,
    });
  }

  // 2. Roles + role-permission bindings
  for (const r of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { displayName: r.displayName, scope: RoleScope.SYSTEM, isActive: true },
      create: {
        code: r.code,
        displayName: r.displayName,
        scope: RoleScope.SYSTEM,
        isActive: true,
      },
    });

    for (const permCode of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // 3. Super admin user
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@smartlight.vn';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMeSmartLight!2026';

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: superAdminEmail },
  });
  if (!existingAdmin) {
    const passwordHash = await argon2.hash(superAdminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    const admin = await prisma.adminUser.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        displayName: 'Super Admin',
        status: AdminUserStatus.PENDING_MFA_SETUP,
      },
    });
    const role = await prisma.role.findUnique({ where: { code: 'super_admin' } });
    if (role) {
      await prisma.adminUserRole.upsert({
        where: {
          adminUserId_roleId: { adminUserId: admin.id, roleId: role.id },
        },
        update: {},
        create: { adminUserId: admin.id, roleId: role.id },
      });
    }
    // eslint-disable-next-line no-console
    console.log(`[seed] Created super admin: ${superAdminEmail}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[seed] Super admin already exists: ${superAdminEmail}`);
  }

  // 4. Bind any existing customer users to the customer role
  const customerRole = await prisma.role.findUnique({ where: { code: 'customer' } });
  if (customerRole) {
    const users = await prisma.user.findMany({ select: { id: true }, take: 1000 });
    for (const u of users) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: u.id, roleId: customerRole.id },
        },
        update: {},
        create: { userId: u.id, roleId: customerRole.id },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('[seed] Done.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });