/** Cross-platform entry points shared by GitHub workflows and local verification. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statfsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = JSON.parse(readFileSync(resolve(root, 'template.config.json'), 'utf8'));
const devcontainer = JSON.parse(
  readFileSync(resolve(root, '.devcontainer', 'devcontainer.json'), 'utf8'),
);
const npmCli = process.env.npm_execpath;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(executable, args, options = {}) {
  console.log(`\n> ${executable} ${args.join(' ')}`);
  const result = spawnSync(executable, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
  });
  if (result.error) fail(`${executable} failed to start: ${result.error.message}`);
  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1);
  if (options.returnResult) return result;
  return result.stdout ?? '';
}

function npm(args, options) {
  if (npmCli) return run(process.execPath, [npmCli, ...args], options);
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, options);
}

function npmExec(args, options) {
  return npm(['exec', '--', ...args], options);
}

function resolveBasePath() {
  const supplied = process.env.VITE_BASE_PATH;
  const repository = String(config.application.repositoryName);
  const customDomain = String(config.application.customDomain);
  const base = supplied ?? (customDomain ? '/' : `/${repository}/`);
  if (base === '/') return base;
  if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/$/.test(base)) {
    fail(`VITE_BASE_PATH must be / or a safe absolute path ending in /; received ${base}`);
  }
  return base;
}

function verifyToolchain() {
  const expectedNodeMajor = readFileSync(resolve(root, '.nvmrc'), 'utf8').trim();
  const actualNodeMajor = process.versions.node.split('.')[0];
  if (actualNodeMajor !== expectedNodeMajor) {
    fail(`Node ${expectedNodeMajor}.x is required; running ${process.versions.node}.`);
  }

  const expectedPython = readFileSync(resolve(root, '.python-version'), 'utf8').trim();
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') continue;
    if (result.error || result.status !== 0) continue;
    const version = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (!version.startsWith(`Python ${expectedPython}.`)) {
      fail(`${candidate} must provide Python ${expectedPython}.x; received ${version}.`);
    }
    console.log(`Toolchain verified: Node ${process.versions.node}, ${version}.`);
    return;
  }
  fail(`Python ${expectedPython}.x is required but no Python launcher was found.`);
}

function install() {
  verifyToolchain();
  npm(['ci', '--ignore-scripts']);
  installPythonRequirements();
}

/**
 * Installs the documentation renderer's Python dependencies.
 *
 * They are the only ones in the repository, and they belong here rather than
 * in the workflow so a local run and CI install the same set. Skipped when
 * requirements.txt is absent, which is what a derived app that removed the
 * renderer looks like.
 */
function installPythonRequirements() {
  const requirements = resolve(root, 'requirements.txt');
  if (!existsSync(requirements)) return;
  // Same launcher order verifyToolchain already agreed on, so both use the
  // interpreter the toolchain check validated.
  const candidates = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (probe.error?.code === 'ENOENT') continue;
    run(candidate, [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '--quiet',
      '-r',
      'requirements.txt',
    ]);
    return;
  }
  fail('No Python launcher was found for installing requirements.txt.');
}

function prepare() {
  install();
  const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  if (browserChannel) {
    if (!['chrome', 'msedge'].includes(browserChannel)) {
      fail('PLAYWRIGHT_BROWSER_CHANNEL must be chrome or msedge when set.');
    }
    console.log(`Using installed Playwright browser channel ${browserChannel}; skipping download.`);
    return;
  }
  const installArgs = ['playwright', 'install'];
  if (process.platform === 'linux') installArgs.push('--with-deps');
  installArgs.push('chromium');
  npmExec(installArgs);
}

function verifyStaticBuild(base) {
  const indexPath = resolve(root, 'dist', 'index.html');
  if (!existsSync(indexPath)) fail('dist/index.html is missing after the Pages build.');
  const html = readFileSync(indexPath, 'utf8');
  const assetUrls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  const localAssets = assetUrls.filter((url) => url.startsWith('/'));
  const invalidAssets = localAssets.filter((url) => !url.startsWith(base));
  if (invalidAssets.length > 0) {
    fail(`Static build contains assets outside ${base}: ${invalidAssets.join(', ')}`);
  }
  if (!localAssets.some((url) => url.startsWith(`${base}assets/`))) {
    fail(`Static build does not contain a hashed asset below ${base}assets/.`);
  }
  if (!existsSync(resolve(root, 'dist', 'THIRD-PARTY-NOTICES.generated.md'))) {
    fail('Generated third-party notices are missing from dist/.');
  }
  const bundles = readdirSync(resolve(root, 'dist', 'assets')).filter((file) =>
    file.endsWith('.js'),
  );
  if (bundles.length === 0) fail('No JavaScript bundle was generated.');
  const noticesUrl = `${base}THIRD-PARTY-NOTICES.generated.md`;
  const noticesLinked = bundles.some((file) =>
    readFileSync(resolve(root, 'dist', 'assets', file), 'utf8').includes(noticesUrl),
  );
  if (!noticesLinked) fail(`JavaScript bundle does not contain the base-aware URL ${noticesUrl}.`);
  const contactAddresses = Object.values(config.organization.contactLocalParts).map(
    (encoded) =>
      `${Buffer.from(String(encoded), 'base64').toString('utf8')}@${config.organization.domain}`,
  );
  const leakedAddresses = contactAddresses.filter((address) =>
    bundles.some((file) =>
      readFileSync(resolve(root, 'dist', 'assets', file), 'utf8').includes(address),
    ),
  );
  if (leakedAddresses.length > 0) {
    fail(
      `Static JavaScript contains unobfuscated contact addresses: ${leakedAddresses.join(', ')}`,
    );
  }
  console.log(`Static Pages artifact verified below ${base}.`);
}

