#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
npm run licenses:generate
npm run docs:generate
npm run dev
