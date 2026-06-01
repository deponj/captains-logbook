const test = require('node:test');
const assert = require('node:assert/strict');
const { composeStampUTC } = require('../stamp-time.js');

test('composes an explicitly selected UTC stamp date and time', () => {
  assert.equal(
    composeStampUTC('2026-05-31', 22, 7),
    '2026-05-31T22:07:00.000Z'
  );
});
