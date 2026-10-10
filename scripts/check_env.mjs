#!/usr/bin/env node

/**
 * MonsoonRoute — Environment consistency and leak checker.
 *
 * 1. Every variable in .env.example ↔ docs/env-registry.md (bidirectional).
 * 2. No real-looking secrets in .env.example.
 * 3. No NEXT_PUBLIC_ variable holds a secret tag.
 * 4. After build, scan .next/static for leaked secret names / sentinels.
 *
 * Run:  node scripts/check_env.mjs
 * Or:   npm run check:env
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ENV_EXAMPLE = join(ROOT, '.env.example');
const REGISTRY_MD = join(ROOT, 'docs', 'env-registry.md');
const NEXT_STATIC = join(ROOT, '.next', 'static');

let exitCode = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  exitCode = 1;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Parse .env.example variable names (skip comments, blank lines)
// ---------------------------------------------------------------------------
console.log('\n[check:env] Parsing .env.example …');

if (!existsSync(ENV_EXAMPLE)) {
  fail('.env.example not found');
  process.exit(1);
}

const envExampleLines = readFileSync(ENV_EXAMPLE, 'utf-8').split('\n');
const envVarNames = new Set();

for (const line of envExampleLines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const match = trimmed.match(/^(?:#\s*)?([A-Z_][A-Z0-9_]+)=/);
  if (match) envVarNames.add(match[1]);
}

console.log(`  Found ${envVarNames.size} variables in .env.example`);

// ---------------------------------------------------------------------------
// 2. Parse docs/env-registry.md variable names from table rows
// ---------------------------------------------------------------------------
console.log('\n[check:env] Parsing docs/env-registry.md …');

if (!existsSync(REGISTRY_MD)) {
  fail('docs/env-registry.md not found — skipping registry cross-check');
} else {
  const registryText = readFileSync(REGISTRY_MD, 'utf-8');
  const registryVars = new Set();

  // Match table rows: | `VAR_NAME` | ... | or | VAR_NAME | ... |
  const rowRe = /^\|\s*`?([A-Z_][A-Z0-9_]*)`?\s*\|/gm;
  let m;
  while ((m = rowRe.exec(registryText)) !== null) {
    // Skip header separators and column headers
    if (m[1] === 'Name' || m[1] === 'Variable') continue;
    registryVars.add(m[1]);
  }

  console.log(`  Found ${registryVars.size} variables in env-registry.md`);

  // Cross-check: .env.example → registry
  for (const name of envVarNames) {
    if (!registryVars.has(name)) {
      fail(`${name} is in .env.example but missing from env-registry.md`);
    }
  }

  // Cross-check: registry → .env.example
  for (const name of registryVars) {
    if (!envVarNames.has(name)) {
      fail(`${name} is in env-registry.md but missing from .env.example`);
    }
  }

  if (exitCode === 0) {
    pass('.env.example ↔ env-registry.md are consistent');
  }
}

// ---------------------------------------------------------------------------
// 3. Check .env.example for real-looking secrets
// ---------------------------------------------------------------------------
console.log('\n[check:env] Scanning .env.example for leaked secrets …');

const SECRET_PATTERNS = [
  // JWT-shaped (3 base64 segments separated by dots, header ≥20 chars)
  { re: /=\s*ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, label: 'JWT-shaped token' },
  // OpenAI / Stripe-style prefixed keys
  { re: /=\s*sk-[A-Za-z0-9]{20,}/, label: 'sk- prefixed secret' },
  // Long base64 (>= 40 chars of base64 without spaces)
  { re: /=\s*[A-Za-z0-9+/]{40,}={0,2}\s*$/, label: 'long base64 value' },
  // AWS ARN with a real-looking 12-digit account ID
  { re: /=\s*arn:aws:[a-z0-9-]+:\S+:\d{12}:/, label: 'ARN with real account ID' },
  // Supabase service role key pattern (eyJhbGciOi...)
  { re: /=\s*eyJhbGciOi[A-Za-z0-9_-]+/, label: 'Supabase JWT' },
];

for (let i = 0; i < envExampleLines.length; i++) {
  const line = envExampleLines[i];
  if (line.trim().startsWith('#')) continue;
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(line)) {
      fail(`Line ${i + 1}: looks like a ${label} — remove from .env.example`);
    }
  }
}

if (exitCode === 0) {
  pass('No real-looking secrets found in .env.example');
}

// ---------------------------------------------------------------------------
// 4. Check no NEXT_PUBLIC_ var is tagged as SECRET in .env.example
// ---------------------------------------------------------------------------
console.log('\n[check:env] Checking NEXT_PUBLIC_ variables are not secrets …');

const SECRET_TAG_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RATE_LIMIT_HMAC_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'DATABASE_URL',
  'GITHUB_OAUTH_CLIENT_SECRET',
  'VERCEL_TOKEN',
  'KAGGLE_KEY',
  'KAGGLE_API_TOKEN',
  'NVIDIA_API_KEY',
  'HF_TOKEN',
];

for (const name of envVarNames) {
  if (name.startsWith('NEXT_PUBLIC_')) {
    const baseName = name.replace('NEXT_PUBLIC_', '');
    if (SECRET_TAG_NAMES.includes(baseName) || SECRET_TAG_NAMES.includes(name)) {
      fail(`${name} is a NEXT_PUBLIC_ copy of a server secret`);
    }
  }
}

if (exitCode === 0) {
  pass('No NEXT_PUBLIC_ variable holds a secret');
}

// ---------------------------------------------------------------------------
// 5. Post-build: scan .next/static for leaked secret variable names
// ---------------------------------------------------------------------------
console.log('\n[check:env] Scanning .next/static for leaked secrets …');

if (!existsSync(NEXT_STATIC)) {
  console.log('  ⊘ .next/static not found (build not run) — skipping asset scan');
} else {
  const SECRET_ENV_NAMES = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'RATE_LIMIT_HMAC_KEY',
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'DATABASE_URL',
    'GITHUB_OAUTH_CLIENT_SECRET',
    'VERCEL_TOKEN',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
  ];

  // Sentinel values that should never appear in client bundles
  const SENTINEL_PATTERNS = [
    /CHANGE_ME/,
    /sk-[A-Za-z0-9]{20,}/,
    /eyJhbGciOi[A-Za-z0-9_-]{40,}/,
  ];

  function* walkDir(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walkDir(full);
      } else if (/\.(js|mjs|css|map|json)$/.test(entry.name)) {
        yield full;
      }
    }
  }

  let scanned = 0;
  for (const filePath of walkDir(NEXT_STATIC)) {
    const stat = statSync(filePath);
    if (stat.size > 10 * 1024 * 1024) continue; // skip >10MB files
    const content = readFileSync(filePath, 'utf-8');
    scanned++;

    for (const secretName of SECRET_ENV_NAMES) {
      if (content.includes(secretName)) {
        fail(`${filePath} contains secret variable name: ${secretName}`);
      }
    }

    for (const pat of SENTINEL_PATTERNS) {
      if (pat.test(content)) {
        fail(`${filePath} contains sentinel pattern: ${pat}`);
      }
    }
  }

  if (exitCode === 0) {
    pass(`Scanned ${scanned} files in .next/static — no leaked secrets`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
if (exitCode === 0) {
  console.log('[check:env] All checks passed ✓\n');
} else {
  console.error('[check:env] Some checks failed ✗\n');
}

process.exit(exitCode);
