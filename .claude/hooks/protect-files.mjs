#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks reading, editing or shell access to secret files.
// Exit 2 blocks the tool call and shows the reason to Claude. Exit 0 lets it through.
// Allowed on purpose: .env.example (it holds placeholders only).

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

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
  const cmd = String(ti.command || '');
  const hit = SECRET_IN_COMMAND.find((re) => re.test(cmd));
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
