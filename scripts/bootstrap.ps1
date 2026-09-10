$ErrorActionPreference = "Stop"
node --version
npm --version
python --version
npm ci --ignore-scripts
npm run hooks:install
npx playwright install chromium
npm run ci
Write-Host "`nReady. Start with: npm run dev"
