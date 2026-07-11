"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
describe('Cart (e2e)', () => {
    let handle;
    let accessToken;
    let userId;
    let variantId;
    const email = (0, test_utils_1.uniqueEmail)('cart');
    beforeAll(async () => {
        handle = await (0, test_utils_1.bootstrapE2E)();
        // Register + login
        const reg = await handle.request
            .post('/v1/auth/register')
            .send({
            email,
            password: test_utils_1.STRONG_PASSWORD,
            firstName: 'Cart',
            lastName: 'Test',
            acceptTerms: true,
        })
            .expect(201);
        userId = reg.body.user.id;
        const login = await handle.request
            .post('/v1/auth/login')
            .send({ email, password: test_utils_1.STRONG_PASSWORD })
            .expect(200);
        accessToken = login.body.accessToken;
        // Find a variant to add to the cart
        const variant = await handle.prisma.productVariant.findFirst({
            where: { status: 'ACTIVE' },
        });
        if (!variant) {
            throw new Error('No active product variant found. Run the seed first.');
        }
        variantId = variant.id;
    });
    afterAll(async () => {
        if (handle) {
            try {
                // Cleanup: cart, user
                await handle.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
                await handle.prisma.cart.deleteMany({ where: { userId } });
                await handle.prisma.refreshToken.deleteMany({ where: { userId } });
                await handle.prisma.userSession.deleteMany({ where: { userId } });
                await handle.prisma.userRole.deleteMany({ where: { userId } });
                await handle.prisma.user.deleteMany({ where: { id: userId } });
            }
            catch {
                /* ignore */
            }
            await handle.close();
        }
    });
    it('GET /v1/cart creates + returns an active cart', async () => {
        const res = await handle.request
            .get('/v1/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        expect(res.body.id ?? res.body.cart?.id ?? res.body.data?.id).toBeDefined();
        expect(Array.isArray(res.body.items ?? res.body.data?.items ?? res.body)).toBeTruthy();
    });
    it('POST /v1/cart/items adds an item to the cart', async () => {
        const res = await handle.request
            .post('/v1/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ variantId, quantity: 2 })
            .expect(200);
        const items = res.body.items ?? res.body.data?.items ?? [];
        expect(items.length).toBeGreaterThanOrEqual(1);
        const added = items.find((i) => (i.productVariantId ?? i.variantId) === variantId);
        expect(added).toBeDefined();
        expect(added.quantity).toBe(2);
    });
    it('PATCH /v1/cart/items/:id updates the quantity', async () => {
        // Fetch current cart and find the item id
        const cart = await handle.request
            .get('/v1/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        const items = cart.body.items ?? cart.body.data?.items ?? [];
        const item = items.find((i) => (i.productVariantId ?? i.variantId) === variantId);
        expect(item).toBeDefined();
        const itemId = item.id;
        const res = await handle.request
            .patch(`/v1/cart/items/${itemId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ quantity: 5 })
            .expect(200);
        const itemsAfter = res.body.items ?? res.body.data?.items ?? [];
        const updated = itemsAfter.find((i) => i.id === itemId);
        expect(updated.quantity).toBe(5);
    });
    it('DELETE /v1/cart/items/:id removes the item', async () => {
        const cart = await handle.request
            .get('/v1/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        const items = cart.body.items ?? cart.body.data?.items ?? [];
        const item = items.find((i) => (i.productVariantId ?? i.variantId) === variantId);
        const itemId = item.id;
        await handle.request
            .delete(`/v1/cart/items/${itemId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        const cartAfter = await handle.request
            .get('/v1/cart')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        const itemsAfter = cartAfter.body.items ?? cartAfter.body.data?.items ?? [];
        const stillThere = itemsAfter.find((i) => i.id === itemId);
        expect(stillThere).toBeUndefined();
        await (0, test_utils_1.wait)(20);
    });
});