function ci() {
  verifyToolchain();
  const base = resolveBasePath();
  npm(['run', 'ci'], { env: { VITE_BASE_PATH: base } });
}

function pages() {
  verifyToolchain();
  const base = resolveBasePath();
  npm(['run', 'ci'], { env: { VITE_BASE_PATH: base } });
  verifyStaticBuild(base);
}

function artifact() {
  verifyToolchain();
  verifyStaticBuild(resolveBasePath());
}

function dependencyReview() {
  verifyToolchain();
  npm(['run', 'dependencies:check']);
  npm(['run', 'licenses:generate']);
  npm(['run', 'licenses:check']);
}

function release() {
  pages();
  npm(['run', 'package:release']);
}

function securityReview() {
  verifyToolchain();
  npm(['run', 'lint']);
  npm(['run', 'security:check']);
  npmExec(['vitest', 'run', 'tests/security']);
}

function repositoryReview() {
  verifyToolchain();
  npm(['run', 'workflow:check']);
  npm(['run', 'structured:check']);
  npm(['run', 'docs:check']);
  npm(['run', 'privacy:check']);
}

function portable() {
  pages();
  dependencyReview();
  securityReview();
  repositoryReview();
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function verifyContainerDiskSpace() {
  const minimumFreeBytes = 5 * 1024 ** 3;
  const fileSystem = statfsSync(root);
  const freeBytes = Number(fileSystem.bavail) * Number(fileSystem.bsize);
  if (freeBytes < minimumFreeBytes) {
    const freeGiB = (freeBytes / 1024 ** 3).toFixed(2);
    fail(`Dev Container verification requires at least 5 GiB free; ${freeGiB} GiB available.`);
  }
}

function devcontainerLifecycleCheck() {
  const label = `local.workflow.verify=${Date.now()}`;
  const projectLabel = `local.workflow.project=${config.application.slug}`;
  const execution = npmExec(
    [
      'devcontainer',
      'up',
      '--workspace-folder',
      root,
      '--id-label',
      label,
      '--id-label',
      projectLabel,
      '--remove-existing-container',
    ],
    { capture: true, allowFailure: true, returnResult: true },
  );
  const output = execution.stdout ?? '';
  console.log(output.trim());
  const containerIds = run('docker', ['ps', '-aq', '--filter', `label=${label}`], { capture: true })
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (execution.status !== 0) {
    if (containerIds.length > 0) run('docker', ['rm', '-f', ...containerIds]);
    fail('Dev Container lifecycle or post-create command failed.');
  }
  const result = output
    .trim()
    .split(/\r?\n/)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((value) => typeof value?.containerId === 'string');
  if (!result) fail('Dev Containers CLI did not return a verification container ID.');
  run('docker', ['rm', '-f', result.containerId]);
  console.log('Dev Container lifecycle and post-create command verified.');
}

function devcontainerVerify() {
  verifyContainerDiskSpace();
  const base = resolveBasePath();
  const slug = String(config.application.slug);
  const image = `${slug}-devcontainer:local`;
  devcontainerLifecycleCheck();
  npmExec(['devcontainer', 'build', '--workspace-folder', root, '--image-name', image]);

  const postCreate = String(devcontainer.postCreateCommand ?? '').trim();
  if (!postCreate) fail('.devcontainer/devcontainer.json must define postCreateCommand.');
  const innerCommand = `cd /workspace && ${postCreate} && npm run workflow:portable`;
  const containerCommand = [
    'set -euo pipefail',
    "tar --exclude='./.git' --exclude='./node_modules' --exclude='./dist' --exclude='./coverage' --exclude='./playwright-report' --exclude='./test-results' -C /source -cf - . | tar -C /workspace -xf -",
    'chown -R pwuser:pwuser /workspace',
    `sudo -u pwuser env VITE_BASE_PATH=${shellQuote(base)} PLAYWRIGHT_BROWSERS_PATH=/ms-playwright bash -lc ${shellQuote(innerCommand)}`,
  ].join('\n');
  run('docker', [
    'run',
    '--rm',
    '--label',
    `local.workflow.project=${slug}`,
    '--user',
    'root',
    '--mount',
    `type=bind,source=${root},target=/source,readonly`,
    '--mount',
    'type=volume,target=/workspace',
    image,
    'bash',
    '-lc',
    containerCommand,
  ]);
}

const commands = {
  install,
  prepare,
  toolchain: verifyToolchain,
  ci,
  pages,
  artifact,
  dependencies: dependencyReview,
  security: securityReview,
  repository: repositoryReview,
  release,
  portable,
  all() {
    prepare();
    portable();
    npm(['run', 'package:release']);
  },
  container: devcontainerVerify,
};

const command = process.argv[2];
if (!command || !(command in commands)) {
  fail(`Usage: node scripts/run-local-workflow.mjs <${Object.keys(commands).join('|')}>`);
}
commands[command]();
