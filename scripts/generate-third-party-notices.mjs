import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));

async function readInstalledPackageMetadata(path, entry) {
  try {
    const pkg = JSON.parse(await readFile(resolve(root, path, 'package.json'), 'utf8'));
    const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
    return {
      name: pkg.name ?? path.replace(/^.*node_modules\//, ''),
      version: pkg.version ?? 'UNKNOWN',
      license: pkg.license ?? 'UNKNOWN',
      homepage: pkg.homepage,
      repository,
      // The lockfile marks packages only development needs; everything else
      // can end up in the shipped bundle. The About view groups by this.
      runtime: entry?.dev !== true,
    };
  } catch {
    return null;
  }
}

const packageEntries = Object.entries(lock.packages ?? {}).filter(([path]) =>
  path.includes('node_modules/'),
);
const installedPackages = (
  await Promise.all(
    packageEntries.map(([path, entry]) => readInstalledPackageMetadata(path, entry)),
  )
).filter((value) => value !== null);
const packages = [
  ...new Map(installedPackages.map((pkg) => [`${pkg.name}@${pkg.version}`, pkg])).values(),
];
packages.sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));

await writeFile(
  resolve(root, 'public/THIRD-PARTY-NOTICES.generated.json'),
  `${JSON.stringify(packages, null, 2)}\n`,
);
const markdown = [
  '# Third-party notices',
  '',
  'Generated from package metadata in the installed lockfile-based dependency tree.',
  '',
  ...packages.map((p) => {
    const target = p.homepage ?? p.repository;
    const name = target ? `[${p.name}](${target})` : p.name;
    return `- **${name}@${p.version}** — ${p.license}`;
  }),
  '',
].join('\n');
await writeFile(resolve(root, 'public/THIRD-PARTY-NOTICES.generated.md'), markdown);
console.log(`Generated notices for ${packages.length} installed packages.`);
