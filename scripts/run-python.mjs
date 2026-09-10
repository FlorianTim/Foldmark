/** Cross-platform launcher for the repository's dependency-free Python tools. */
import { spawnSync } from 'node:child_process';

const argumentsToForward = process.argv.slice(2);
if (argumentsToForward.length === 0) {
  console.error('Usage: node scripts/run-python.mjs <script-or-python-args...>');
  process.exit(2);
}

const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
for (const executable of candidates) {
  const result = spawnSync(executable, argumentsToForward, { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') continue;
  if (result.error) {
    console.error(`Failed to launch ${executable}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error('Python 3 is required but no python3, python, or py launcher was found.');
process.exit(1);
