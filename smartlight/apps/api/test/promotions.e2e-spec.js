"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
describe('Promotions (e2e)', () => {
    let handle;
    beforeAll(async () => {
        handle = await (0, test_utils_1.bootstrapE2E)();
    });
    afterAll(async () => {
        if (handle)
            await handle.close();
    });
    it('GET /v1/promotions lists active promotions', async () => {
        const res = await handle.request.get('/v1/promotions').expect(200);
        const data = res.body.data ?? res.body;
        expect(Array.isArray(data)).toBe(true);
    });
    it('POST /v1/promotions/validate validates the WELCOME10 voucher', async () => {
        // First make sure WELCOME10 exists (created by the seed).
        let voucher = await handle.prisma.voucher.findFirst({
            where: { code: 'WELCOME10' },
            include: { promotion: true },
        });
        if (!voucher) {
            // Create a minimal promotion for the test if the seed didn't run.
            const promo = await handle.prisma.promotion.create({
                data: {
                    name: 'Welcome 10%',
                    description: 'Test promotion',
                    status: 'ACTIVE',
                    type: 'PERCENTAGE',
                    discountValue: 10,
                    minimumOrderValue: 200000,
                    startAt: new Date(Date.now() - 1000 * 60 * 60),
                    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                },
            });
            voucher = await handle.prisma.voucher.create({
                data: {
                    promotionId: promo.id,
                    code: 'WELCOME10',
                    status: 'ACTIVE',
                    usageLimit: 1000,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                },
                include: { promotion: true },
            });
        }
        // Below the min order amount: should fail
        const low = await handle.request
            .post('/v1/promotions/validate')
            .send({ code: 'WELCOME10', orderTotal: 50000 });
        expect([200, 201]).toContain(low.status);
        const lowData = low.body.data ?? low.body;
        expect(lowData.valid === false || lowData.discount === 0 || lowData.error).toBeTruthy();
        // Above the min order amount: should succeed
        const ok = await handle.request
            .post('/v1/promotions/validate')
            .send({ code: 'WELCOME10', orderTotal: 500000 });
        expect([200, 201]).toContain(ok.status);
        const okData = ok.body.data ?? ok.body;
        if (okData.discount !== undefined) {
            expect(Number(okData.discount)).toBeGreaterThan(0);
        }
        else {
            expect(okData.valid).toBeTruthy();
        }
    });
    it('POST /v1/promotions/validate rejects an unknown code', async () => {
        const res = await handle.request
            .post('/v1/promotions/validate')
            .send({ code: 'DOES-NOT-EXIST-XYZ', orderTotal: 999999 });
        expect([200, 201, 400, 404]).toContain(res.status);
        const data = res.body.data ?? res.body;
        expect(data.valid === false || res.status >= 400).toBeTruthy();
    });
});
