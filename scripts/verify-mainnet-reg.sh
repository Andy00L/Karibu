#!/usr/bin/env bash
# Second-verify Karibu's Celo MAINNET ERC-8004 registration directly on-chain,
# independently of register-mainnet.sh, so the registration can be confirmed by
# anyone reading the public chain. Reads nothing secret. sourceRef:
# scripts/register-mainnet.sh, docs/FACTS.md section 3 (mainnet registry + agentId).
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Celo mainnet RPC and the ERC-8004 Identity Registry. sourceRef: docs/FACTS.md section 3.
RPC="https://forno.celo.org"
IDENTITY_REGISTRY="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
# Defaults are the values register-mainnet.sh produced; override as args 1 (agentId) and 2 (txhash).
AGENT_ID="${1:-9373}"
REGISTER_TXHASH="${2:-0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09}"

RECEIPT_JSON="$(cast receipt "$REGISTER_TXHASH" --rpc-url "$RPC" --json 2>/dev/null || echo '')"
if [ -z "$RECEIPT_JSON" ]; then echo "ERROR=receipt_unavailable tx=$REGISTER_TXHASH"; exit 1; fi

TX_STATUS_HEX="$(printf '%s' "$RECEIPT_JSON" | jq -r '.status')"
BLOCK_HEX="$(printf '%s' "$RECEIPT_JSON" | jq -r '.blockNumber')"
echo "TX_HASH=$REGISTER_TXHASH"
echo "TX_STATUS=$TX_STATUS_HEX"  # 0x1 = success
echo "BLOCK=$(cast --to-dec "$BLOCK_HEX" 2>/dev/null || echo "$BLOCK_HEX")"
echo "AGENT_ID=$AGENT_ID"
echo "OWNER_OF_AGENT=$(cast call "$IDENTITY_REGISTRY" 'ownerOf(uint256)(address)' "$AGENT_ID" --rpc-url "$RPC" 2>/dev/null || echo NA)"

# The reference ERC-8004 registry is ERC-721 based (ownerOf resolved above), so the
# agent URI is exposed via tokenURI; try the common getters and report whichever resolves.
AGENT_URI=""
URI_GETTER=""
for GETTER in 'tokenURI(uint256)(string)' 'agentURI(uint256)(string)' 'getAgent(uint256)(string)'; do
  CANDIDATE="$(cast call "$IDENTITY_REGISTRY" "$GETTER" "$AGENT_ID" --rpc-url "$RPC" 2>/dev/null || echo '')"
  if [ -n "$CANDIDATE" ] && [ "$CANDIDATE" != "0x" ]; then AGENT_URI="$CANDIDATE"; URI_GETTER="$GETTER"; break; fi
done
if [ -n "$AGENT_URI" ]; then
  echo "URI_GETTER=$URI_GETTER"
  echo "AGENT_URI_PREFIX=$(printf '%s' "$AGENT_URI" | head -c 90)"
else
  echo "AGENT_URI=unresolved_getter"  # status + owner above are still definitive proof
fi
echo "VERIFY_DONE"
