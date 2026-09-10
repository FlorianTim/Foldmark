# Dependency version policy

The lockfile pins a mutually compatible dependency set. Do not update packages merely to claim the
newest version; update to supported security-patched releases after running the complete
verification gate.

- Runtime and development dependencies are exact-pinned.
- `package-lock.json` is committed.
- Dependabot checks npm and GitHub Actions weekly with a review cooldown for non-security releases.
- Pull requests use Dependency Review and CodeQL.
- High/critical advisories block release unless a documented risk acceptance exists.
- Major upgrades require a focused OpenSpec change or ADR when architecture/tooling changes.
- Run the local final-polish prompt after creating the GitHub repository to verify current registry
  metadata and apply safe upgrades.
- Run `npm run dependencies:check`; review outdated versions instead of updating them blindly.
