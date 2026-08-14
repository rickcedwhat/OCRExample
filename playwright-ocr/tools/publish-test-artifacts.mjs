#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS_DIR = path.join(PROJECT_ROOT, 'test-results');
const DEST_DIR = path.join(PROJECT_ROOT, 'artifacts', 'html-fixture');

function walk(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function latest(filename, needle) {
  return walk(RESULTS_DIR)
    .filter((file) => path.basename(file) === filename && file.includes(needle))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

const video = latest('video.webm', 'html-login-ocr');
const trace = latest('trace.zip', 'html-login-ocr');
if (!video || !trace) {
  console.error('Could not find video.webm / trace.zip under test-results for html-login-ocr.');
  process.exit(1);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(video, path.join(DEST_DIR, 'video.webm'));
fs.copyFileSync(trace, path.join(DEST_DIR, 'trace.zip'));
console.log(`Wrote ${path.relative(PROJECT_ROOT, DEST_DIR)}/video.webm`);
console.log(`Wrote ${path.relative(PROJECT_ROOT, DEST_DIR)}/trace.zip`);
