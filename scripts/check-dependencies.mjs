/** Local dependency review with advisory, registry-signature, tree and update visibility checks. */
import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;

function run(args, allowOutdated = false) {
  const executable = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const commandArgs = npmCli ? [npmCli, ...args] : args;
  console.log(`\n> npm ${args.join(' ')}`);
  const result = spawnSync(executable, commandArgs, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(allowOutdated && result.status === 1)) {
    process.exit(result.status ?? 1);
  }
}

run(['audit', '--audit-level=moderate']);
run(['audit', 'signatures']);
run(['ls', '--all']);
run(['outdated'], true);
console.log(
  '\nDependency review passed. Outdated versions remain review input, not automatic upgrades.',
);
