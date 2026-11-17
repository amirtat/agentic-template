#!/usr/bin/env node
// Installs the global layer into ~/.claude, once per computer:
//   1. the protect-files hook (blocks access to .env, keys and service-account files in EVERY project)
//   2. the "Claude needs you" sound (macOS), if not already set
// Safe to run again: it backs up settings.json first and never adds a hook twice.
//
// Usage (from the template folder): node global/install-global.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const templateRoot = join(here, '..');
const claudeDir = join(homedir(), '.claude');
const settingsPath = join(claudeDir, 'settings.json');
const hooksDir = join(claudeDir, 'hooks');

mkdirSync(hooksDir, { recursive: true });

// 1. Hook script
const hookTarget = join(hooksDir, 'protect-files.mjs');
copyFileSync(join(templateRoot, '.claude', 'hooks', 'protect-files.mjs'), hookTarget);
console.log(`copied protect-files hook to ${hookTarget}`);

// 2. Settings merge
let settings = {};
if (existsSync(settingsPath)) {
  const raw = readFileSync(settingsPath, 'utf8');
  const backup = `${settingsPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  writeFileSync(backup, raw);
  console.log(`backed up settings to ${backup}`);
  settings = JSON.parse(raw);
}
settings.hooks = settings.hooks || {};

const addHook = (event, matcher, command) => {
  settings.hooks[event] = settings.hooks[event] || [];
  const exists = settings.hooks[event].some((e) => (e.hooks || []).some((h) => h.command === command));
  if (exists) {
    console.log(`${event}: already present, skipped`);
    return;
  }
  const entry = { hooks: [{ type: 'command', command }] };
  if (matcher) entry.matcher = matcher;
  settings.hooks[event].push(entry);
  console.log(`${event}: added`);
};

addHook('PreToolUse', 'Read|Edit|Write|MultiEdit|Grep|Glob|Bash', `node "${hookTarget}"`);

if (platform() === 'darwin') {
  const hasSound = JSON.stringify(settings.hooks.Notification || []).includes('afplay');
  if (hasSound) console.log('Notification: a sound is already set, skipped');
  else addHook('Notification', null, 'afplay /System/Library/Sounds/Glass.aiff');
}

writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log(`updated ${settingsPath}`);

console.log('\nDone. Restart Claude Code, then run /hooks to check.');
