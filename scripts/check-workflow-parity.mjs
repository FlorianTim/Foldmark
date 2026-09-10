/** Prevents GitHub workflow entry points and local workflow commands from drifting apart. */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readYaml = (path) => parse(readFileSync(path, 'utf8'));
const errors = [];

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

function runCommands(workflow) {
  return Object.values(workflow.jobs ?? {}).flatMap((job) =>
    (job.steps ?? []).flatMap((step) => (typeof step.run === 'string' ? [step.run] : [])),
  );
}

const packageJson = readJson('package.json');
const ci = readYaml('.github/workflows/ci.yml');
const codeql = readYaml('.github/workflows/codeql.yml');
const pages = readYaml('.github/workflows/deploy-pages.yml');
const dependencyReview = readYaml('.github/workflows/dependency-review.yml');
const release = readYaml('.github/workflows/release.yml');
const policy = readJson('compliance/license-policy.json');
const devcontainer = readJson('.devcontainer/devcontainer.json');
const nodeVersion = readFileSync('.nvmrc', 'utf8').trim();
const pythonVersion = readFileSync('.python-version', 'utf8').trim();
const prePush = readFileSync('.githooks/pre-push', 'utf8');
const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');

for (const name of [
  'workflow:install',
  'workflow:prepare',
  'workflow:ci',
  'workflow:pages',
  'workflow:dependency-review',
  'workflow:security',
  'workflow:repository',
  'workflow:release',
  'workflow:portable',
  'workflow:local',
  'devcontainer:verify',
]) {
  requireCondition(
    typeof packageJson.scripts?.[name] === 'string',
    `package.json is missing ${name}`,
  );
}

/**
 * A job either runs the steps itself or delegates to the shared Node gate in
 * lumbrecode-engineering. The guarantees below hold either way — what changes
 * is where they are written down: in the job's own steps, or in the inputs it
 * passes. The helpers accept both so centralizing a workflow does not quietly
 * drop a promise this check exists to keep.
 */
const SHARED_NODE_GATE = 'FlorianTim/lumbrecode-engineering/.github/workflows/node-quality.yml@';

const delegatesToSharedGate = (job) =>
  typeof job?.uses === 'string' && job.uses.startsWith(SHARED_NODE_GATE);

const jobRunsCommand = (job, command) =>
  (job?.steps ?? []).some((step) => step.run === command) ||
  (delegatesToSharedGate(job) &&
    [job.with?.['install-command'], job.with?.['quality-command']].includes(command));

const jobPinsNode = (job) =>
  (job?.steps ?? []).some(
    (step) =>
      step.uses === 'actions/setup-node@v6' && step.with?.['node-version-file'] === '.nvmrc',
  ) ||
  (delegatesToSharedGate(job) && job.with?.['node-version-file'] === '.nvmrc');

const jobPinsPython = (job) =>
  (job?.steps ?? []).some(
    (step) =>
      step.uses === 'actions/setup-python@v6' &&
      step.with?.['python-version-file'] === '.python-version',
  ) ||
  (delegatesToSharedGate(job) && job.with?.['python-version-file'] === '.python-version');

const ciVerify = ci.jobs?.verify;
requireCondition(
  jobRunsCommand(ciVerify, 'npm run workflow:prepare'),
  'CI must use workflow:prepare',
);
requireCondition(jobRunsCommand(ciVerify, 'npm run workflow:ci'), 'CI must use workflow:ci');
requireCondition(jobPinsNode(ciVerify), 'CI must resolve Node from .nvmrc');
requireCondition(jobPinsPython(ciVerify), 'CI must resolve Python from .python-version');
// @main would make every consumer track unreviewed changes; the engineering
// repository forbids it in docs/GITHUB_ACTIONS_ACCESS.md.
requireCondition(
  !delegatesToSharedGate(ciVerify) || /@v\d+(\.\d+\.\d+)?$/.test(ciVerify.uses),
  'CI must pin the shared gate to a version tag, never a branch',
);

const pagesRuns = runCommands(pages);
requireCondition(pagesRuns.includes('npm run workflow:prepare'), 'Pages must use workflow:prepare');
requireCondition(pagesRuns.includes('npm run workflow:pages'), 'Pages must use workflow:pages');
requireCondition(
  pages.jobs?.build?.steps?.some(
    (step) =>
      step.uses === 'actions/setup-node@v6' && step.with?.['node-version-file'] === '.nvmrc',
  ),
  'Pages must resolve Node from .nvmrc',
);
requireCondition(
  pages.jobs?.build?.steps?.some(
    (step) =>
      step.uses === 'actions/setup-python@v6' &&
      step.with?.['python-version-file'] === '.python-version',
  ),
  'Pages must resolve Python from .python-version',
);
requireCondition(
  pages.jobs?.build?.steps?.some(
    (step) => step.uses === 'actions/upload-pages-artifact@v5' && step.with?.path === 'dist',
  ),
  'Pages must upload the locally verified dist directory',
);

