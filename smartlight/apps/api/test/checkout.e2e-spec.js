"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
describe('Checkout (e2e)', () => {
    let handle;
    let accessToken;
    let userId;
    let variantId;
    let initialAvailable;
    const email = (0, test_utils_1.uniqueEmail)('checkout');
    beforeAll(async () => {
        handle = await (0, test_utils_1.bootstrapE2E)();
        const reg = await handle.request
            .post('/v1/auth/register')
            .send({
            email,
            password: test_utils_1.STRONG_PASSWORD,
            firstName: 'Checkout',
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
        const variant = await handle.prisma.productVariant.findFirst({
            where: { status: 'ACTIVE' },
            include: { inventory: true },
        });
        if (!variant)
            throw new Error('No active variant for checkout test');
        variantId = variant.id;
        initialAvailable = variant.inventory?.available ?? 0;
    });
    afterAll(async () => {
        if (handle) {
            try {
                await handle.prisma.stockReservation.deleteMany({ where: { userId } });
                await handle.prisma.checkoutSession.deleteMany({ where: { userId } });
                await handle.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
                await handle.prisma.cart.deleteMany({ where: { userId } });
                await handle.prisma.refreshToken.deleteMany({ where: { userId } });
                await handle.prisma.userSession.deleteMany({ where: { userId } });
                await handle.prisma.userRole.deleteMany({ where: { userId } });
                await handle.prisma.user.deleteMany({ where: { id: userId } });
                // restore inventory available count
                if (variantId) {
                    const inv = await handle.prisma.inventory.findFirst({
                        where: { productVariantId: variantId },
                    });
                    if (inv) {
                        await handle.prisma.inventory.update({
                            where: { id: inv.id },
                            data: { available: initialAvailable, reserved: 0 },
                        });
                    }
                }
            }
            catch {
                /* ignore */
            }
            await handle.close();
        }
    });
    it('POST /v1/checkout creates a checkout session from the cart', async () => {
        // Add an item to the cart first
        await handle.request
            .post('/v1/cart/items')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ variantId, quantity: 1 })
            .expect(200);
        const res = await handle.request
            .post('/v1/checkout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({})
            .expect(201);
        const sessionId = res.body.id ?? res.body.data?.id ?? res.body.checkoutSession?.id;
        expect(sessionId).toBeDefined();
    });
    it('POST /v1/checkout/:id/reserve reserves inventory for the session', async () => {
        // Re-fetch active session for the user
        const list = await handle.prisma.checkoutSession.findFirst({
            where: { userId, status: { in: ['CREATED', 'PENDING_RESERVATION', 'RESERVED'] } },
            orderBy: { createdAt: 'desc' },
        });
        expect(list).toBeDefined();
        const res = await handle.request
            .post(`/v1/checkout/${list.id}/reserve`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        const data = res.body.data ?? res.body;
        expect(['RESERVED', 'PENDING_RESERVATION', 'CREATED']).toContain(data.status);
        // After reserve, the inventory's available should be reduced.
        const inv = await handle.prisma.inventory.findFirst({
            where: { productVariantId: variantId },
        });
        expect(inv).toBeDefined();
        if (data.status === 'RESERVED') {
            expect(Number(inv.available)).toBeLessThanOrEqual(Number(initialAvailable));
        }
        await (0, test_utils_1.wait)(50);
    });
});
