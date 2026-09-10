/** Validates committed JSON and GitHub YAML with parsers rather than textual heuristics. */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { parseDocument } from 'yaml';

const excluded = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  'playwright-report/**',
  'test-results/**',
];
const errors = [];

for (const file of globSync('**/*.json', { exclude: excluded })) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const file of globSync('.github/**/*.{yml,yaml}')) {
  const document = parseDocument(readFileSync(file, 'utf8'), { maxAliasCount: 20 });
  for (const error of document.errors) errors.push(`${file}: ${error.message}`);
}

if (errors.length > 0) {
  console.error(`Structured data check failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log('Structured data check passed.');
