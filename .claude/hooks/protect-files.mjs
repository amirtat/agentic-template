#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks reading, editing or shell access to secret files.
// Exit 2 blocks the tool call and shows the reason to Claude. Exit 0 lets it through.
// Allowed on purpose: .env.example (it holds placeholders only), and the exact paths listed in
// .claude/public-env-files: env files that hold no secrets and are committed, for example
// functions/.env.<project-id> (Firebase function params). One repo-relative path per line.

import { readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let PUBLIC_ENV_FILES = [];
try {
  PUBLIC_ENV_FILES = readFileSync(resolve(ROOT, '.claude/public-env-files'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    // Never allow a file that is a secret by name, whatever the list says.
    .filter((l) => !/(^|\/)\.env(\.local)?$/.test(l) && !/\.secret\.local$/.test(l));
} catch {}
const isPublicEnv = (p) => PUBLIC_ENV_FILES.includes(relative(ROOT, resolve(ROOT, p)).split('\\').join('/'));

// CUSTOMIZE: add patterns for other secret files in this project.
const SECRET_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\.(?!example$)[\w.-]+$/,          // .env.local, .env.production ... but not .env.example
  /\.(pem|key|p12|pfx)$/i,
  /^id_(rsa|ed25519|ecdsa)(\.pub)?$/,
  /service[-_]?account.*\.json$/i,
  /-firebase-adminsdk-.*\.json$/i,
  /^credentials\.json$/i,
  /^\.npmrc$/,
  /^\.secret\.local$/,                       // Firebase emulator secret overrides
];

// Same idea for shell commands: any token that names a secret file.
const SECRET_IN_COMMAND = [
  /(^|[\s'"/<:])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'"/;|&>)])/,
  /\.(pem|key|p12|pfx)(?=$|[\s'";|&>)])/i,
  /service[-_]?account[\w.-]*\.json/i,
  /-firebase-adminsdk-[\w.-]*\.json/i,
  /(^|[\s'"/])credentials\.json/i,
  /(^|[\s'"/])id_(rsa|ed25519|ecdsa)\b/,
  /\bprintenv\b|(^|[\s;|&])env(\s*$|\s*[|;&])/,  // dumping the whole environment
];

function isSecretPath(p) {
  if (!p || typeof p !== 'string') return false;
  if (isPublicEnv(p)) return false;
  return SECRET_FILE_PATTERNS.some((re) => re.test(basename(p)));
}

function block(reason) {
  process.stderr.write(`Blocked by protect-files hook: ${reason}\nSecret files are off limits. If you need a variable's name, read .env.example. Ask the owner if a value is really needed.\n`);
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const tool = input.tool_name || '';
const ti = input.tool_input || {};

if (tool === 'Bash') {
  let cmd = String(ti.command || '');
  // Listed public env files may be named in a command; remove them before checking.
  for (const f of PUBLIC_ENV_FILES) cmd = cmd.split(f).join('PUBLIC_ENV_FILE');
  const hit = SECRET_IN_COMMAND.find((re) => re.test(cmd)) || (/\.secret\.local\b/.test(cmd) && /\.secret\.local/);
  if (hit) block(`the command touches a secret file or dumps the environment: ${cmd.slice(0, 200)}`);
  process.exit(0);
}

const candidates = [ti.file_path, ti.path, ti.notebook_path].filter(Boolean);
if (tool === 'Grep' || tool === 'Glob') {
  if (ti.glob && isSecretPath(String(ti.glob).replace(/\*/g, ''))) block(`search pattern targets secret files: ${ti.glob}`);
}
const secret = candidates.find(isSecretPath);
if (secret) block(`${tool} on ${secret}`);

process.exit(0);
