#!/usr/bin/env node
'use strict';

const { PRESETS, buildProfile } = require('../lib/providers');
const profiles = require('../lib/profiles');
const { ask, askHidden, confirm, choose } = require('../lib/prompt');

const HELP = `
cc-setup — configure a Claude Code provider

Usage:
  cc-setup                                  interactive
  cc-setup --provider ark --key <KEY>       non-interactive

Options:
  --provider <name>        ark | deepseek | custom | existing profile name
  --name <name>            profile name to save under (default: provider)
  --key <key>              API key (otherwise prompted, hidden)
  --model <id>             model ID (default: provider preset)
  --base-url <url>         endpoint (custom provider, or to override a preset)
  --effort <level>         low | medium | high | max   (default: max)
  --skip-permissions       pass --dangerously-skip-permissions  (default)
  --no-skip-permissions    don't pass it
  --set-default            also make it the global default
  --no-set-default         don't touch ~/.claude/settings.json  (default)
  --force                  overwrite without asking
  --list                   list saved providers
  --help                   this text

Nothing secret is stored in the package; keys go to
~/.claude/providers/<name>.json with mode 0600 on this machine only.
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    const takesValue = [
      'provider', 'name', 'key', 'model', 'base-url', 'effort'
    ].includes(key);
    if (takesValue) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function validUrl(v) {
  return /^https?:\/\//i.test(v);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.list) {
    require('./cc-list.js');
    return;
  }

  const existing = profiles.list();
  const nonInteractive = Boolean(args.key || process.env.CC_SETUP_KEY);

  console.log('\n  Claude Code provider setup');
  console.log('  ──────────────────────────');
  if (existing.length) {
    console.log('  saved: ' + existing.map((p) => p.name).join(', '));
  } else {
    console.log('  no providers saved yet');
  }

  // ---- choose target -------------------------------------------------
  let provider = args.provider;
  if (!provider) {
    if (nonInteractive) {
      provider = 'ark';
    } else {
      const options = [
        { label: PRESETS.ark.label, hint: '  (DeepSeek V4.1 Flash)', value: 'ark' },
        { label: PRESETS.deepseek.label, hint: '', value: 'deepseek' },
        { label: PRESETS.syns.label, hint: '  (GPT-6 / Grok)', value: 'syns' },
        ...existing
          .filter((p) => !PRESETS[p.name])
          .map((p) => ({
            label: `${p.name}  — reconfigure`,
            hint: `  (${p.model})`,
            value: p.name
          })),
        { label: PRESETS.custom.label, value: 'custom' }
      ];
      provider = await choose('Which provider?', options);
    }
  }

  const priorMeta = profiles.load(provider)?.meta || {};
  const presetKey = PRESETS[provider] ? provider : (priorMeta.preset || 'custom');
  const preset = PRESETS[presetKey];

  const name = args.name || provider;
  profiles.assertName(name);

  const prior = profiles.load(name);
  if (prior && !args.force && !nonInteractive) {
    const ok = await confirm(`  '${name}' already exists. Overwrite?`, false);
    if (!ok) {
      console.log('\n  cancelled\n');
      return;
    }
  }

  // ---- endpoint + model ---------------------------------------------
  let baseUrl = args['base-url'] || preset.baseUrl;
  if (!baseUrl) {
    baseUrl = await ask('  Endpoint URL (Anthropic-compatible):');
  }
  if (!validUrl(baseUrl)) {
    console.error(`\n  invalid URL: ${baseUrl}\n`);
    process.exit(1);
  }

  const priorModel = prior?.settings?.model;
  const defaultModel = args.model || preset.model || priorModel || '';
  let model = args.model || (nonInteractive ? defaultModel : '');
  if (!model) {
    model = await ask('  Model ID:', defaultModel);
  }
  if (!model) {
    console.error('\n  a model ID is required\n');
    process.exit(1);
  }

  // ---- api key -------------------------------------------------------
  const priorKey = prior?.settings?.env?.ANTHROPIC_AUTH_TOKEN || '';
  let apiKey = args.key || process.env.CC_SETUP_KEY || '';
  if (!apiKey) {
    const hint = priorKey ? '  API key (leave blank to keep the saved one):' : '  API key:';
    apiKey = await askHidden(hint);
    if (!apiKey) apiKey = priorKey;
  }
  if (!apiKey) {
    console.error('\n  an API key is required\n');
    process.exit(1);
  }

  // ---- preferences ---------------------------------------------------
  let skipPermissions;
  if (args['skip-permissions'] === true) skipPermissions = true;
  else if (args['no-skip-permissions'] === true) skipPermissions = false;
  else if (prior) skipPermissions = prior.meta.skipPermissions !== false;
  else skipPermissions = nonInteractive ? true : await confirm('  Pass --dangerously-skip-permissions?', true);

  let setDefault;
  if (args['set-default'] === true) setDefault = true;
  else if (args['no-set-default'] === true) setDefault = false;
  else setDefault = nonInteractive ? false : await confirm('  Also make it the global default for a bare `claude`?', false);

  // ---- write ---------------------------------------------------------
  const settings = buildProfile({
    preset: presetKey,
    apiKey,
    model,
    baseUrl,
    effort: args.effort || 'max'
  });

  const file = profiles.save(name, settings, {
    preset: presetKey,
    skipPermissions,
    createdAt: prior?.meta?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  let defaultNote = '';
  if (setDefault) {
    profiles.setGlobalDefault(name);
    defaultNote = `  global default now: ${name}\n`;
  }

  console.log('\n  saved');
  console.log(`    file   : ${file}`);
  console.log(`    base   : ${baseUrl}`);
  console.log(`    model  : ${model}`);
  console.log(`    key    : ${profiles.maskKey(apiKey)}`);
  console.log(`    skip   : ${skipPermissions ? 'yes' : 'no'}`);
  if (defaultNote) process.stdout.write(`  ${defaultNote}`);
  console.log('\n  launch it:');
  console.log(`    cc-run ${name}\n`);
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});
