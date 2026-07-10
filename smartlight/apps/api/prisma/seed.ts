/**
 * SmartLight seed script — Phase 17.5 production demo data.
 *
 * Creates a realistic, end-to-end demo dataset for a fresh database:
 *   1. Permission + role catalog (system roles)
 *   2. Super admin user (admin@smartlight.vn) wired to the `super_admin` role
 *   3. Demo customer user (customer@smartlight.vn) wired to the `customer` role
 *   4. Default binding of `customer` role to every existing user (idempotent)
 *   5. Catalog: 5 root categories, 4 brands, attributes, 10+ products with
 *      variants (SKU + price + attributes), inventory for every variant
 *   6. Promotion + voucher: `WELCOME10` — 10% discount, min 200.000 VND, ACTIVE
 *
 * Idempotent: every step uses upsert by a natural key so re-runs are safe.
 *
 * Password hashing uses the shared `hashPassword` helper (Argon2id) — same
 * algorithm, memory cost, time cost, and parallelism that the API uses for
 * runtime registration. Plaintext demo passwords are surfaced in the CLI
 * output and the docs.
 */
import {
  PrismaClient,
  AdminUserStatus,
  RoleScope,
  AttributeDataType,
  PromotionType,
  PromotionStatus,
  VoucherType,
  DiscountScope,
  UsageLimitType,
  UserStatus,
  AuthProvider,
} from '@prisma/client';

import { hashPassword } from '../src/platform/security/password.service';

const prisma = new PrismaClient();

interface RoleSeed {
  code: string;
  displayName: string;
  permissions: string[];
}

