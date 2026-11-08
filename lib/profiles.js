'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DIR = path.join(os.homedir(), '.claude', 'providers');
const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function assertName(name) {
  if (!NAME_RE.test(name || '')) {
    throw new Error(`invalid provider name ${JSON.stringify(name)} (letters, digits, - and _ only)`);
  }
}

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

function settingsPath(name) {
  assertName(name);
  return path.join(DIR, `${name}.json`);
}

function metaPath(name) {
  assertName(name);
  return path.join(DIR, `${name}.meta.json`);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${file}: ${err.message}`);
  }
}

function writeJson(file, obj, mode = 0o600) {
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, { mode });
  try {
    fs.chmodSync(tmp, mode);
  } catch {
    /* Windows: mode is advisory */
  }
  fs.renameSync(tmp, file);
}

function save(name, settings, meta = {}) {
  ensureDir();
  writeJson(settingsPath(name), settings, 0o600);
  writeJson(metaPath(name), meta, 0o600);
  return settingsPath(name);
}

function load(name) {
  const settings = readJson(settingsPath(name));
  if (!settings) return null;
  return { name, settings, meta: readJson(metaPath(name)) || {} };
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .filter((n) => NAME_RE.test(n))
    .sort()
    .map((name) => {
      const entry = load(name);
      return {
        name,
        model: entry?.settings?.model || '(unknown)',
        baseUrl: entry?.settings?.env?.ANTHROPIC_BASE_URL || '(unknown)',
        skipPermissions: entry?.meta?.skipPermissions !== false
      };
    });
}

/** Merge a provider's settings into the global ~/.claude/settings.json. */
function setGlobalDefault(name) {
  const entry = load(name);
  if (!entry) throw new Error(`unknown provider '${name}'`);

  const current = readJson(SETTINGS) || {};
  const merged = {
    ...current,
    env: entry.settings.env,
    model: entry.settings.model,
    modelSettings: entry.settings.modelSettings || {},
    effortLevel: entry.settings.effortLevel || current.effortLevel
  };
  ensureDir();
  writeJson(SETTINGS, merged, 0o600);
  return SETTINGS;
}

function getGlobalDefault() {
  const s = readJson(SETTINGS);
  if (!s) return null;
  return {
    model: s.model || '(unset)',
    baseUrl: s.env?.ANTHROPIC_BASE_URL || '(unset)',
    token: s.env?.ANTHROPIC_AUTH_TOKEN || ''
  };
}

function maskKey(key) {
  if (!key) return '(none)';
  if (key.length <= 12) return `${key.slice(0, 3)}…`;
  return `${key.slice(0, 10)}…${key.slice(-6)}`;
}

module.exports = {
  DIR,
  SETTINGS,
  assertName,
  settingsPath,
  metaPath,
  save,
  load,
  list,
  setGlobalDefault,
  getGlobalDefault,
  maskKey
};
