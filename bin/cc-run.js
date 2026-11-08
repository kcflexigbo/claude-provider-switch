#!/usr/bin/env node
'use strict';

const profiles = require('../lib/profiles');
const { runClaude } = require('../lib/claude');

const HELP = `
cc-run — launch Claude Code on a saved provider profile

Usage:
  cc-run <provider> [claude args...]

Examples:
  cc-run ark                     start an interactive session on Ark
  cc-run deepseek                start an interactive session on DeepSeek
  cc-run ark -p "explain this"   headless one-shot
  cc-run ark --resume            resume a previous session

Other commands:
  cc-setup     add or update a provider
  cc-list      list saved providers
  cc-which     show the global default

Profiles live in ~/.claude/providers/ and are passed to Claude Code with
--settings, so switching never affects a session running elsewhere.
`;

function main() {
  const argv = process.argv.slice(2);
  const name = argv[0];

  if (!name || name === '-h' || name === '--help') {
    process.stdout.write(HELP);
    process.exit(name ? 0 : 1);
  }

  const entry = profiles.load(name);
  if (!entry) {
    console.error(`\n  unknown provider '${name}'`);
    const known = profiles.list();
    if (known.length) {
      console.error('  saved providers: ' + known.map((p) => p.name).join(', '));
    } else {
      console.error('  none configured yet — run:  cc-setup');
    }
    console.error('');
    process.exit(1);
  }

  const skip = entry.meta.skipPermissions !== false;
  const args = ['--settings', profiles.settingsPath(name)];
  if (skip) args.push('--dangerously-skip-permissions');
  args.push(...argv.slice(1));

  console.error(`▶ ${name}  (${entry.settings.model})`);
  runClaude(args);
}

main();
