# Static deployment

`npm run build` creates `dist/`. The directory can be copied unchanged to any static web host.
`npm run workflow:release` additionally creates the supported ZIP and checksum.

## GitHub Pages

The shared workflow uses `/` when a custom domain is configured and `/<repository>/` otherwise.
`VITE_BASE_PATH` remains an explicit local or hosted override for preview deployments.

The workflow and local development use the same `npm run workflow:pages` entry point. It executes
the full gate and then verifies that the generated HTML, hashed assets, and notices resolve below
the configured base. Run `npm run workflow:prepare` first when reproducing a clean hosted runner.

## Existing LumbreCode website

The template does not build the company website. A generated app can be deployed independently and
then:

- linked from `lumbrecode.de`;
- copied into a subdirectory of another static site;
- published on an app subdomain;
- embedded only when CSP and framing policy are deliberately configured.

Do not copy source files or `node_modules`; deploy only the immutable `dist/` output.

## Security headers

The bundled meta CSP covers directives supported in HTML and works on headerless static hosting.
Response-only controls such as `frame-ancestors`, `X-Content-Type-Options`, and `Permissions-Policy`
must be configured on the hosting platform. Prefer sending the full CSP as an HTTP response header
when the host allows it; keep it synchronized with `index.html` and rerun the browser suite.

## Custom domain

Configure DNS and the hosting provider separately. The initializer derives `public/CNAME` from
`customDomain`; `auto` becomes `<slug>.webapps.lumbrecode.de`. Remove the domain in configuration
for repository-subpath Pages hosting.
