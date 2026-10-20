#!/usr/bin/env bash
# LM Studio Simplified Chinese Patch - one-click installer (macOS / Linux)
set -e
cd "$(dirname "$0")"

echo ""
echo " ============================================"
echo "  LM Studio Simplified Chinese Patch v1.1.0"
echo " ============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install LTS from https://nodejs.org and retry."
  exit 1
fi
echo "[OK] Node.js $(node -v)"

node patch/apply-patch.js
node patch/patch-extra.js || echo "[WARN] extra patch skipped (main window patch stays applied)"

# model yaml custom-fields: per-machine data, failure is non-fatal
node tools/patch-model-yamls.js || echo "[WARN] model yaml patch skipped (non-fatal)"

echo ""
echo " Done. Fully quit LM Studio and start it again."
echo " Rollback: node patch/apply-patch.js --restore  +  node patch/patch-extra.js --restore"
