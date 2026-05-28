const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./auth');

test('authenticateToken accepts token from auth_token cookie when Authorization is missing', async () => {
  const originalVerify = jwt.verify;
  jwt.verify = (token, secret, cb) => cb(null, { tenant_id: 't-1', role: 'owner' });

  const req = {
    headers: {
      cookie: 'theme=dark; auth_token=jwt-cookie-token; foo=bar',
    },
  };

  const statusLog = [];
  const res = {
    sendStatus(code) {
      statusLog.push(code);
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  await new Promise((resolve) => {
    authenticateToken(req, res, () => {
      next();
      resolve();
    });

    if (statusLog.length > 0) {
      resolve();
    }
  });

  jwt.verify = originalVerify;

  assert.equal(nextCalled, true);
  assert.deepEqual(statusLog, []);
  assert.equal(req.user.tenant_id, 't-1');
});
