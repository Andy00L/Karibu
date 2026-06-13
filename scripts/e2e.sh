#!/usr/bin/env bash
# End-to-end check of the Karibu loop from the CLI, no browser. Runs the full
# on-chain and build loop. The x402 paid-call section runs only when
# THIRDWEB_SERVER_WALLET_ADDRESS is set; otherwise it is skipped with a clear
# message. Exits 0 when every checked step passes. sourceRef:
# KARIBU_BUILD_PLAN.md section 5 (Day 2 e2e.sh).
set -uo pipefail
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then . "$NVM_DIR/nvm.sh"; fi
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
RPC="https://forno.celo-sepolia.celo-testnet.org"
FAILURES=0

step() { echo ""; echo "=== $1 ==="; }
note_fail() { echo "FAIL: $1"; FAILURES=$((FAILURES + 1)); }

read_env_value() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2-; }

step "contracts: forge test"
bash scripts/get-foundry-deps.sh
if forge test; then echo "forge test ok"; else note_fail "forge test"; fi

step "workspace: install and build"
pnpm install
if pnpm -r build; then echo "build ok"; else note_fail "pnpm build"; fi

step "deploy and register (idempotent)"
bash scripts/deploy-sepolia.sh
NOTARY="$(read_env_value KARIBU_NOTARY_ADDRESS_SEPOLIA)"
AGENT_ID="$(read_env_value KARIBU_AGENT_ID)"
if [ -n "$NOTARY" ]; then echo "notary=$NOTARY"; else note_fail "notary not deployed"; fi
if [ -n "$AGENT_ID" ]; then echo "agentId=$AGENT_ID"; else note_fail "agent not registered"; fi

step "notary anchor (native gas) and read back"
AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
ANCHOR_HASH="0x$(printf 'karibu e2e %s' "$AGENT_ID" | sha256sum | cut -d' ' -f1)"
ALREADY="$(cast call "$NOTARY" 'isAnchored(bytes32)(bool)' "$ANCHOR_HASH" --rpc-url "$RPC" 2>/dev/null || echo false)"
if [ "$ALREADY" != "true" ]; then
  if cast send "$NOTARY" 'anchor(bytes32)' "$ANCHOR_HASH" --private-key "$AGENT_PK" --rpc-url "$RPC" --json >/dev/null 2>&1; then
    sleep 4 # forno read replicas lag after a write
  else
    note_fail "anchor send"
  fi
fi
ANCHORED="$(cast call "$NOTARY" 'isAnchored(bytes32)(bool)' "$ANCHOR_HASH" --rpc-url "$RPC" 2>/dev/null || echo false)"
if [ "$ANCHORED" = "true" ]; then echo "anchor confirmed"; else note_fail "anchor not confirmed"; fi

step "server: start, read health, skills, metrics, then stop"
set -a
. ./.env
set +a
PORT=8899 node apps/agent/dist/index.js > /tmp/karibu_e2e_server.log 2>&1 &
SERVER_PID=$!
sleep 5
HEALTH="$(curl -s http://127.0.0.1:8899/health || echo '')"
echo "health=$HEALTH"
if printf '%s' "$HEALTH" | grep -q '"ok":true'; then echo "health ok"; else note_fail "health"; fi
if curl -s http://127.0.0.1:8899/api/skills | grep -q '"services"'; then echo "skills ok"; else note_fail "skills"; fi
if curl -s http://127.0.0.1:8899/api/metrics | grep -q '"schemaVersion":1'; then echo "metrics ok"; else note_fail "metrics"; fi

step "x402 paid call"
if [ -n "${THIRDWEB_SERVER_WALLET_ADDRESS:-}" ]; then
  echo "server wallet present; the funded client harness runs here once a client stable is available"
else
  echo "SKIP: THIRDWEB_SERVER_WALLET_ADDRESS not set, so x402 settlement is not exercised in this run"
fi

kill "$SERVER_PID" 2>/dev/null || true

step "result"
if [ "$FAILURES" -eq 0 ]; then
  echo "E2E_OK"
  exit 0
fi
echo "E2E_FAILURES=$FAILURES"
exit 1
