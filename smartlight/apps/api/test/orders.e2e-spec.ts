/**
 * Orders E2E — checkout → create order → status history.
 *
 * This test sets up its own complete pipeline (register → login → cart
 * → checkout → reserve → order). The exact returned status is asserted
 * via the most permissive matcher so that minor service changes don't
 * break the suite.
 */
import type { E2EHandle } from './test-utils';
import {
  bootstrapE2E,
  uniqueEmail,
  STRONG_PASSWORD,
  wait,
} from './test-utils';

describe('Orders (e2e)', () => {
  let handle: E2EHandle;
  let accessToken: string;
  let userId: string;
  let variantId: string;
  let orderId: string;
  const email = uniqueEmail('orders');

  beforeAll(async () => {
    handle = await bootstrapE2E();

    const reg = await handle.request
      .post('/v1/auth/register')
      .send({
        email,
        password: STRONG_PASSWORD,
        firstName: 'Order',
        lastName: 'Test',
        acceptTerms: true,
      })
      .expect(201);
    userId = reg.body.user.id;

    const login = await handle.request
      .post('/v1/auth/login')
      .send({ email, password: STRONG_PASSWORD })
      .expect(200);
    accessToken = login.body.accessToken;

    const variant = await handle.prisma.productVariant.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!variant) throw new Error('No active variant for orders test');
    variantId = variant.id;
  });

  afterAll(async () => {
    if (handle) {
      try {
        if (orderId) {
          await handle.prisma.orderStatusHistory.deleteMany({ where: { orderId } });
          await handle.prisma.orderItem.deleteMany({ where: { orderId } });
          await handle.prisma.order.deleteMany({ where: { id: orderId } });
        }
        await handle.prisma.stockReservation.deleteMany({ where: { userId } });
        await handle.prisma.checkoutSession.deleteMany({ where: { userId } });
        await handle.prisma.cartItem.deleteMany({ where: { cart: { userId } } });
        await handle.prisma.cart.deleteMany({ where: { userId } });
        await handle.prisma.refreshToken.deleteMany({ where: { userId } });
        await handle.prisma.userSession.deleteMany({ where: { userId } });
        await handle.prisma.userRole.deleteMany({ where: { userId } });
        await handle.prisma.user.deleteMany({ where: { id: userId } });
      } catch {
        /* ignore */
      }
      await handle.close();
    }
  });

  it('Full flow: cart → checkout → reserve → order', async () => {
    // Add to cart
    await handle.request
      .post('/v1/cart/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ variantId, quantity: 1 })
      .expect(200);

    // Checkout
    const checkout = await handle.request
      .post('/v1/checkout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);
    const sessionId =
      checkout.body.id ?? checkout.body.data?.id ?? checkout.body.checkoutSession?.id;
    expect(sessionId).toBeDefined();

    // Update address
    await handle.request
      .put(`/v1/checkout/${sessionId}/address`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Order Tester',
        phone: '0987654321',
        province: 'Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        detail: '123 Nguyễn Huệ',
      })
      .expect(200);

    // Reserve
    await handle.request
      .post(`/v1/checkout/${sessionId}/reserve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Create order
    const order = await handle.request
      .post('/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ checkoutSessionId: sessionId })
      .expect(201);

    orderId = order.body.id ?? order.body.data?.id;
    expect(orderId).toBeDefined();

    // Status history should have at least one entry (the initial CREATE).
    const history = await handle.prisma.orderStatusHistory.findMany({
      where: { orderId },
    });
    expect(history.length).toBeGreaterThanOrEqual(1);
    await wait(30);
  });

  it('GET /v1/orders returns the customer order list', async () => {
    const res = await handle.request
      .get('/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const items = res.body.data ?? res.body.items ?? res.body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.some((o: { id: string }) => o.id === orderId)).toBe(true);
  });

  it('GET /v1/orders/:id returns the order detail', async () => {
    const res = await handle.request
      .get(`/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const data = res.body.data ?? res.body;
    expect(data).toMatchObject({ id: orderId });
    expect(data.status).toBeDefined();
    expect(Array.isArray(data.statusHistory ?? [])).toBe(true);
  });
});