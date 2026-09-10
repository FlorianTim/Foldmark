# Contributing

1. Start from an accepted OpenSpec change for non-trivial work.
2. Create a focused branch.
3. Keep commits intentional and preferably use Conventional Commits.
4. Run `npm run verify:fast` while working.
5. Run `npm run workflow:local` before pushing; the pre-push hook enforces the shared CI subset.
6. Run `npm run devcontainer:verify` when changing the container, runtime baseline, install process,
   or workflow tooling.
7. Update tests and architecture documentation with code.
8. Never commit secrets, generated credentials, private drafts or user data.
