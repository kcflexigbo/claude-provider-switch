#!/usr/bin/env node
'use strict';

const profiles = require('../lib/profiles');

const g = profiles.getGlobalDefault();

console.log('');
if (!g) {
  console.log('  no global default set (~/.claude/settings.json has no provider)');
  console.log('  a bare `claude` will use its own login\n');
  process.exit(0);
}

console.log('  global default (what a bare `claude` uses)');
console.log(`    base  : ${g.baseUrl}`);
console.log(`    model : ${g.model}`);
console.log(`    token : ${profiles.maskKey(g.token)}`);
console.log('');
console.log('  this is global — changing it hot-reloads into running sessions');
console.log('  prefer `cc-run <provider>` for per-session isolation\n');
