#!/usr/bin/env node
// OPTIONAL (see .claude/hooks/README.md). Stop hook: when Claude finishes a turn, checks the files
// edited in this session (recorded by track-edits.mjs) and asks Claude to split any that grew too long.
// "PostToolUse to track, Stop to validate": no refactor in the middle of coding, one check at the end.

import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const MAX_LINES = 400; // CUSTOMIZE
const CODE = /\.(js|jsx|mjs|ts|tsx|vue|svelte|py|sql)$/i;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
// Already continuing because of this hook: let Claude stop, to avoid a loop.
if (input.stop_hook_active) process.exit(0);

const state = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', '.state', `edits-${input.session_id || 'session'}.txt`);
if (!existsSync(state)) process.exit(0);

const files = [...new Set(readFileSync(state, 'utf8').split('\n').filter(Boolean))];
rmSync(state, { force: true });

const long = files
  .filter((f) => CODE.test(f) && existsSync(f))
  .map((f) => ({ f, n: readFileSync(f, 'utf8').split('\n').length }))
  .filter(({ n }) => n > MAX_LINES);

if (long.length) {
  const list = long.map(({ f, n }) => `- ${f} (${n} lines)`).join('\n');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `These files you edited are over ${MAX_LINES} lines:\n${list}\nPropose a split into smaller modules (do not do it yet unless the change is trivial), and mention it in your report.`,
  }));
}
process.exit(0);
