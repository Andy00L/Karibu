#!/usr/bin/env bash
# Vendor forge-std into lib/ without git (forge install uses git submodules,
# which this project does not use). Idempotent: re-running is a no-op once
# forge-std is present. sourceRef: KARIBU_BUILD_PLAN.md section 3 (no git).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
mkdir -p lib

if [ -f lib/forge-std/src/Test.sol ]; then
  echo "[get-foundry-deps] forge-std already present"
  exit 0
fi

FORGE_STD_TAG="$(curl -fsSL https://api.github.com/repos/foundry-rs/forge-std/releases/latest | jq -r .tag_name)"
if [ -z "$FORGE_STD_TAG" ] || [ "$FORGE_STD_TAG" = "null" ]; then
  echo "[get-foundry-deps] could not resolve latest forge-std tag" >&2
  exit 1
fi
echo "[get-foundry-deps] installing forge-std $FORGE_STD_TAG"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
curl -fsSL "https://github.com/foundry-rs/forge-std/archive/refs/tags/${FORGE_STD_TAG}.tar.gz" \
  -o "$WORK_DIR/forge-std.tar.gz"
tar -xzf "$WORK_DIR/forge-std.tar.gz" -C "$WORK_DIR"
rm -rf lib/forge-std
mv "$WORK_DIR"/forge-std-* lib/forge-std
echo "[get-foundry-deps] forge-std $FORGE_STD_TAG installed at lib/forge-std"
