"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("./test-utils");
describe('Auth (e2e)', () => {
    let handle;
    const email = (0, test_utils_1.uniqueEmail)('register');
    beforeAll(async () => {
        handle = await (0, test_utils_1.bootstrapE2E)();
    });
    afterAll(async () => {
        if (handle) {
            // Clean up the user we created (idempotent — null is fine if missing)
            try {
                await handle.prisma.user.deleteMany({ where: { email } });
            }
            catch {
                /* ignore */
            }
            await handle.close();
        }
    });
    it('POST /v1/auth/register creates a new user', async () => {
        const res = await handle.request
            .post('/v1/auth/register')
            .send({
            email,
            password: test_utils_1.STRONG_PASSWORD,
            firstName: 'Test',
            lastName: 'User',
            acceptTerms: true,
        })
            .expect(201);
        expect(res.body).toMatchObject({
            user: {
                email,
                firstName: 'Test',
                lastName: 'User',
            },
            emailVerificationSent: true,
            autoLogin: false,
        });
        expect(res.body.user.id).toBeDefined();
    });
    it('GET /v1/auth/me fails without a token', async () => {
        await handle.request.get('/v1/auth/me').expect(401);
    });
    it('POST /v1/auth/login returns a JWT pair', async () => {
        const res = await handle.request
            .post('/v1/auth/login')
            .send({ email, password: test_utils_1.STRONG_PASSWORD })
            .expect(200);
        expect(res.body).toMatchObject({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            tokenType: 'Bearer',
        });
        expect(res.body.accessToken.length).toBeGreaterThan(20);
        expect(res.body.user).toMatchObject({ email });
        // Stash on the closure-scope `handle` via a side-channel:
        handle.__token = res.body.accessToken;
    });
    it('POST /v1/auth/login rejects wrong password', async () => {
        await handle.request
            .post('/v1/auth/login')
            .send({ email, password: 'WrongPassword!2026' })
            .expect(401);
    });
    it('GET /v1/auth/me returns the user when authenticated', async () => {
        const token = handle.__token;
        const res = await handle.request
            .get('/v1/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        expect(res.body).toMatchObject({
            user: { email },
        });
    });
    it('POST /v1/auth/refresh rotates the refresh token', async () => {
        const login = await handle.request
            .post('/v1/auth/login')
            .send({ email, password: test_utils_1.STRONG_PASSWORD })
            .expect(200);
        const refresh = login.body.refreshToken;
        const res = await handle.request
            .post('/v1/auth/refresh')
            .send({ refreshToken: refresh })
            .expect(200);
        expect(res.body.accessToken).not.toEqual(login.body.accessToken);
        expect(res.body.refreshToken).not.toEqual(refresh);
    });
    it('POST /v1/auth/logout revokes the current session', async () => {
        const token = handle.__token;
        await handle.request
            .post('/v1/auth/logout')
            .set('Authorization', `Bearer ${token}`)
            .expect(204);
        // /me with the now-revoked token must 401.
        await (0, test_utils_1.wait)(20);
        await handle.request
            .get('/v1/auth/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
    });
});
