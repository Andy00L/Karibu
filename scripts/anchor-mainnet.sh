#!/usr/bin/env bash
# Anchor a sha256 hash in KaribuNotary on Celo MAINNET: self-initiated, native
# CELO gas. Produces one real, labeled mainnet transaction proving the notary
# works on mainnet. Reads AGENT_PRIVATE_KEY and KARIBU_NOTARY_ADDRESS_MAINNET from
# .env and never prints the key. Idempotent: skips if the hash is already anchored.
# Run scripts/deploy-notary-mainnet.sh first. sourceRef: contracts/KaribuNotary.sol
# (anchor/isAnchored/anchorCount), scripts/deploy-notary-mainnet.sh.
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
RPC="https://forno.celo.org"
ENV_FILE="$REPO_ROOT/.env"
read_env_value() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
NOTARY="$(read_env_value KARIBU_NOTARY_ADDRESS_MAINNET)"
if [ -z "$AGENT_PK" ]; then echo "ERROR=missing_key_in_env"; exit 1; fi
if [ -z "$NOTARY" ]; then echo "ERROR=notary_not_deployed_mainnet_run_deploy_first"; exit 1; fi

# A reproducible label, so the anchor is clearly a self-initiated mainnet proof
# and not client content. Override with arg 1.
LABEL="${1:-karibu mainnet notary proof}"
HASH="0x$(printf '%s' "$LABEL" | sha256sum | cut -d' ' -f1)"
echo "NOTARY=$NOTARY"
echo "LABEL=$LABEL"
echo "HASH=$HASH"

ALREADY="$(cast call "$NOTARY" 'isAnchored(bytes32)(bool)' "$HASH" --rpc-url "$RPC" 2>/dev/null || echo false)"
if [ "$ALREADY" = "true" ]; then
  echo "ALREADY_ANCHORED=true"
  echo "ANCHOR_COUNT=$(cast call "$NOTARY" 'anchorCount()(uint256)' --rpc-url "$RPC" 2>/dev/null | awk '{print $1}')"
  echo "ANCHOR_MAINNET_DONE"; exit 0
fi

TXHASH="$(cast send "$NOTARY" 'anchor(bytes32)' "$HASH" --private-key "$AGENT_PK" --rpc-url "$RPC" --json | jq -r '.transactionHash')"
echo "ANCHOR_TXHASH=$TXHASH"
echo "STATUS=$(cast receipt "$TXHASH" --rpc-url "$RPC" --json 2>/dev/null | jq -r '.status')"
echo "ANCHOR_COUNT=$(cast call "$NOTARY" 'anchorCount()(uint256)' --rpc-url "$RPC" 2>/dev/null | awk '{print $1}')"
echo "EXPLORER=https://celoscan.io/tx/$TXHASH"
echo "ANCHOR_MAINNET_DONE"
