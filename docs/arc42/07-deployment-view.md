# Deployment View

GitHub Actions builds immutable static assets and deploys them to GitHub Pages or another static
host.

Concrete apps normally resolve `<slug>.webapps.lumbrecode.de`. The same repository command builds
the Pages directory and a portable web-root ZIP with a SHA-256 checksum. DNS, TLS, access control
and HTTP response headers remain hosting responsibilities.
