#!/usr/bin/env node
/**
 * Bundle budget gate.
 *
 * Reads the Vite build manifest, walks the entry chunk's *static* import closure and fails when the
 * initial JavaScript (everything the first paint downloads, excluding lazily imported routes and the
 * Leaflet map chunk) exceeds the budget below. Also guards the two invariants the optimisation relies
 * on: Leaflet never sits in the initial closure, and our own chunks ship no `console` calls.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const FRONTEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST_DIR = join(FRONTEND_ROOT, 'dist');
const MANIFEST_PATH = join(DIST_DIR, '.vite', 'manifest.json');

/** Initial JS (excluding lazy chunks) must stay under 200 KB gzip. */
const INITIAL_BUDGET_BYTES = 200 * 1024;

const CONSOLE_PATTERN = /\bconsole\s*\.\s*\w+\s*\(/;
const DEBUGGER_PATTERN = /\bdebugger\b/;

const fail = (message) => {
  console.error(`\nBundle check failed: ${message}`);
  process.exit(1);
};

const relative = (path) => join(DIST_DIR, path);

const gzipSize = (path) => gzipSync(readFileSync(relative(path))).length;

const rawSize = (path) => readFileSync(relative(path)).byteLength;

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
} catch {
  fail('dist/.vite/manifest.json is missing — run "npm run build" before this check.');
}

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) {
  fail('the build manifest has no entry chunk.');
}

const collectStaticClosure = (key, acc = new Set()) => {
  if (acc.has(key)) {
    return acc;
  }
  acc.add(key);
  for (const imported of manifest[key]?.imports ?? []) {
    collectStaticClosure(imported, acc);
  }
  return acc;
};

const initialKeys = [...collectStaticClosure(entryKey)];
const isJavaScript = (chunk) => chunk?.file?.endsWith('.js');

const chunks = Object.keys(manifest)
  .filter((key) => isJavaScript(manifest[key]))
  .map((key) => ({
    key,
    file: manifest[key].file,
    name: manifest[key].name ?? manifest[key].file,
    isEntry: Boolean(manifest[key].isEntry),
    isDynamic: Boolean(manifest[key].isDynamicEntry),
    isInitial: initialKeys.includes(key),
  }));

const uniqueFiles = new Set(chunks.map((chunk) => chunk.file));
const initialGzipBytes = chunks
  .filter((chunk) => chunk.isInitial)
  .reduce((total, chunk) => total + gzipSize(chunk.file), 0);

const printTable = (rows) => {
  const nameWidth = Math.max(...rows.map((row) => row.name.length), 5);
  console.log(`${'Chunk'.padEnd(nameWidth)}  ${'Raw'.padStart(10)}  ${'Gzip'.padStart(10)}  Kind`);
  console.log(`${'-'.repeat(nameWidth)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}  ${'-'.repeat(7)}`);
  for (const row of rows) {
    console.log(
      `${row.name.padEnd(nameWidth)}  ${kb(row.raw).padStart(10)}  ${kb(row.gzip).padStart(10)}  ${row.kind}`,
    );
  }
};

console.log('\nBundle report\n');
printTable(
  chunks
    .map((chunk) => ({
      name: chunk.name,
      raw: rawSize(chunk.file),
      gzip: gzipSize(chunk.file),
      kind: chunk.isEntry ? 'entry' : chunk.isDynamic ? 'lazy' : chunk.isInitial ? 'initial' : 'shared',
    }))
    .sort((a, b) => b.gzip - a.gzip),
);

const cssFiles = new Set(
  Object.values(manifest).flatMap((chunk) => chunk.css ?? []).filter((file) => file.endsWith('.css')),
);
const lazyCssGzipBytes = [...cssFiles]
  .filter((file) => !file.startsWith('assets/index-'))
  .reduce((total, file) => total + gzipSize(file), 0);

console.log(
  `\nInitial JS (excluding lazy chunks): ${kb(initialGzipBytes)} gzip` +
    ` / budget ${kb(INITIAL_BUDGET_BYTES)}`,
);
console.log(`  ${uniqueFiles.size} chunks total, ${chunks.filter((chunk) => chunk.isDynamic).length} lazy`);
console.log(`  Lazy-only CSS (Leaflet map): ${kb(lazyCssGzipBytes)} gzip`);

const leafletChunks = chunks.filter((chunk) => chunk.file.includes('leaflet'));
if (leafletChunks.length === 0) {
  fail('no Leaflet chunk was emitted — the map must stay in its own chunk.');
}
for (const chunk of leafletChunks) {
  if (chunk.isInitial) {
    fail(`${chunk.file} is part of the initial closure; Leaflet must load lazily.`);
  }
}

// Vite prefixes shared/manual chunks with "_", so the remaining keys are our own modules.
const appChunks = chunks.filter((chunk) => !chunk.key.startsWith('_'));
for (const chunk of appChunks) {
  const source = readFileSync(relative(chunk.file), 'utf8');
  if (CONSOLE_PATTERN.test(source)) {
    fail(`${chunk.file} still contains console calls in the production bundle.`);
  }
  if (DEBUGGER_PATTERN.test(source)) {
    fail(`${chunk.file} still contains a debugger statement.`);
  }
}
console.log(`  ${appChunks.length} application chunks contain no console or debugger statements`);

if (initialGzipBytes > INITIAL_BUDGET_BYTES) {
  fail(
    `initial JS is ${kb(initialGzipBytes)} gzip, over the ${kb(INITIAL_BUDGET_BYTES)} budget by ` +
      `${kb(initialGzipBytes - INITIAL_BUDGET_BYTES)}.`,
  );
}

console.log('\nBundle check passed.\n');
