#!/usr/bin/env node
// OPTIONAL (see .claude/hooks/README.md). PostToolUse on Edit|Write|MultiEdit:
// records each edited file so the Stop hook can check them once, at the end of the turn.

import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const file = input?.tool_input?.file_path;
  const dir = join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude', '.state');
  if (file) {
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, `edits-${input.session_id || 'session'}.txt`), file + '\n');
  }
} catch {
  // ignore
}
process.exit(0);
