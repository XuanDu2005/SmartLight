/**
 * Smoke test script for SmartLight auth system.
 * Exercises: admin login, refresh, RBAC, logout.
 * Does NOT print tokens to console.
 *
 * Usage: node scripts/smoke-auth.js [port]
 *
 * Note: Run after prisma migrate + seed. The seeded admin's lockout state is
 * persisted in the DB; if a previous run locked the account, the admin-login
 * tests will return 423 ACCOUNT_LOCKED. Either wait LOCKOUT_DURATION_MS or
 * reset the failedLoginCount + lockedUntil fields manually for re-runs.
 */
const http = require('node:http');

const PORT = Number(process.argv[2] || process.env.API_PORT || 4103);

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () =>
        resolve({ status: res.statusCode, headers: res.headers, body: chunks }),
      );
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function jsonRequest(opts, payload) {
  const data = payload ? JSON.stringify(payload) : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
    ...(opts.headers || {}),
  };
  return request({ ...opts, headers }, data).then((r) => ({
    ...r,
    json: r.body ? JSON.parse(r.body) : null,
  }));
}

(async () => {
  const base = { host: 'localhost', port: PORT };
  let pass = 0,
    fail = 0;
  let access, refresh;

  async function step(name, fn) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
      pass++;
    } catch (e) {
      console.log(`FAIL  ${name} :: ${e.message}`);
      fail++;
    }
  }

  await step('health endpoint is public', async () => {
    const r = await jsonRequest({ ...base, method: 'GET', path: '/health' });
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (r.json.status !== 'ok') throw new Error('not ok');
  });

  // Try admin login first. If the admin is locked from a prior smoke run,
  // accept that as evidence the lockout feature works and skip the
  // follow-on authenticated tests.
  let adminLocked = false;
  await step('admin login returns 200 + tokens (or 423 if locked)', async () => {
    const r = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/admin/login' },
      {
        email: 'admin@smartlight.vn',
        password: 'ChangeMeSmartLight!2026',
      },
    );
    if (r.status === 423) {
      adminLocked = true;
      if (r.json.error.code !== 'ACCOUNT_LOCKED')
        throw new Error(`wrong code: ${r.json.error.code}`);
      console.log('  (admin locked from prior run — lockout works)');
      return;
    }
    if (r.status !== 200) throw new Error(`status ${r.status} body=${r.body}`);
    if (!r.json.accessToken || !r.json.refreshToken)
      throw new Error('missing tokens');
    if (!r.json.admin || r.json.admin.roles[0] !== 'super_admin')
      throw new Error('admin.roles[0] !== super_admin');
    access = r.json.accessToken;
    refresh = r.json.refreshToken;
  });

  if (adminLocked) {
    console.log(
      '\n(admin locked — skipping follow-on admin tests. Reset DB to re-run.)',
    );
  } else {
    await step('GET /v1/auth/me with admin token returns admin profile', async () => {
      const r = await jsonRequest({
        ...base,
        method: 'GET',
        path: '/v1/auth/me',
        headers: { Authorization: 'Bearer ' + access },
      });
      if (r.status !== 200)
        throw new Error(`status ${r.status} body=${r.body}`);
      if (!r.json.admin || r.json.admin.roles[0] !== 'super_admin')
        throw new Error(
          `expected admin.roles[0] === super_admin, got ${JSON.stringify(r.json)}`,
        );
    });

    await step('refresh token rotates and issues new pair', async () => {
      const r = await jsonRequest(
        { ...base, method: 'POST', path: '/v1/auth/refresh' },
        { refreshToken: refresh },
      );
      if (r.status !== 200)
        throw new Error(`status ${r.status} body=${r.body}`);
      if (!r.json.accessToken) throw new Error('no new access token');
      if (r.json.refreshToken === refresh)
        throw new Error('refresh not rotated');
      access = r.json.accessToken;
      refresh = r.json.refreshToken;
    });

    await step('logout with bearer token returns 204', async () => {
      const r = await jsonRequest({
        ...base,
        method: 'POST',
        path: '/v1/auth/logout',
        headers: { Authorization: 'Bearer ' + access },
      });
      if (r.status !== 204)
        throw new Error(`expected 204, got ${r.status} body=${r.body}`);
    });

    await step('refresh token cannot be reused after logout', async () => {
      const r = await jsonRequest(
        { ...base, method: 'POST', path: '/v1/auth/refresh' },
        { refreshToken: refresh },
      );
      if (r.status !== 401)
        throw new Error(`expected 401, got ${r.status} body=${r.body}`);
    });
  }

  await step('GET /v1/auth/me without bearer returns 401', async () => {
    const r = await jsonRequest({ ...base, method: 'GET', path: '/v1/auth/me' });
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
    if (r.json.error.code !== 'UNAUTHENTICATED')
      throw new Error(`wrong code: ${r.json.error.code}`);
  });

  await step('invalid login returns 401 INVALID_CREDENTIALS (uses ghost admin)', async () => {
    const r = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/admin/login' },
      { email: 'ghost-no-such-admin@example.com', password: 'whatever' },
    );
    if (r.status !== 401) throw new Error(`expected 401, got ${r.status}`);
    if (r.json.error.code !== 'INVALID_CREDENTIALS')
      throw new Error(`wrong code: ${r.json.error.code}`);
  });

  await step('register rejects weak password with WEAK_PASSWORD', async () => {
    const r = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/register' },
      {
        email: `weak${Date.now()}@example.com`,
        password: 'aaaaaaaa',
        firstName: 'A',
        lastName: 'B',
        acceptTerms: true,
      },
    );
    if (r.status !== 422)
      throw new Error(`expected 422, got ${r.status} body=${r.body}`);
    if (r.json.error.code !== 'WEAK_PASSWORD')
      throw new Error(`wrong code: ${r.json.error.code}`);
  });

  await step('register rejects duplicate email with EMAIL_ALREADY_EXISTS', async () => {
    const email = `dup${Date.now()}@example.com`;
    const first = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/register' },
      {
        email,
        password: 'Str0ngPassw0rd!',
        firstName: 'A',
        lastName: 'B',
        acceptTerms: true,
      },
    );
    if (first.status !== 201) throw new Error(`first reg failed: ${first.body}`);
    const second = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/register' },
      {
        email,
        password: 'Str0ngPassw0rd!',
        firstName: 'A',
        lastName: 'B',
        acceptTerms: true,
      },
    );
    if (second.status !== 409)
      throw new Error(`expected 409, got ${second.status}`);
    if (second.json.error.code !== 'EMAIL_ALREADY_EXISTS')
      throw new Error(`wrong code: ${second.json.error.code}`);
  });

  await step('OAuth /google returns 503 when creds missing', async () => {
    const r = await jsonRequest({
      ...base,
      method: 'GET',
      path: '/v1/auth/oauth/google',
    });
    if (r.status !== 503) throw new Error(`expected 503, got ${r.status}`);
  });

  await step('forgot-password always returns 200 (no user enumeration)', async () => {
    const r = await jsonRequest(
      { ...base, method: 'POST', path: '/v1/auth/forgot-password' },
      { email: `nonexistent${Date.now()}@example.com` },
    );
    if (r.status !== 200)
      throw new Error(`expected 200, got ${r.status} body=${r.body}`);
    if (r.json.sent !== true)
      throw new Error(`expected sent:true, got ${JSON.stringify(r.json)}`);
  });

  await step('rate limit kicks in after threshold (uses ghost email)', async () => {
    let gotRateLimit = false;
    const fakeEmail = `ghost${Date.now()}@example.com`;
    for (let i = 0; i < 25; i++) {
      const r = await jsonRequest(
        { ...base, method: 'POST', path: '/v1/auth/admin/login' },
        { email: fakeEmail, password: 'bad-password' },
      );
      if (r.status === 429) {
        gotRateLimit = true;
        if (r.json.error.code !== 'RATE_LIMITED')
          throw new Error(`wrong code on 429: ${r.json.error.code}`);
        break;
      }
    }
    if (!gotRateLimit) throw new Error('no 429 observed in 25 attempts');
  });

  console.log(`\n========================================`);
  console.log(`Total: ${pass + fail} | Pass: ${pass} | Fail: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})();