#!/usr/bin/env node
// Fails when user-facing files contain a forbidden character (today: the em dash, U+2014).
//
// Usage:
//   node scripts/check-copy.mjs              scan SCAN_PATHS (CI, npm run check-copy)
//   node scripts/check-copy.mjs --staged     scan files staged for commit (pre-commit hook)
//   node scripts/check-copy.mjs a.jsx b.json scan the named files
//   node scripts/check-copy.mjs --hook       Claude Code PostToolUse hook: reads the hook JSON on stdin,
//                                            checks the edited file, exits 2 with the findings so Claude fixes them
//
// CUSTOMIZE: /agentic-init sets SCAN_PATHS to the profile's source folders.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, relative, resolve, sep } from 'node:path';

const SCAN_PATHS = ['src', 'site', 'public', 'functions/src', 'supabase/functions', 'index.html'];
const EXTENSIONS = new Set(['.html', '.htm', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.vue', '.svelte', '.css', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '.firebase', 'playwright-report', 'test-results']);
const FORBIDDEN = [{ char: '\u2014', name: 'em dash', fix: 'use a regular hyphen (-)' }];

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function inScope(file) {
  const rel = relative(root, resolve(root, file)).split(sep).join('/');
  if (rel.startsWith('..')) return false;
  if (!EXTENSIONS.has(extname(rel).toLowerCase())) return false;
  if (rel.split('/').some((part) => SKIP_DIRS.has(part))) return false;
  return SCAN_PATHS.some((p) => rel === p || rel.startsWith(p + '/'));
}

function walk(path, out) {
  if (!existsSync(path)) return;
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (!SKIP_DIRS.has(name)) walk(join(path, name), out);
    }
  } else if (inScope(path)) {
    out.push(path);
  }
}

function findIssues(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const issues = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const f of FORBIDDEN) {
      let col = line.indexOf(f.char);
      while (col !== -1) {
        issues.push(`${relative(root, resolve(root, file))}:${i + 1}:${col + 1}  ${f.name} found; ${f.fix}`);
        col = line.indexOf(f.char, col + 1);
      }
    }
  });
  return issues;
}

function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const args = process.argv.slice(2);

if (args[0] === '--hook') {
  let input = {};
  try {
    input = JSON.parse(readStdin() || '{}');
  } catch {
    process.exit(0);
  }
  const file = input?.tool_input?.file_path;
  if (!file || !inScope(file)) process.exit(0);
  const issues = findIssues(file);
  if (issues.length) {
    process.stderr.write(`User-facing text must not contain an em dash. Replace each one with a regular hyphen (-):\n${issues.join('\n')}\n`);
    process.exit(2);
  }
  process.exit(0);
}

let files = [];
if (args[0] === '--staged') {
  files = stagedFiles().filter(inScope);
} else if (args.length) {
  files = args.filter(inScope);
} else {
  for (const p of SCAN_PATHS) walk(join(root, p), files);
}

const all = files.flatMap(findIssues);
if (all.length) {
  console.error(`check-copy: ${all.length} problem(s) in user-facing files:\n${all.join('\n')}`);
  process.exit(1);
}
console.log(`check-copy: ok (${files.length} file(s) checked)`);
