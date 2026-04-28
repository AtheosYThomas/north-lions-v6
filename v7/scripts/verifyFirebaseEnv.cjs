#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

const target = process.argv[2] || 'unknown-target';
const cwd = process.cwd();
const envLocal = parseEnvFile(path.join(cwd, '.env.local'));
const envDefault = parseEnvFile(path.join(cwd, '.env'));
const env = { ...envDefault, ...envLocal, ...process.env };

const missing = requiredKeys.filter((key) => {
  const value = env[key];
  return !value || !String(value).trim();
});

if (missing.length > 0) {
  console.error(`[verifyFirebaseEnv] Missing Firebase env for ${target}:`);
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  console.error('Build aborted to prevent blank screen deployment.');
  process.exit(1);
}

console.log(`[verifyFirebaseEnv] ${target} Firebase env looks good.`);
