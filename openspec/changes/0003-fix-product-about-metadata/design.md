# Design: Fix product metadata in the About view

## Sources of truth

| Field         | Source                                                 |
| ------------- | ------------------------------------------------------ |
| Name, version | `appConfig` (validated `src/config/app.config.json`)   |
| Description   | `appConfig.description`                                |
| Organization  | `appConfig.organization`                               |
| Licence       | `appConfig.license`                                    |
| Repository    | `appConfig.repositoryOwner` / `repositoryName`         |
| Build id      | `import.meta.env.VITE_BUILD_ID`, shown only when set   |
| Notices       | `THIRD-PARTY-NOTICES.generated.md` under the base path |
| Privacy       | The in-app privacy view, plus the public privacy page  |

Nothing new is hard-coded in the component: the About view stays a rendering of configuration, so
the same fix holds for every app generated from the template.

## Decisions

| Decision                                | Alternative rejected          | Why                                                                                                    |
| --------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Build id from `VITE_BUILD_ID`, optional | Derive from git at build time | The static release is built in CI and locally; an env var works in both and shows nothing when absent. |
| Guard test on the word "template"       | Manual review                 | The string survived one initialization already.                                                        |
| Repository link derived from config     | A new `repositoryUrl` field   | Owner and name are already validated configuration; a second field could drift.                        |

## Open point

`template.config.json` and the runtime configuration carry the same `repositoryOwner`; both change
together and `npm run template:validate` confirms they agree.
