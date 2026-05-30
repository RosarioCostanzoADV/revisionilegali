const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '..');
const routePath = path.join(frontendRoot, 'app', 'api', 'accounting', 'imports', 'ai-preview', 'route.ts');
const importsRoutePath = path.join(frontendRoot, 'app', 'api', 'accounting', 'imports', 'route.ts');

test('frontend exposes an ai-preview proxy route for accounting imports', () => {
  assert.ok(fs.existsSync(routePath), 'Missing frontend ai-preview proxy route');

  const routeSource = fs.readFileSync(routePath, 'utf8');
  assert.match(routeSource, /\/api\/accounting\/imports\/ai-preview/);
  assert.match(routeSource, /request\.formData\(\)/);
});

test('frontend exposes a base proxy route for accounting imports writes', () => {
  assert.ok(fs.existsSync(importsRoutePath), 'Missing frontend accounting imports proxy route');

  const routeSource = fs.readFileSync(importsRoutePath, 'utf8');
  assert.match(routeSource, /\/api\/accounting\/imports/);
  assert.match(routeSource, /request\.text\(\)/);
});