const PERMISSION_SEEDS: { code: string; category: string; displayName: string }[] = [
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

/* =============================================================================
 *  DEMO CREDENTIALS
 * ============================================================================= */

const DEMO_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'admin@smartlight.vn';
const DEMO_ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@SmartLight2026';

const DEMO_CUSTOMER_EMAIL =
  process.env.DEMO_CUSTOMER_EMAIL ?? 'customer@smartlight.vn';
const DEMO_CUSTOMER_PASSWORD =
  process.env.DEMO_CUSTOMER_PASSWORD ?? 'Customer@SmartLight2026';

/* =============================================================================
 *  CATALOG SEED
 * ============================================================================= */

interface CategorySeed {
  slug: string;
  name: string;
  parentSlug?: string;
  description: string;
  isFeatured?: boolean;
  displayOrder: number;
}

const CATEGORY_SEEDS: CategorySeed[] = [
  // Top-level (5) per the Phase 17.5 brief
  { slug: 'den-led', name: 'Đèn LED', description: 'Đèn LED tiết kiệm điện, tuổi thọ cao, đa dạng công suất', displayOrder: 1, isFeatured: true },
  { slug: 'den-trang-tri', name: 'Đèn trang trí', description: 'Đèn trang trí nội thất — phòng khách, phòng ngủ, hành lang', displayOrder: 2, isFeatured: true },
  { slug: 'den-thong-minh', name: 'Đèn thông minh', description: 'Đèn thông minh điều khiển từ xa, tương thích app / Alexa / Google Home', displayOrder: 3, isFeatured: true },
  { slug: 'den-phong-ngu', name: 'Đèn phòng ngủ', description: 'Đèn ngủ, đèn đầu giường, ánh sáng vàng ấm dịu', displayOrder: 4 },
  { slug: 'den-nang-luong-mat-troi', name: 'Đèn năng lượng mặt trời', description: 'Đèn solar ngoài trời, sân vườn, chống nước IP65', displayOrder: 5, isFeatured: true },

  // Sub-categories
  { slug: 'den-led-bulb', name: 'Đèn LED Bulb', parentSlug: 'den-led', description: 'Bóng LED bulb E27 / E14 tiêu chuẩn', displayOrder: 1 },
  { slug: 'den-led-downlight', name: 'Đèn LED Âm Trần', parentSlug: 'den-led', description: 'Đèn downlight LED âm trần siêu mỏng', displayOrder: 2 },
  { slug: 'den-led-tube', name: 'Đèn LED Tuýp', parentSlug: 'den-led', description: 'Đèn LED tuýp T5/T8 thay thế huỳnh quang', displayOrder: 3 },
  { slug: 'den-pha-led', name: 'Đèn Pha LED', parentSlug: 'den-led', description: 'Đèn pha LED chiếu sáng ngoài trời', displayOrder: 4 },
  { slug: 'den-tha', name: 'Đèn Thả', parentSlug: 'den-trang-tri', description: 'Đèn thả trần trang trí phòng khách, phòng ăn', displayOrder: 1 },
  { slug: 'den-tuong', name: 'Đèn Tường', parentSlug: 'den-trang-tri', description: 'Đèn gắn tường phòng ngủ, hành lang, ban công', displayOrder: 2 },
  { slug: 'den-chum', name: 'Đèn Chùm', parentSlug: 'den-trang-tri', description: 'Đèn chùm pha lê, đồng cao cấp', displayOrder: 3 },
  { slug: 'den-smart-rgb', name: 'Smart RGB', parentSlug: 'den-thong-minh', description: 'Đèn thông minh đổi màu 16 triệu màu', displayOrder: 1 },
  { slug: 'den-smart-wifi', name: 'Smart WiFi', parentSlug: 'den-thong-minh', description: 'Đèn thông minh kết nối WiFi / App', displayOrder: 2 },
  { slug: 'den-ngu-de-ban', name: 'Đèn Ngủ Để Bàn', parentSlug: 'den-phong-ngu', description: 'Đèn ngủ LED để bàn đầu giường', displayOrder: 1 },
  { slug: 'den-dau-giuong', name: 'Đèn Đầu Giường', parentSlug: 'den-phong-ngu', description: 'Đèn LED treo đầu giường', displayOrder: 2 },
  { slug: 'den-solar-garden', name: 'Đèn Solar Sân Vườn', parentSlug: 'den-nang-luong-mat-troi', description: 'Đèn năng lượng mặt trời trang trí sân vườn', displayOrder: 1 },
  { slug: 'den-solar-cam-bien', name: 'Đèn Solar Cảm Biến', parentSlug: 'den-nang-luong-mat-troi', description: 'Đèn solar tích hợp cảm biến chuyển động', displayOrder: 2 },
];

const BRAND_SEEDS = [
  { slug: 'smartlight', name: 'SmartLight', description: 'Thương hiệu chính của hệ thống SmartLight Việt Nam', isFeatured: true },
  { slug: 'philips', name: 'Philips', description: 'Thương hiệu chiếu sáng hàng đầu thế giới (Hà Lan)', isFeatured: true },
  { slug: 'rang-dong', name: 'Rạng Đông', description: 'Thương hiệu Việt Nam lâu đời, chuyên đèn LED dân dụng', isFeatured: true },
  { slug: 'xiaomi', name: 'Xiaomi', description: 'Hệ sinh thái nhà thông minh Xiaomi (Trung Quốc)', isFeatured: true },
];

const ATTRIBUTE_SEEDS = [
  { code: 'power', displayName: 'Công suất', unit: 'W', dataType: AttributeDataType.TEXT, isFilterable: true, isRequired: true, sortOrder: 1 },
  { code: 'color-temp', displayName: 'Nhiệt độ màu', unit: 'K', dataType: AttributeDataType.TEXT, isFilterable: true, isRequired: false, sortOrder: 2 },
  { code: 'voltage', displayName: 'Điện áp', unit: 'V', dataType: AttributeDataType.TEXT, isFilterable: false, isRequired: false, sortOrder: 3 },
  { code: 'lifetime', displayName: 'Tuổi thọ', unit: 'h', dataType: AttributeDataType.NUMBER, isFilterable: false, isRequired: false, sortOrder: 4 },
  { code: 'warranty', displayName: 'Bảo hành', unit: 'tháng', dataType: AttributeDataType.NUMBER, isFilterable: false, isRequired: false, sortOrder: 5 },
  { code: 'dimmable', displayName: 'Có thể điều chỉnh', dataType: AttributeDataType.BOOLEAN, isFilterable: true, isRequired: false, sortOrder: 6 },
  { code: 'beam-angle', displayName: 'Góc chiếu', unit: '°', dataType: AttributeDataType.NUMBER, isFilterable: false, isRequired: false, sortOrder: 7 },
  { code: 'color-rendering', displayName: 'Chỉ số hoàn màu (CRI)', unit: 'Ra', dataType: AttributeDataType.NUMBER, isFilterable: false, isRequired: false, sortOrder: 8 },
];

interface ProductSeed {
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  categorySlug: string;
  brandSlug: string;
  basePrice: number;
  compareAtPrice?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  tags: string[];
  metaTitle: string;
  metaDesc: string;
  variants: Array<{
    sku: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    isDefault?: boolean;
    attributes: Record<string, string>;
    stock: number;
  }>;
  attributes: Array<{
    code: string;
    valueText?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
  }>;
}

/* =============================================================================
 *  PRODUCT SEED — 10 products
 * ============================================================================= */

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'den-led-am-tran-smartlight-x1',
    name: 'Đèn LED Âm Trần SmartLight X1',
    shortDesc: 'Đèn downlight LED âm trần siêu mỏng, tiết kiệm điện',
    description:
      'Đèn LED âm trần SmartLight X1 siêu mỏng, chỉ 2cm. Tuổi thọ 25.000 giờ, bảo hành 24 tháng. CRI ≥ 80 cho ánh sáng trung thực. Phù hợp phòng khách, phòng ngủ, hành lang.',
    categorySlug: 'den-led-downlight',
    brandSlug: 'smartlight',
    basePrice: 145000,
    compareAtPrice: 195000,
    isFeatured: true,
    isNewArrival: true,
    tags: ['downlight', 'âm trần', 'smartlight', 'siêu mỏng'],
    metaTitle: 'Đèn LED âm trần SmartLight X1 — Giá tốt 2026',
    metaDesc: 'Đèn LED âm trần SmartLight X1 chính hãng, bảo hành 24 tháng. 4 mức công suất.',
    variants: [
      { sku: 'SL-X1-12W-WHITE', name: '12W Trắng', price: 145000, isDefault: true, attributes: { watt: '12w', color: 'white' }, stock: 100 },
      { sku: 'SL-X1-18W-WHITE', name: '18W Trắng', price: 185000, attributes: { watt: '18w', color: 'white' }, stock: 100 },
      { sku: 'SL-X1-18W-YELLOW', name: '18W Vàng', price: 185000, attributes: { watt: '18w', color: 'yellow' }, stock: 80 },
      { sku: 'SL-X1-24W-WHITE', name: '24W Trắng', price: 245000, compareAtPrice: 295000, attributes: { watt: '24w', color: 'white' }, stock: 60 },
    ],
    attributes: [
      { code: 'power', valueText: '12W/18W/24W' },
      { code: 'color-temp', valueText: '6500K' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 25000 },
      { code: 'warranty', valueNumber: 24 },
      { code: 'dimmable', valueBoolean: false },
      { code: 'beam-angle', valueNumber: 120 },
      { code: 'color-rendering', valueNumber: 80 },
    ],
  },
  {
    slug: 'philips-led-bulb-9w-e27',
    name: 'Bóng Đèn LED Philips 9W E27',
    shortDesc: 'Bóng LED Philips chính hãng, tiết kiệm 85% điện',
    description:
      'Bóng đèn LED Philips 9W thay thế bóng sợi đốt 60W. Ánh sáng trắng ấm 3000K, đuôi E27 phổ thông. Tuổi thọ 15.000 giờ, bảo hành chính hãng 24 tháng.',
    categorySlug: 'den-led-bulb',
    brandSlug: 'philips',
    basePrice: 45000,
    compareAtPrice: 65000,
    isFeatured: true,
    tags: ['led', 'bulb', 'e27', 'philips'],
    metaTitle: 'Bóng LED Philips 9W E27 — Chính hãng',
    metaDesc: 'Bóng LED Philips 9W E27 chính hãng, bảo hành 24 tháng.',
    variants: [
      { sku: 'PHIL-LED-9W-WW', name: 'Trắng ấm 3000K', price: 45000, compareAtPrice: 65000, isDefault: true, attributes: { color: 'warm-white' }, stock: 100 },
      { sku: 'PHIL-LED-9W-DL', name: 'Trắng lạnh 6500K', price: 45000, attributes: { color: 'daylight' }, stock: 80 },
      { sku: 'PHIL-LED-9W-CW', name: 'Trung tính 4000K', price: 45000, attributes: { color: 'cool-white' }, stock: 60 },
    ],
    attributes: [
      { code: 'power', valueText: '9W' },
      { code: 'color-temp', valueText: '3000K/4000K/6500K' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 15000 },
      { code: 'warranty', valueNumber: 24 },
      { code: 'dimmable', valueBoolean: false },
    ],
  },
  {
    slug: 'philips-led-bulb-12w-e27',
    name: 'Bóng Đèn LED Philips 12W E27',
    shortDesc: 'Bóng LED Philips 12W tương đương 100W sợi đốt',
    description: 'Bóng đèn LED Philips 12W thay thế bóng sợi đốt 100W. CRI ≥ 80, tuổi thọ 15.000 giờ.',
    categorySlug: 'den-led-bulb',
    brandSlug: 'philips',
    basePrice: 65000,
    compareAtPrice: 85000,
    tags: ['led', 'bulb', 'philips'],
    metaTitle: 'Bóng LED Philips 12W E27',
    metaDesc: 'Bóng LED Philips 12W tiết kiệm điện, ánh sáng chất lượng cao.',
    variants: [
      { sku: 'PHIL-LED-12W-WW', name: 'Trắng ấm 3000K', price: 65000, compareAtPrice: 85000, isDefault: true, attributes: { color: 'warm-white' }, stock: 75 },
      { sku: 'PHIL-LED-12W-DL', name: 'Trắng lạnh 6500K', price: 65000, attributes: { color: 'daylight' }, stock: 50 },
    ],
    attributes: [
      { code: 'power', valueText: '12W' },
      { code: 'color-temp', valueText: '3000K' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 15000 },
      { code: 'warranty', valueNumber: 24 },
    ],
  },
  {
    slug: 'rang-dong-led-bulb-7w',
    name: 'Bóng Đèn LED Rạng Đông 7W',
    shortDesc: 'Bóng LED Rạng Đông thương hiệu Việt, bảo hành 24 tháng',
    description:
      'Bóng đèn LED Rạng Đông 7W tiết kiệm điện. Bảo hành chính hãng 24 tháng. Ánh sáng trắng ấm 3000K, CRI ≥ 80.',
    categorySlug: 'den-led-bulb',
    brandSlug: 'rang-dong',
    basePrice: 32000,
    compareAtPrice: 45000,
    isFeatured: true,
    tags: ['led', 'bulb', 'rạng đông', 'vietnam'],
    metaTitle: 'Bóng LED Rạng Đông 7W — Thương hiệu Việt',
    metaDesc: 'Bóng LED Rạng Đông 7W chính hãng, bảo hành 24 tháng.',
    variants: [
      { sku: 'RD-LED-7W-WW', name: 'Trắng ấm', price: 32000, compareAtPrice: 45000, isDefault: true, attributes: { color: 'warm-white' }, stock: 200 },
      { sku: 'RD-LED-7W-DL', name: 'Trắng lạnh', price: 32000, attributes: { color: 'daylight' }, stock: 150 },
      { sku: 'RD-LED-7W-CW', name: 'Trung tính', price: 32000, attributes: { color: 'cool-white' }, stock: 100 },
    ],
    attributes: [
      { code: 'power', valueText: '7W' },
      { code: 'color-temp', valueText: '3000K' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 15000 },
      { code: 'warranty', valueNumber: 24 },
    ],
  },
  {
    slug: 'den-led-tuyp-rang-dong-t8-18w',
    name: 'Đèn LED Tuýp Rạng Đông T8 18W 1.2m',
    shortDesc: 'Tuýp LED Rạng Đông thay thế tuýp huỳnh quang',
    description: 'Đèn tuýp LED Rạng Đông T8 18W chiều dài 1.2m, thay thế trực tiếp cho tuýp huỳnh quang 36W. Tiết kiệm 50% điện năng.',
    categorySlug: 'den-led-tube',
    brandSlug: 'rang-dong',
    basePrice: 85000,
    compareAtPrice: 120000,
    isFeatured: true,
    isNewArrival: true,
    tags: ['led', 'tuýp', 'rạng đông', 't8'],
    metaTitle: 'Tuýp LED Rạng Đông T8 18W 1.2m',
    metaDesc: 'Tuýp LED T8 Rạng Đông chính hãng, bảo hành 24 tháng.',
    variants: [
      { sku: 'RD-T8-18W-CW', name: 'Trắng 6500K 1.2m', price: 85000, compareAtPrice: 120000, isDefault: true, attributes: { length: '1.2m', color: 'daylight' }, stock: 40 },
      { sku: 'RD-T8-9W-CW', name: 'Trắng 6500K 0.6m', price: 65000, attributes: { length: '0.6m', color: 'daylight' }, stock: 30 },
    ],
    attributes: [
      { code: 'power', valueText: '18W' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 30000 },
      { code: 'warranty', valueNumber: 24 },
      { code: 'beam-angle', valueNumber: 180 },
    ],
  },
  {
    slug: 'den-pha-led-50w-ip65',
    name: 'Đèn Pha LED 50W IP65 SmartLight',
    shortDesc: 'Đèn pha LED 50W chống nước IP65, chiếu sáng ngoài trời',
    description: 'Đèn pha LED SmartLight 50W IP65 chống nước, chiếu sáng sân vườn, biển quảng cáo, công trường. Tuổi thọ 25.000 giờ.',
    categorySlug: 'den-pha-led',
    brandSlug: 'smartlight',
    basePrice: 250000,
    compareAtPrice: 320000,
    isFeatured: true,
    tags: ['đèn pha', 'outdoor', 'ip65', 'smartlight'],
    metaTitle: 'Đèn pha LED 50W IP65 SmartLight',
    metaDesc: 'Đèn pha LED SmartLight 50W IP65 chống nước, bảo hành 12 tháng.',
    variants: [
      { sku: 'SL-PL-50W-WW', name: 'Trắng ấm', price: 250000, compareAtPrice: 320000, isDefault: true, attributes: { color: 'warm-white' }, stock: 25 },
      { sku: 'SL-PL-50W-DL', name: 'Trắng lạnh', price: 250000, attributes: { color: 'daylight' }, stock: 30 },
      { sku: 'SL-PL-100W-DL', name: 'Trắng lạnh 100W', price: 450000, compareAtPrice: 550000, attributes: { color: 'daylight', watt: '100w' }, stock: 15 },
    ],
    attributes: [
      { code: 'power', valueText: '50W/100W' },
      { code: 'voltage', valueText: '220V' },
      { code: 'lifetime', valueNumber: 25000 },
      { code: 'warranty', valueNumber: 12 },
      { code: 'beam-angle', valueNumber: 120 },
    ],
  },
  {
    slug: 'den-tha-pha-le-30cm',
    name: 'Đèn Thả Pha Lê 30cm SmartLight',
    shortDesc: 'Đèn thả pha lê sang trọng cho phòng khách',
    description: 'Đèn thả trần pha lê nhập khẩu, ánh sáng vàng ấm, phù hợp phòng khách và phòng ăn. Có thể điều chỉnh độ sáng (dimmable).',
    categorySlug: 'den-tha',
    brandSlug: 'smartlight',
    basePrice: 850000,
    compareAtPrice: 1200000,
    isFeatured: true,
    tags: ['thả', 'pha lê', 'trang trí'],
    metaTitle: 'Đèn thả pha lê 30cm SmartLight',
    metaDesc: 'Đèn thả pha lê cao cấp, bảo hành 12 tháng.',
    variants: [
      { sku: 'SL-TL-30-GOLD', name: 'Vàng', price: 850000, compareAtPrice: 1200000, isDefault: true, attributes: { color: 'gold' }, stock: 8 },
      { sku: 'SL-TL-30-SILVER', name: 'Bạc', price: 850000, attributes: { color: 'silver' }, stock: 6 },
    ],
    attributes: [
      { code: 'power', valueText: '40W' },
      { code: 'voltage', valueText: '220V' },
      { code: 'warranty', valueNumber: 12 },
      { code: 'dimmable', valueBoolean: true },
      { code: 'color-temp', valueText: '3000K' },
    ],
  },
  {
    slug: 'den-tuong-phong-ngu-led',
    name: 'Đèn Tường Phòng Ngủ LED SmartLight',
    shortDesc: 'Đèn gắn tường phòng ngủ ánh sáng ấm 2700K',
    description: 'Đèn tường LED SmartLight phòng ngủ, ánh sáng vàng ấm 2700K, thiết kế hiện đại, tiết kiệm điện. Bảo hành 12 tháng.',
    categorySlug: 'den-tuong',
    brandSlug: 'smartlight',
    basePrice: 280000,
    tags: ['tường', 'phòng ngủ'],
    metaTitle: 'Đèn tường phòng ngủ LED SmartLight',
    metaDesc: 'Đèn LED gắn tường phòng ngủ, ánh sáng vàng ấm 2700K.',
    variants: [
      { sku: 'SL-WL-WW', name: 'Trắng ấm', price: 280000, isDefault: true, attributes: { color: 'warm-white' }, stock: 15 },
      { sku: 'SL-WL-DL', name: 'Trắng lạnh', price: 280000, attributes: { color: 'daylight' }, stock: 10 },
    ],
    attributes: [
      { code: 'power', valueText: '12W' },
      { code: 'color-temp', valueText: '2700K' },
      { code: 'voltage', valueText: '220V' },
      { code: 'warranty', valueNumber: 12 },
    ],
  },
  {
    slug: 'xiaomi-smart-led-bulb',
    name: 'Đèn LED Smart Xiaomi WiFi RGB',
    shortDesc: 'Đèn LED Xiaomi thông minh 16 triệu màu, điều khiển qua App',
    description: 'Bóng đèn LED Xiaomi Mi Smart LED Bulb 16 triệu màu, điều khiển qua WiFi / App Mi Home. Tương thích Google Assistant, Alexa. Công suất 9W.',
    categorySlug: 'den-smart-rgb',
    brandSlug: 'xiaomi',
    basePrice: 195000,
    compareAtPrice: 250000,
    isFeatured: true,
    isNewArrival: true,
    tags: ['smart', 'rgb', 'wifi', 'xiaomi', 'iot'],
    metaTitle: 'Đèn LED Smart Xiaomi WiFi RGB 16 triệu màu',
    metaDesc: 'Đèn LED Xiaomi Smart RGB điều khiển qua app, 16 triệu màu.',
    variants: [
      { sku: 'XM-RGB-9W', name: 'RGB 9W WiFi', price: 195000, compareAtPrice: 250000, isDefault: true, attributes: { protocol: 'wifi' }, stock: 35 },
      { sku: 'XM-RGB-12W', name: 'RGB 12W WiFi', price: 245000, attributes: { protocol: 'wifi', watt: '12w' }, stock: 20 },
    ],
    attributes: [
      { code: 'power', valueText: '9W/12W' },
      { code: 'voltage', valueText: '220V' },
      { code: 'warranty', valueNumber: 12 },
      { code: 'dimmable', valueBoolean: true },
    ],
  },
  {
    slug: 'den-solar-cam-bien-100w',
    name: 'Đèn Solar Cảm Biến Chuyển Động 100W SmartLight',
    shortDesc: 'Đèn năng lượng mặt trời 100W có cảm biến, IP65',
    description: 'Đèn LED năng lượng mặt trời SmartLight 100W IP65, cảm biến chuyển động PIR tự bật/tắt. Pin Lithium dung lượng cao, thời gian chiếu sáng 8-12 giờ.',
    categorySlug: 'den-solar-cam-bien',
    brandSlug: 'smartlight',
    basePrice: 320000,
    isFeatured: true,
    tags: ['solar', 'cảm biến', 'outdoor', 'ip65'],
    metaTitle: 'Đèn Solar cảm biến chuyển động 100W SmartLight',
    metaDesc: 'Đèn năng lượng mặt trời 100W cảm biến PIR, IP65.',
    variants: [
      { sku: 'SL-SOL-100W', name: 'Cảm biến 100W', price: 320000, isDefault: true, attributes: { watt: '100w', sensor: 'pir' }, stock: 20 },
      { sku: 'SL-SOL-200W', name: 'Cảm biến 200W', price: 480000, attributes: { watt: '200w', sensor: 'pir' }, stock: 10 },
    ],
    attributes: [
      { code: 'power', valueText: '100W/200W' },
      { code: 'voltage', valueText: '6V' },
      { code: 'warranty', valueNumber: 12 },
    ],
  },
  {
    slug: 'den-ngu-de-ban-cam-ung',
    name: 'Đèn Ngủ Để Bàn Cảm Ứng SmartLight',
    shortDesc: 'Đèn ngủ LED cảm ứng chạm, 3 mức sáng, sạc USB',
    description: 'Đèn ngủ để bàn LED cảm ứng SmartLight, 3 mức sáng, sạc USB. Phù hợp đầu giường, văn phòng.',
    categorySlug: 'den-ngu-de-ban',
    brandSlug: 'smartlight',
    basePrice: 350000,
    isNewArrival: true,
    tags: ['đèn ngủ', 'cảm ứng', 'usb'],
    metaTitle: 'Đèn ngủ cảm ứng để bàn SmartLight',
    metaDesc: 'Đèn ngủ LED cảm ứng 3 mức sáng, sạc USB.',
    variants: [
      { sku: 'SL-NL-CT-WOOD', name: 'Gỗ tự nhiên', price: 350000, isDefault: true, attributes: { material: 'wood' }, stock: 30 },
      { sku: 'SL-NL-CT-WHITE', name: 'Trắng', price: 350000, attributes: { material: 'plastic' }, stock: 45 },
    ],
    attributes: [
      { code: 'power', valueText: '5W' },
      { code: 'voltage', valueText: '5V USB' },
      { code: 'warranty', valueNumber: 6 },
      { code: 'dimmable', valueBoolean: true },
    ],
  },
];

