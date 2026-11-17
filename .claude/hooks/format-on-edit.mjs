#!/usr/bin/env node
// Claude Code PostToolUse hook: formats the edited file with the project's own Prettier, if installed.
// Never blocks: formatting problems are not worth stopping the agent for. Lint runs in CI.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const FORMATTABLE = /\.(js|jsx|mjs|ts|tsx|css|html|json|md|ya?ml)$/i;

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const file = input?.tool_input?.file_path;
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const prettier = join(dir, 'node_modules', '.bin', 'prettier');
  if (file && FORMATTABLE.test(file) && existsSync(prettier) && !file.includes('node_modules')) {
    execFileSync(prettier, ['--write', '--log-level', 'silent', file], { cwd: dir, stdio: 'ignore', timeout: 15000 });
  }
} catch {
  // ignore: formatting is best effort
}
process.exit(0);
