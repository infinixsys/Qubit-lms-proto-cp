#!/usr/bin/env bash
set -euo pipefail
node -e 'if(Number(process.versions.node.split(".")[0])!==24)throw new Error("Use the pinned Node 24 runtime before setup.")'
cp_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
app_root="$(dirname -- "$cp_root")/Qubit-lms-proto-app"
if [[ ! -f "$app_root/package-lock.json" ]]; then
  printf '%s\n' "Clone Qubit-lms-proto-app next to Qubit-lms-proto-cp before setup." >&2
  exit 1
fi
cd "$cp_root"
npm ci
npm run build
npm test
cd "$app_root"
npm ci
npm run build
