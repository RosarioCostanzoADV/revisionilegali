const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '..');
const dockerfilePath = path.join(frontendRoot, 'Dockerfile');
const composePath = path.resolve(frontendRoot, '..', 'docker', 'docker-compose.yml');

test('frontend build is configured with NEXT_PUBLIC_GATEWAY_URL', () => {
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  const compose = fs.readFileSync(composePath, 'utf8');

  assert.match(dockerfile, /ARG\s+NEXT_PUBLIC_GATEWAY_URL/);
  assert.match(dockerfile, /ENV\s+NEXT_PUBLIC_GATEWAY_URL=\$\{NEXT_PUBLIC_GATEWAY_URL\}/);
  assert.match(compose, /frontend:[\s\S]*build:[\s\S]*context:\s*\.\.\/frontend[\s\S]*args:[\s\S]*NEXT_PUBLIC_GATEWAY_URL:\s*http:\/\/localhost:8080/);
});
