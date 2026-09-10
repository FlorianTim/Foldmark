#!/usr/bin/env node
/** Remove reproducible local artifacts without crossing project boundaries by default. */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = JSON.parse(readFileSync(resolve(root, 'template.config.json'), 'utf8'));
const slug = String(config.application.slug);
const mode = process.argv[2];
const flags = new Set(process.argv.slice(3));
const dryRun = flags.has('--dry-run');

const artifactDirectories = [
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'release',
  '.pytest_cache',
  '.mypy_cache',
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unit = 'B';
  for (const candidate of units) {
    value /= 1024;
    unit = candidate;
    if (value < 1024) break;
  }
  return `${value.toFixed(1)} ${unit}`;
}

function pathSize(path) {
  if (!existsSync(path)) return 0;
  const stats = lstatSync(path);
  if (stats.isSymbolicLink()) return 0;
  if (!stats.isDirectory()) return stats.size;
  return readdirSync(path).reduce((total, entry) => total + pathSize(resolve(path, entry)), 0);
}

function removePath(relativePath) {
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    fail(`Refusing to remove a path outside the repository: ${target}`);
  }
  if (!existsSync(target)) return 0;
  const bytes = pathSize(target);
  console.log(`${dryRun ? 'Would remove' : 'Removing'} ${relativePath} (${formatBytes(bytes)})`);
  if (!dryRun) rmSync(target, { recursive: true, force: true });
  return bytes;
}

function collectPythonCaches(directory) {
  const absolute = resolve(root, directory);
  if (!existsSync(absolute)) return [];
  const caches = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const relative = `${directory}/${entry.name}`;
    if (entry.name === '__pycache__') caches.push(relative);
    else caches.push(...collectPythonCaches(relative));
  }
  return caches;
}

function cleanArtifacts() {
  const targets = [...artifactDirectories, ...collectPythonCaches('scripts')];
  if (flags.has('--include-node-modules')) targets.push('node_modules');
  const bytes = [...new Set(targets)].reduce((total, target) => total + removePath(target), 0);
  console.log(`${dryRun ? 'Reclaimable' : 'Removed'} repository data: ${formatBytes(bytes)}.`);
}

function docker(args, { capture = false } = {}) {
  const printable = `docker ${args.join(' ')}`;
  if (!capture) console.log(`${dryRun ? 'Would run' : 'Running'} ${printable}`);
  if (dryRun && !capture) return '';
  const result = spawnSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) fail(`${printable} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ''}`.trim();
    fail(`${printable} failed${detail ? `: ${detail}` : '.'}`);
  }
  return `${result.stdout ?? ''}`.trim();
}

function lines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanProjectDocker() {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(slug)) fail(`Unsafe application slug: ${slug}`);

  const projectLabel = `local.workflow.project=${slug}`;
  const containers = lines(
    docker(['ps', '-aq', '--filter', `label=${projectLabel}`], { capture: true }),
  );
  if (containers.length > 0) docker(['rm', '-f', ...containers]);
  else console.log('No template verification containers found.');

  const imageTags = lines(
    docker(['image', 'ls', '--format', '{{.Repository}}:{{.Tag}}'], { capture: true }),
  ).filter((tag) => tag === `${slug}-devcontainer:local` || tag.startsWith(`vsc-${slug}-`));
  if (imageTags.length > 0) docker(['image', 'rm', ...imageTags]);
  else console.log('No template Dev Container images found.');

  const volumeName = `${slug}-node_modules`;
  const volumes = lines(docker(['volume', 'ls', '--format', '{{.Name}}'], { capture: true }));
  if (volumes.includes(volumeName)) docker(['volume', 'rm', volumeName]);
  else console.log('No template node_modules volume found.');
}

function cleanUnusedDocker() {
  if (!flags.has('--confirm-system-prune')) {
    fail(
      'System-wide Docker cleanup requires --confirm-system-prune because it affects other projects.',
    );
  }
  docker(['system', 'prune', '--all', '--volumes', '--force']);
  docker(['volume', 'prune', '--all', '--force']);
}

switch (mode) {
  case 'artifacts':
    cleanArtifacts();
    break;
  case 'docker':
    cleanProjectDocker();
    break;
  case 'all':
    cleanArtifacts();
    cleanProjectDocker();
    break;
  case 'docker-unused':
    cleanUnusedDocker();
    break;
  default:
    fail(
      'Usage: node scripts/cleanup-local.mjs <artifacts|docker|all|docker-unused> [--dry-run] [--include-node-modules] [--confirm-system-prune]',
    );
}
