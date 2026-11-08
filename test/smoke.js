'use strict';

/**
 * Cross-platform smoke test. Uses a throwaway HOME / USERPROFILE so it never
 * touches the real ~/.claude directory.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccps-test-'));

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok    ${label}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${label}: ${err.message}`);
  }
}

const env = { ...process.env, HOME: tmp, USERPROFILE: tmp };

function run(bin, args = []) {
  return execFileSync(process.execPath, [path.join(root, 'bin', bin), ...args], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

try {
  console.log(`temp home: ${tmp}`);

  run('cc-setup.js', ['--provider', 'ark', '--key', 'test-key-abcdef123456', '--no-set-default', '--force']);
  run('cc-setup.js', ['--provider', 'deepseek', '--key', 'ds-key-abcdef123456', '--no-set-default', '--force']);

  const dir = path.join(tmp, '.claude', 'providers');
  const arkFile = path.join(dir, 'ark.json');
  const arkMeta = path.join(dir, 'ark.meta.json');

  check('ark.json written', () => {
    if (!fs.existsSync(arkFile)) throw new Error('missing');
  });

  const ark = JSON.parse(fs.readFileSync(arkFile, 'utf8'));
  check('ark base url', () => {
    if (ark.env.ANTHROPIC_BASE_URL !== 'https://ark.cn-beijing.volces.com/api/compatible') {
      throw new Error(ark.env.ANTHROPIC_BASE_URL);
    }
  });
  check('ark model', () => {
    if (ark.model !== 'deepseek-v4-1-flash-261017') throw new Error(ark.model);
  });
  check('api key stored', () => {
    if (ark.env.ANTHROPIC_AUTH_TOKEN !== 'test-key-abcdef123456') throw new Error('key mismatch');
  });
  check('all model slots set', () => {
    for (const k of ['ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'CLAUDE_CODE_SUBAGENT_MODEL']) {
      if (!ark.env[k]) throw new Error(`missing ${k}`);
    }
  });
  check('context window declared', () => {
    if (ark.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS !== '1000000') throw new Error('missing');
  });
  check('meta records skipPermissions', () => {
    const meta = JSON.parse(fs.readFileSync(arkMeta, 'utf8'));
    if (meta.skipPermissions !== true) throw new Error('expected true');
  });

  check('cc-list shows both', () => {
    const out = run('cc-list.js');
    if (!out.includes('ark') || !out.includes('deepseek')) throw new Error(out);
  });

  check('cc-list masks keys', () => {
    const out = run('cc-list.js');
    if (out.includes('test-key-abcdef123456')) throw new Error('key leaked in listing');
  });

  check('cc-run rejects unknown provider', () => {
    try {
      run('cc-run.js', ['nope']);
      throw new Error('should have failed');
    } catch (err) {
      const msg = String(err.stderr || err.message);
      if (!/unknown provider/i.test(msg)) throw new Error(msg);
    }
  });

  check('cc-which after --set-default', () => {
    run('cc-setup.js', ['--provider', 'ark', '--key', 'test-key-abcdef123456', '--set-default', '--force']);
    const out = run('cc-which.js');
    if (!/ark|volces/i.test(out)) throw new Error(out);
  });

  check('global settings got an env block', () => {
    const s = JSON.parse(fs.readFileSync(path.join(tmp, '.claude', 'settings.json'), 'utf8'));
    if (!s.env || !s.env.ANTHROPIC_BASE_URL) throw new Error('no env');
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nall checks passed');
