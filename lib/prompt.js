'use strict';

const readline = require('readline');

function makeRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY)
  });
}

function ask(question, defaultValue) {
  const rl = makeRL();
  const suffix = defaultValue ? ` (${defaultValue})` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix} `, (answer) => {
      rl.close();
      const v = answer.trim();
      resolve(v || defaultValue || '');
    });
  });
}

/** Prompt without echoing the typed characters (for API keys). */
function askHidden(question) {
  const rl = makeRL();
  let printedPrompt = false;
  const original = rl._writeToOutput.bind(rl);
  rl._writeToOutput = function (str) {
    if (!printedPrompt) {
      original(str);
      printedPrompt = true;
    }
    // everything after the prompt (the echo) is swallowed
  };
  return new Promise((resolve) => {
    rl.question(`${question} `, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

function confirm(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  return ask(`${question} ${hint}`).then((v) => {
    if (!v) return defaultYes;
    return /^y(es)?$/i.test(v);
  });
}

async function choose(question, options) {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}${opt.hint ? `  ${opt.hint}` : ''}`);
  });
  for (;;) {
    const raw = await ask('Choose a number:');
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].value;
    const byName = options.find((o) => o.value === raw);
    if (byName) return byName.value;
    console.log('  not a valid choice');
  }
}

module.exports = { ask, askHidden, confirm, choose };
