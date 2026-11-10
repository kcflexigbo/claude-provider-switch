'use strict';

const { spawn } = require('child_process');

/** Quote an argument for cmd.exe when shell:true is used on Windows. */
function quoteWin(arg) {
  if (/^[\w./:=@-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * Launch the `claude` CLI with inherited stdio so it behaves exactly as if the
 * user had typed the command themselves. Returns nothing; exits with the
 * child's status.
 */
function runClaude(args) {
  const isWin = process.platform === 'win32';
  const command = isWin ? 'claude.cmd' : 'claude';
  const finalArgs = isWin ? args.map(quoteWin) : args;

  // A CLAUDE_CODE_CHILD_SESSION marker can be inherited from a parent process
  // (a shell or editor started inside another Claude Code session). When that
  // happens a *top-level* launch is misread as a nested child and transcript
  // saving is silently disabled, which breaks --resume. Strip it so sessions
  // launched through cc-run always persist.
  const env = { ...process.env };
  const inheritedMarker = env.CLAUDE_CODE_CHILD_SESSION;
  delete env.CLAUDE_CODE_CHILD_SESSION;
  if (inheritedMarker) {
    console.error('· cleared inherited CLAUDE_CODE_CHILD_SESSION — this session will be saved');
  }

  const child = spawn(command, finalArgs, {
    stdio: 'inherit',
    shell: isWin,
    env
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error('\n  claude was not found on your PATH.');
      console.error('  Install it first:  npm install -g @anthropic-ai/claude-code\n');
    } else {
      console.error(`\n  failed to start claude: ${err.message}\n`);
    }
    process.exit(127);
  });

  child.on('exit', (code, signal) => {
    if (signal) process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
    process.exit(code ?? 0);
  });
}

module.exports = { runClaude };
