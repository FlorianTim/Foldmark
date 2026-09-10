#!/usr/bin/env bash
set -euo pipefail
node --version
npm --version
python3 --version
npm run workflow:local
npm run hooks:install
printf '\nReady. Start with: npm run dev\n'
