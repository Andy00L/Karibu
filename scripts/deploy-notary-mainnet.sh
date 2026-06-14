#!/usr/bin/env bash
# Deploy KaribuNotary to Celo MAINNET. Deploy only: Karibu is already registered
# on the mainnet ERC-8004 Identity Registry (agentId 9373), so this does not call
# register(). Reads AGENT_PRIVATE_KEY from .env at runtime and never prints it.
# Idempotent: skips if KARIBU_NOTARY_ADDRESS_MAINNET is already set. Native CELO
# gas (contract creation cannot use a feeCurrency). sourceRef: scripts/deploy-sepolia.sh,
# docs/FACTS.md sections 1 and 3, docs/DECISIONS.md (mainnet registration agent 9373).
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RPC="https://forno.celo.org"
ENV_FILE="$REPO_ROOT/.env"
read_env_value() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

AGENT_ADDRESS="$(read_env_value AGENT_ADDRESS)"
AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
if [ -z "$AGENT_ADDRESS" ] || [ -z "$AGENT_PK" ]; then echo "ERROR=missing_wallet_in_env"; exit 1; fi
echo "AGENT_ADDRESS=$AGENT_ADDRESS"

BALANCE_WEI="$(cast balance "$AGENT_ADDRESS" --rpc-url "$RPC" 2>/dev/null || echo 0)"
echo "MAINNET_WEI_BALANCE=$BALANCE_WEI"
if [ "$BALANCE_WEI" = "0" ]; then echo "STATUS=NEED_FUNDING"; exit 0; fi

NOTARY_ADDRESS="$(read_env_value KARIBU_NOTARY_ADDRESS_MAINNET)"
if [ -n "$NOTARY_ADDRESS" ]; then
  echo "NOTARY_ALREADY_DEPLOYED_MAINNET=$NOTARY_ADDRESS"; echo "DEPLOY_MAINNET_DONE"; exit 0
fi

echo "DEPLOYING_NOTARY_MAINNET..."
DEPLOY_JSON="$(forge create contracts/KaribuNotary.sol:KaribuNotary \
  --rpc-url "$RPC" --private-key "$AGENT_PK" --broadcast --json 2>/tmp/karibu_forge_create_mainnet_err.log)"
NOTARY_ADDRESS="$(printf '%s' "$DEPLOY_JSON" | jq -r '.deployedTo // empty')"
if [ -z "$NOTARY_ADDRESS" ]; then
  echo "DEPLOY_FAILED"; cat /tmp/karibu_forge_create_mainnet_err.log; exit 1
fi
printf 'KARIBU_NOTARY_ADDRESS_MAINNET=%s\n' "$NOTARY_ADDRESS" >> "$ENV_FILE"
echo "NOTARY_DEPLOYED_MAINNET=$NOTARY_ADDRESS"
echo "ANCHOR_COUNT=$(cast call "$NOTARY_ADDRESS" 'anchorCount()(uint256)' --rpc-url "$RPC" 2>/dev/null || echo NA)"
echo "DEPLOY_MAINNET_DONE"
