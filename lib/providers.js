'use strict';

/**
 * Built-in provider presets.
 *
 * Only public, non-secret values live here (base URL, default model, tunables).
 * API keys are never stored in this repo -- cc-setup prompts for them and
 * writes them to ~/.claude/providers/<name>.json with mode 0600.
 */

const PRESETS = {
  ark: {
    label: 'Volcengine Ark (火山方舟)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/compatible',
    model: 'deepseek-v4-1-flash-261017',
    modelHint: 'e.g. deepseek-v4-1-flash-261017',
    docs: 'https://www.volcengine.com/docs/82379',
    env: {
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '786432',
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: '32000',
      CLAUDE_CODE_EFFORT_LEVEL: 'max'
    }
  },

  deepseek: {
    label: 'DeepSeek (official)',
    baseUrl: 'https://api.deepseek.com/anthropic',
    model: 'deepseek-flash[1m]',
    modelHint: 'e.g. deepseek-flash[1m] or deepseek-flash',
    docs: 'https://api-docs.deepseek.com',
    env: {
      CLAUDE_CODE_EFFORT_LEVEL: 'max',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '786432'
    }
  },

  syns: {
    label: 'Sub2API gateway (GPT / Grok)',
    baseUrl: 'https://syns.onesyn.ai:18080',
    model: 'gpt-6.1-sol',
    modelHint: 'gpt-6.1-sol | gpt-6-sol | grok-4.6 | codex-auto-review',
    docs: '',
    env: {
      CLAUDE_CODE_MAX_CONTEXT_TOKENS: '500000',
      CLAUDE_CODE_AUTO_COMPACT_WINDOW: '450000',
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: '32000'
    }
  },

  custom: {
    label: 'Custom Anthropic-compatible endpoint',
    baseUrl: '',
    model: '',
    modelHint: 'the model ID your gateway expects',
    docs: '',
    env: {}
  }
};

const MODEL_SLOTS = ['ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL'];

/**
 * Build a complete Claude Code settings object for one provider.
 * This object is what gets passed to `claude --settings <file>`.
 */
function buildProfile({ preset, apiKey, model, baseUrl, effort }) {
  const p = PRESETS[preset] || PRESETS.custom;
  const chosenModel = model || p.model;
  const chosenBase = baseUrl || p.baseUrl;
  const chosenEffort = effort || 'max';

  const env = {
    ANTHROPIC_BASE_URL: chosenBase,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_MODEL: chosenModel,
    ...(p.env || {})
  };

  for (const slot of MODEL_SLOTS) env[slot] = chosenModel;
  env.CLAUDE_CODE_SUBAGENT_MODEL = chosenModel;
  env.CLAUDE_CODE_EFFORT_LEVEL = chosenEffort;

  return {
    env,
    model: chosenModel,
    modelSettings: { [chosenModel]: { effortLevel: chosenEffort } },
    effortLevel: chosenEffort
  };
}

module.exports = { PRESETS, MODEL_SLOTS, buildProfile };
