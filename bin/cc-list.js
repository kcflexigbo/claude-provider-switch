#!/usr/bin/env node
'use strict';

const profiles = require('../lib/profiles');

const rows = profiles.list();

if (!rows.length) {
  console.log('\n  no providers configured yet — run:  cc-setup\n');
  process.exit(0);
}

const nameW = Math.max(9, ...rows.map((r) => r.name.length));
const modelW = Math.max(6, ...rows.map((r) => r.model.length));

console.log('');
console.log(`  ${'PROVIDER'.padEnd(nameW)}  ${'MODEL'.padEnd(modelW)}  BASE URL`);
console.log(`  ${'-'.repeat(nameW)}  ${'-'.repeat(modelW)}  ${'-'.repeat(40)}`);
for (const r of rows) {
  console.log(`  ${r.name.padEnd(nameW)}  ${r.model.padEnd(modelW)}  ${r.baseUrl}`);
}
console.log('');
console.log(`  profiles: ${profiles.DIR}`);
console.log('');
console.log('  launch with:  cc-run <provider>');
console.log('');
