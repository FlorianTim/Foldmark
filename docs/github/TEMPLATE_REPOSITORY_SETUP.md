# GitHub Template Repository setup

After pushing this source to the `web-app-template` repository:

1. Open **Settings → General** and enable **Template repository**.
2. Set the description to:
   `Secure privacy-first Vue/TypeScript web app template for agentic LumbreCode projects.`
3. Add topics such as `vue`, `typescript`, `vite`, `local-first`, `privacy-by-default`, `owasp`,
   `openspec`, `arc42`, `github-pages`, and `template-repository`.
4. Enable Issues and optionally Discussions.
5. Enable GitHub Pages with **GitHub Actions** as source.
6. Enable Dependabot alerts/security updates, CodeQL/code scanning, Dependency Review and private
   vulnerability reporting where available. For a private repository with GitHub Advanced Security,
   add the Actions repository variable `DEPENDENCY_REVIEW_ENABLED=true` to enable the server-side
   pull-request delta review and `CODEQL_ENABLED=true` to enable SARIF analysis; portable fallbacks
   run regardless.
7. Configure branch protection/rulesets for `main`: pull request required, CI required, no
   force-push, and signed commits if your workflow supports them.
8. Keep `FUNDING.yml.example` disabled until the final donation URLs are known.

For each generated app, create a DNS record for `<slug>.webapps.lumbrecode.de`, configure the same
custom domain in Pages, and enforce HTTPS. The generated `public/CNAME` is necessary but does not
create DNS or prove domain ownership.

Publish the app documentation at `https://lumbrecode.de/apps/<slug>/` with `support/`, `faq/`,
`privacy/`, `data-deletion/`, `changelog/` and `licenses/` children. The app UI derives these URLs
from its public configuration.

A repository generated from the template has an independent history and should replace the Todo demo
only through the initializer workflow.
