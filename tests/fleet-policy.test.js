const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { RETIRED_AIRCRAFT } = require('../fleet-policy.js');

test('retires aircraft that are not in the Thai fleet', () => {
  assert.deepEqual(RETIRED_AIRCRAFT, ['HS-TER', 'HS-TES', 'HS-TEU']);
});

test('seed aircraft excludes retired registrations', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('aircraft.js', 'utf8'), context);
  const seededRegs = context.window.SEED_AIRCRAFT.map(a => a.reg);
  assert.equal(seededRegs.filter(reg => RETIRED_AIRCRAFT.includes(reg)).length, 0);
});
