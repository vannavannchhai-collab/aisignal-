'use strict';
/* Smoke tests (offline-safe): cleaner, safety, security, supported */
const assert = require('assert');
const { cleanUrl } = require('../src/utils/cleaner');
const { analyzeSafety } = require('../src/utils/safety');
const { validateUrlSync } = require('../src/utils/security');
const { findSupported, SUPPORTED } = require('../src/utils/supported');

// cleaner
let c = cleanUrl('https://example.com/p?utm_source=fb&fbclid=123&id=42&gclid=x');
assert.strictEqual(c.cleaned, 'https://example.com/p?id=42'); assert.strictEqual(c.removed.length, 3);
c = cleanUrl('https://youtu.be/abc123?si=tracker');
assert.ok(!c.cleaned.includes('si='));
console.log('✓ cleaner');

// safety
let s = analyzeSafety('https://www.google.com/search?q=test');
assert.ok(s.score >= 80 && s.level === 'safe');
s = analyzeSafety('http://paypal-verify.login.xyz/account/update');
assert.ok(s.score < 55 && s.level === 'danger');
console.log('✓ safety');

// security / SSRF
assert.throws(() => validateUrlSync('http://127.0.0.1/admin'), /Private IP|blocked/);
assert.throws(() => validateUrlSync('http://169.254.169.254/latest/meta-data/'), /Private IP|blocked/);
assert.throws(() => validateUrlSync('file:///etc/passwd'));
assert.strictEqual(validateUrlSync('example.com/x'), 'https://example.com/x');
console.log('✓ security (SSRF blocked)');

// supported
assert.ok(SUPPORTED.length >= 100);
assert.ok(findSupported('bit.ly') && findSupported('bit.ly').category === 'shortener');
assert.ok(findSupported('www.linkvertise.com'));
console.log('✓ supported catalogue:', SUPPORTED.length, 'domains');

console.log('\n✅ ALL SMOKE TESTS PASSED');
