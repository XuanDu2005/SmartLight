"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
describe('Catalog (e2e)', () => {
    let handle;
    beforeAll(async () => {
        handle = await (0, test_utils_1.bootstrapE2E)();
    });
    afterAll(async () => {
        if (handle)
            await handle.close();
    });
    it('GET /v1/catalog/products returns a list', async () => {
        const res = await handle.request
            .get('/v1/catalog/products')
            .query({ limit: 5 })
            .expect(200);
        expect(Array.isArray(res.body.items ?? res.body.data ?? res.body)).toBe(true);
    });
    it('GET /v1/catalog/products/slug/:slug returns a single product with variants', async () => {
        // Find any product to test against. We assume the seed (or prior test runs)
        // left at least one product. If not, create one inline.
        const product = await handle.prisma.product.findFirst({
            where: { status: 'PUBLISHED' },
            include: { variants: true },
        });
        let slug = product?.slug;
        let variantCount = product?.variants.length ?? 0;
        if (!slug) {
            // No products exist: create the bare minimum so the test is self-contained.
            const category = await handle.prisma.category.upsert({
                where: { slug: 'e2e-catalog-cat' },
                update: {},
                create: {
                    slug: 'e2e-catalog-cat',
                    name: 'E2E Category',
                    description: 'created by test',
                    status: 'ACTIVE',
                    level: 0,
                    path: '/',
                    displayOrder: 99,
                },
            });
            const brand = await handle.prisma.brand.upsert({
                where: { slug: 'e2e-catalog-brand' },
                update: {},
                create: {
                    slug: 'e2e-catalog-brand',
                    name: 'E2E Brand',
                    description: 'created by test',
                    status: 'ACTIVE',
                },
            });
            const created = await handle.prisma.product.create({
                data: {
                    slug: 'e2e-test-product',
                    name: 'E2E Test Product',
                    shortDesc: 'E2E',
                    description: 'created by test',
                    basePrice: 100000,
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    metaTitle: 'E2E',
                    metaDesc: 'E2E',
                    categoryId: category.id,
                    brandId: brand.id,
                    variants: {
                        create: [
                            { sku: 'E2E-SKU-1', name: 'Default', price: 100000, isDefault: true, status: 'ACTIVE' },
                        ],
                    },
                },
                include: { variants: true },
            });
            slug = created.slug;
            variantCount = created.variants.length;
        }
        const res = await handle.request
            .get(`/v1/catalog/products/slug/${slug}`)
            .query({ include: 'variants' })
            .expect(200);
        const data = res.body.data ?? res.body;
        expect(data).toMatchObject({ slug });
        expect((data.variants ?? []).length).toBeGreaterThanOrEqual(variantCount);
    });
    it('GET /v1/catalog/categories returns a category list', async () => {
        const res = await handle.request
            .get('/v1/catalog/categories')
            .expect(200);
        expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
    });
});