/* =============================================================================
 *  PROMOTION + VOUCHER SEEDS
 * ============================================================================= */

const PROMOTION_WELCOME = {
  name: 'WELCOME10 — Giảm 10% cho khách hàng mới',
  description:
    'Voucher chào mừng khách hàng mới. Giảm 10% cho đơn hàng từ 200.000 VND.',
  type: PromotionType.PERCENTAGE,
  scope: DiscountScope.ORDER,
  discountValue: 10,
  minimumOrderValue: 200000,
  maximumDiscount: 100000,
};

const VOUCHER_WELCOME = {
  code: 'WELCOME10',
  type: VoucherType.PUBLIC,
  usageLimit: 1000,
  perUserLimit: 1,
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
};

/* =============================================================================
 *  MAIN
 * ============================================================================= */

async function seedRbac(): Promise<void> {
  for (const p of PERMISSION_SEEDS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { displayName: p.displayName, category: p.category },
      create: p,
    });
  }

  for (const r of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {
        displayName: r.displayName,
        scope: RoleScope.SYSTEM,
        isActive: true,
      },
      create: {
        code: r.code,
        displayName: r.displayName,
        scope: RoleScope.SYSTEM,
        isActive: true,
      },
    });

    for (const permCode of r.permissions) {
      const perm = await prisma.permission.findUnique({
        where: { code: permCode },
      });
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
}