const releaseRuns = runCommands(release);
requireCondition(
  releaseRuns.includes('npm run workflow:prepare'),
  'Release must use workflow:prepare',
);
requireCondition(
  releaseRuns.includes('npm run workflow:release'),
  'Release must use workflow:release',
);
requireCondition(
  release.jobs?.build?.steps?.some(
    (step) => step.uses === 'actions/upload-artifact@v7' && step.with?.path === 'release/*',
  ),
  'Release must upload the locally produced release directory',
);

const reviewStep = dependencyReview.jobs?.['dependency-review']?.steps?.find(
  (step) => step.uses === 'actions/dependency-review-action@v5',
);
const dependencyRuns = runCommands(dependencyReview);
requireCondition(
  dependencyRuns.includes('npm run workflow:install'),
  'Dependency Review must use workflow:install',
);
requireCondition(
  dependencyRuns.includes('npm run workflow:dependency-review'),
  'Dependency Review must use workflow:dependency-review',
);
requireCondition(
  dependencyReview.jobs?.['dependency-review']?.steps?.some(
    (step) =>
      step.uses === 'actions/setup-node@v6' && step.with?.['node-version-file'] === '.nvmrc',
  ),
  'Dependency Review must resolve Node from .nvmrc',
);
requireCondition(
  dependencyReview.jobs?.['dependency-review']?.steps?.some(
    (step) =>
      step.uses === 'actions/setup-python@v6' &&
      step.with?.['python-version-file'] === '.python-version',
  ),
  'Dependency Review must resolve Python from .python-version',
);
const workflowLicenses = String(reviewStep?.with?.['allow-licenses'] ?? '')
  .split(',')
  .map((license) => license.trim())
  .filter(Boolean)
  .sort();
const policyLicenses = [...policy.allowed, ...policy.reviewRequired].sort();
requireCondition(
  JSON.stringify(workflowLicenses) === JSON.stringify(policyLicenses),
  'Dependency Review allow-licenses must match compliance/license-policy.json',
);
requireCondition(
  reviewStep?.with?.['fail-on-severity'] === 'moderate',
  'Dependency Review and the local audit must fail at moderate severity',
);
requireCondition(
  String(reviewStep?.if).includes('DEPENDENCY_REVIEW_ENABLED'),
  'GitHub delta review must support explicit opt-in for private GHAS repositories',
);
requireCondition(
  codeql.permissions?.actions === 'read',
  'CodeQL must be allowed to read workflow runs',
);
const codeqlRuns = runCommands(codeql);
requireCondition(
  codeqlRuns.includes('npm run workflow:install'),
  'CodeQL fallback must use workflow:install',
);
requireCondition(
  codeqlRuns.includes('npm run workflow:security'),
  'CodeQL fallback must use workflow:security',
);
requireCondition(
  String(codeql.jobs?.analyze?.if).includes('CODEQL_ENABLED'),
  'CodeQL upload must support explicit opt-in for private GHAS repositories',
);
requireCondition(
  devcontainer.postCreateCommand ===
    'sudo mkdir -p node_modules && sudo chown -R pwuser:pwuser node_modules && npm ci --ignore-scripts && npm run hooks:install && npm run verify:fast',
  'Dev Container postCreateCommand must remain the verified local bootstrap sequence',
);
requireCondition(
  devcontainer.mounts?.includes(
    'source=${localWorkspaceFolderBasename}-node_modules,target=${containerWorkspaceFolder}/node_modules,type=volume',
  ),
  'Dev Container must isolate Linux node_modules from the host workspace',
);
requireCondition(nodeVersion === '24', '.nvmrc must pin the shared Node 24 LTS major');
requireCondition(pythonVersion === '3.12', '.python-version must pin the shared Python 3.12 line');
requireCondition(prePush.includes('npm run workflow:ci'), 'pre-push must use workflow:ci');
requireCondition(
  bootstrap.includes('npm run workflow:local'),
  'bootstrap.sh must use workflow:local',
);

if (errors.length > 0) {
  console.error(`Workflow parity check failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('Workflow parity check passed.');
