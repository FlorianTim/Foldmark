/** Installs version-controlled Git hooks when Git recognizes the current working tree. */
import { spawnSync } from 'node:child_process';

const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
if (probe.error?.code === 'ENOENT' || probe.status !== 0 || probe.stdout.trim() !== 'true') {
  console.log('No usable Git working tree found; hook installation skipped.');
  process.exit(0);
}
if (probe.error) {
  console.error(`Git working-tree probe failed: ${probe.error.message}`);
  process.exit(1);
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (result.error) {
  console.error(`Git hook installation failed: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