async function seedSuperAdmin(): Promise<void> {
  const existing = await prisma.adminUser.findUnique({
    where: { email: DEMO_ADMIN_EMAIL },
  });
  if (existing) {
    console.log(`[seed] Super admin exists: ${DEMO_ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(DEMO_ADMIN_PASSWORD);
  const admin = await prisma.adminUser.create({
    data: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      displayName: 'Super Admin',
      status: AdminUserStatus.ACTIVE,
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
  console.log(`[seed] Created super admin: ${DEMO_ADMIN_EMAIL}`);
  console.log(`[seed]   password: ${DEMO_ADMIN_PASSWORD} (CHANGE IN PRODUCTION)`);
}

async function seedDemoCustomer(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_CUSTOMER_EMAIL },
  });
  if (existing) {
    console.log(`[seed] Demo customer exists: ${DEMO_CUSTOMER_EMAIL}`);
    return;
  }

  const passwordHash = await hashPassword(DEMO_CUSTOMER_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: DEMO_CUSTOMER_EMAIL,
      passwordHash,
      firstName: 'Khách Hàng',
      lastName: 'Demo',
      phone: '+84901234567',
      locale: 'vi-VN',
      provider: AuthProvider.LOCAL,
      providerId: null,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const customerRole = await prisma.role.findUnique({
    where: { code: 'customer' },
  });
  if (customerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: customerRole.id },
      },
      update: {},
      create: { userId: user.id, roleId: customerRole.id },
    });
  }
  console.log(`[seed] Created demo customer: ${DEMO_CUSTOMER_EMAIL}`);
  console.log(`[seed]   password: ${DEMO_CUSTOMER_PASSWORD}`);
}

async function bindCustomers(): Promise<void> {
  const customerRole = await prisma.role.findUnique({
    where: { code: 'customer' },
  });
  if (!customerRole) return;
  const users = await prisma.user.findMany({
    select: { id: true },
    take: 1000,
  });
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

async function seedCatalog(): Promise<void> {
  // Brands
  for (const b of BRAND_SEEDS) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, description: b.description, isFeatured: b.isFeatured ?? false },
      create: {
        slug: b.slug,
        name: b.name,
        description: b.description,
        isFeatured: b.isFeatured ?? false,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`[seed] Brands: ${BRAND_SEEDS.length}`);

  // Attributes
  for (const a of ATTRIBUTE_SEEDS) {
    await prisma.productAttribute.upsert({
      where: { code: a.code },
      update: {
        displayName: a.displayName,
        unit: a.unit ?? null,
        dataType: a.dataType,
        isFilterable: a.isFilterable,
        isRequired: a.isRequired,
        sortOrder: a.sortOrder,
      },
      create: {
        code: a.code,
        displayName: a.displayName,
        unit: a.unit ?? null,
        dataType: a.dataType,
        isFilterable: a.isFilterable,
        isRequired: a.isRequired,
        sortOrder: a.sortOrder,
      },
    });
  }
  console.log(`[seed] Attributes: ${ATTRIBUTE_SEEDS.length}`);

  // Categories — pass 1: roots, pass 2: children
  const slugToId = new Map<string, string>();
  const roots = CATEGORY_SEEDS.filter((c) => !c.parentSlug);
  for (const c of roots) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isFeatured: c.isFeatured ?? false,
        status: 'ACTIVE',
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isFeatured: c.isFeatured ?? false,
        status: 'ACTIVE',
        level: 0,
        path: '/',
      },
    });
    slugToId.set(c.slug, row.id);
  }
  const children = CATEGORY_SEEDS.filter((c) => c.parentSlug);
  for (const c of children) {
    const parentId = slugToId.get(c.parentSlug!);
    const parent = parentId
      ? await prisma.category.findUnique({ where: { id: parentId } })
      : null;
    const level = parent ? parent.level + 1 : 0;
    const path = parent ? `${parent.path}${parent.id}/` : '/';
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isFeatured: c.isFeatured ?? false,
        status: 'ACTIVE',
      },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder,
        isFeatured: c.isFeatured ?? false,
        status: 'ACTIVE',
        level,
        path,
        parentId: parentId ?? null,
      },
    });
    slugToId.set(c.slug, row.id);
  }
  console.log(`[seed] Categories: ${CATEGORY_SEEDS.length}`);

  // Products
  const attrRows = await prisma.productAttribute.findMany({});
  const codeToId = new Map(attrRows.map((a) => [a.code, a.id]));

  for (const p of PRODUCT_SEEDS) {
    const categoryId = slugToId.get(p.categorySlug);
    const brand = await prisma.brand.findUnique({ where: { slug: p.brandSlug } });
    if (!categoryId || !brand) {
      console.warn(`[seed] Skip product ${p.slug}: missing category/brand`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortDesc: p.shortDesc,
        description: p.description,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        isFeatured: p.isFeatured ?? false,
        isNewArrival: p.isNewArrival ?? false,
        tags: p.tags,
        metaTitle: p.metaTitle,
        metaDesc: p.metaDesc,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      create: {
        slug: p.slug,
        name: p.name,
        shortDesc: p.shortDesc,
        description: p.description,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice ?? null,
        isFeatured: p.isFeatured ?? false,
        isNewArrival: p.isNewArrival ?? false,
        tags: p.tags,
        metaTitle: p.metaTitle,
        metaDesc: p.metaDesc,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        categoryId,
        brandId: brand.id,
      },
    });

    // Variants
    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          isDefault: v.isDefault ?? false,
        },
        create: {
          sku: v.sku,
          name: v.name,
          price: v.price,
          compareAtPrice: v.compareAtPrice ?? null,
          isDefault: v.isDefault ?? false,
          status: 'ACTIVE',
          attributesJson: v.attributes ?? {},
          productId: product.id,
        },
      });

      // Inventory
      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { onHand: v.stock, available: v.stock },
        create: {
          productVariantId: variant.id,
          warehouseCode: 'MAIN',
          onHand: v.stock,
          reserved: 0,
          available: v.stock,
          lowStockThreshold: 5,
        },
      });
    }

    // Attributes values
    for (const av of p.attributes) {
      const attributeId = codeToId.get(av.code);
      if (!attributeId) continue;
      await prisma.productAttributeValue.upsert({
        where: {
          productId_attributeId: {
            productId: product.id,
            attributeId,
          },
        },
        update: {
          valueText: av.valueText ?? null,
          valueNumber: av.valueNumber ?? null,
          valueBoolean: av.valueBoolean ?? null,
        },
        create: {
          productId: product.id,
          attributeId,
          valueText: av.valueText ?? null,
          valueNumber: av.valueNumber ?? null,
          valueBoolean: av.valueBoolean ?? null,
        },
      });
    }
  }
  console.log(`[seed] Products: ${PRODUCT_SEEDS.length} (with variants + inventory)`);
}

async function seedWelcomePromotion(): Promise<void> {
  // 1. Upsert the promotion record
  const promotion = await prisma.promotion.upsert({
    where: { id: 'welcome10-promotion-seed' }, // fixed id for idempotency
    update: {
      name: PROMOTION_WELCOME.name,
      description: PROMOTION_WELCOME.description,
      type: PROMOTION_WELCOME.type,
      status: PromotionStatus.ACTIVE,
      scope: PROMOTION_WELCOME.scope,
      discountValue: PROMOTION_WELCOME.discountValue,
      minimumOrderValue: PROMOTION_WELCOME.minimumOrderValue,
      maximumDiscount: PROMOTION_WELCOME.maximumDiscount,
      startAt: new Date(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: 'welcome10-promotion-seed',
      name: PROMOTION_WELCOME.name,
      description: PROMOTION_WELCOME.description,
      type: PROMOTION_WELCOME.type,
      status: PromotionStatus.ACTIVE,
      scope: PROMOTION_WELCOME.scope,
      discountValue: PROMOTION_WELCOME.discountValue,
      minimumOrderValue: PROMOTION_WELCOME.minimumOrderValue,
      maximumDiscount: PROMOTION_WELCOME.maximumDiscount,
      startAt: new Date(),
      endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      priority: 100,
      stackable: false,
      usageLimitType: UsageLimitType.TOTAL,
      usageLimit: 1000,
    },
  });

  // 2. Upsert the WELCOME10 voucher
  await prisma.voucher.upsert({
    where: { code: VOUCHER_WELCOME.code },
    update: {
      promotionId: promotion.id,
      type: VOUCHER_WELCOME.type,
      status: PromotionStatus.ACTIVE,
      usageLimitType: UsageLimitType.TOTAL,
      usageLimit: VOUCHER_WELCOME.usageLimit,
      perUserLimit: VOUCHER_WELCOME.perUserLimit,
      expiresAt: VOUCHER_WELCOME.expiresAt,
    },
    create: {
      code: VOUCHER_WELCOME.code,
      promotionId: promotion.id,
      type: VOUCHER_WELCOME.type,
      status: PromotionStatus.ACTIVE,
      usageLimitType: UsageLimitType.TOTAL,
      usageLimit: VOUCHER_WELCOME.usageLimit,
      perUserLimit: VOUCHER_WELCOME.perUserLimit,
      expiresAt: VOUCHER_WELCOME.expiresAt,
    },
  });

  console.log(`[seed] Welcome promotion + voucher: ${VOUCHER_WELCOME.code}`);
  console.log(
    `[seed]   ${PROMOTION_WELCOME.discountValue}% off, min ${PROMOTION_WELCOME.minimumOrderValue} VND, max ${PROMOTION_WELCOME.maximumDiscount} VND`,
  );
}

async function main(): Promise<void> {
  console.log('');
  console.log('============================================================');
  console.log(' SmartLight seed — Phase 17.5 demo data');
  console.log('============================================================');
  await seedRbac();
  await seedSuperAdmin();
  await seedDemoCustomer();
  await bindCustomers();
  await seedCatalog();
  await seedWelcomePromotion();
  console.log('');
  console.log('[seed] Done. Demo credentials:');
  console.log(`       admin:    ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`       customer: ${DEMO_CUSTOMER_EMAIL} / ${DEMO_CUSTOMER_PASSWORD}`);
  console.log('       (CHANGE THESE IN PRODUCTION)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('[seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
