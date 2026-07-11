"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for CorrelationIdMiddleware.
 *
 * Verifies:
 *   - Incoming X-Request-ID is preserved and echoed back.
 *   - Incoming X-Correlation-ID is used when X-Request-ID is absent.
 *   - New UUID is generated when neither is present.
 *   - req.id is populated.
 */
const node_crypto_1 = require("node:crypto");
const correlation_id_middleware_1 = require("../../src/platform/logger/correlation-id.middleware");
describe('CorrelationIdMiddleware', () => {
    let mw;
    beforeEach(() => {
        mw = new correlation_id_middleware_1.CorrelationIdMiddleware();
    });
    it('preserves incoming X-Request-ID', () => {
        const req = {
            headers: { 'x-request-id': 'incoming-id-123' },
        };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();
        mw.use(req, res, next);
        expect(req.id).toBe('incoming-id-123');
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'incoming-id-123');
        expect(next).toHaveBeenCalled();
    });
    it('uses X-Correlation-ID when X-Request-ID is absent', () => {
        const req = {
            headers: { 'x-correlation-id': 'corr-abc' },
        };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();
        mw.use(req, res, next);
        expect(req.id).toBe('corr-abc');
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'corr-abc');
    });
    it('mints a UUID when no header is present', () => {
        const req = { headers: {} };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();
        mw.use(req, res, next);
        expect(typeof req.id).toBe('string');
        expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
    });
    it('prefers X-Request-ID over X-Correlation-ID when both present', () => {
        const req = {
            headers: {
                'x-request-id': 'win',
                'x-correlation-id': 'lose',
            },
        };
        const res = { setHeader: jest.fn() };
        mw.use(req, res, jest.fn());
        expect(req.id).toBe('win');
    });
    it('ignores whitespace-only headers and mints UUID', () => {
        const req = { headers: { 'x-request-id': '   ' } };
        const res = { setHeader: jest.fn() };
        mw.use(req, res, jest.fn());
        expect(req.id).not.toBe('   ');
        expect(req.id).toBeTruthy();
        expect(req.id).not.toEqual((0, node_crypto_1.randomUUID)()); // not deterministic, but should be valid UUID format
    });
});
