# Local cleanup

The cleanup commands remove reproducible data when builds or Docker consume too much local disk
space. Project-scoped cleanup is the default; no command silently prunes resources owned by another
repository.

## Project cleanup

| Purpose                                                                                      | Command                 |
| -------------------------------------------------------------------------------------------- | ----------------------- |
| Preview repository and project-Docker cleanup                                                | `npm run clean:dry-run` |
| Remove build, test, coverage, release, and Python cache artifacts                            | `npm run clean`         |
| Remove template verification containers, Dev Container image tags, and its dependency volume | `npm run clean:docker`  |
| Run both project-scoped cleanup steps                                                        | `npm run clean:all`     |
| Also remove the local `node_modules` installation                                            | `npm run clean:deep`    |

The Docker cleanup derives names from `template.config.json`. It targets containers carrying the
slug-specific `local.workflow.project` label, `<application-slug>-devcontainer:local`, Dev
Containers CLI aliases starting with `vsc-<application-slug>-`, and
`<application-slug>-node_modules`. It does not run a global Docker prune.

All project modes accept `--dry-run` when the script is invoked directly. For example:

```bash
node scripts/cleanup-local.mjs artifacts --include-node-modules --dry-run
```

## System-wide Docker cleanup

Use the following only after reviewing `docker ps -a`, `docker image ls`, and `docker volume ls`. It
removes all stopped containers, unused networks, unused images, build cache, anonymous volumes, and
every unused named volume across every local Docker project:

```bash
npm run clean:docker:unused -- --confirm-system-prune
```

The confirmation flag is intentionally not part of the npm script. Omitting it fails without
changing Docker state. Docker may keep the virtual disk file at its high-water size even after data
is pruned; reclaiming sparse host blocks is a Docker Desktop/WSL maintenance operation and is not
automated by this repository.
