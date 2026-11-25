#!/usr/bin/env node
// Self-test for protect-files.mjs. Run: npm run test:hooks
// Each case: expected exit code (0 allowed, 2 blocked), tool name, tool input.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'protect-files.mjs');
const root = mkdtempSync(join(tmpdir(), 'protect-files-'));
mkdirSync(join(root, '.claude'));
writeFileSync(join(root, '.claude/public-env-files'), 'functions/.env.demo-project\n');
const link = `${root}-link`;
symlinkSync(root, link);

const cases = [
  [0, 'Bash', { command: 'git commit -m "Never commit .env files"' }],
  [0, 'Bash', { command: "git commit -m \"$(cat <<'EOF'\nKeep .env out of git\nEOF\n)\"" }],
  [0, 'Bash', { command: "git commit -F - <<'EOF'\nmention .env.local here\nEOF" }],
  [0, 'Bash', { command: "git commit -m 'single quotes mention .env'" }],
  [2, 'Bash', { command: 'git commit -m "ok" && cat .env' }],
  [2, 'Bash', { command: 'git commit -m "$(cat .env)"' }],
  [2, 'Bash', { command: 'git commit -m "`cat .env`"' }],
  [2, 'Bash', { command: 'git commit -F - <<EOF\n$(cat .env)\nEOF' }],
  [2, 'Bash', { command: 'git commit -m "add" .env' }],
  [2, 'Bash', { command: "git commit -m \"$(cat <<'EOF'\nmsg\nEOF\n)\" ; cat .env.local" }],
  [2, 'Bash', { command: 'cat .env' }],
  [2, 'Bash', { command: 'echo "commit .env"' }],
  [2, 'Bash', { command: 'cat functions/.secret.local' }],
  [2, 'Bash', { command: 'printenv' }],
  [0, 'Bash', { command: 'git diff functions/.env.demo-project' }],
  [0, 'Bash', { command: 'cd functions && cat .env.demo-project' }],
  [2, 'Bash', { command: 'cd functions && cat .env.other' }],
  [0, 'Edit', { file_path: `${root}/functions/.env.demo-project` }],
  [0, 'Edit', { file_path: `${link}/functions/.env.demo-project` }],
  [2, 'Read', { file_path: `${root}/.env` }],
  [2, 'Read', { file_path: `${root}/functions/.env` }],
  [2, 'Read', { file_path: `${root}/functions/.secret.local` }],
  [0, 'Read', { file_path: `${root}/.env.example` }],
];

let failed = 0;
for (const [expected, tool, input] of cases) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ tool_name: tool, tool_input: input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
  if (r.status !== expected) {
    failed++;
    console.log(`FAIL expected ${expected} got ${r.status}: ${tool} ${JSON.stringify(input)}`);
  }
}
console.log(`${cases.length - failed}/${cases.length} protect-files cases passed`);
process.exit(failed ? 1 : 0);
