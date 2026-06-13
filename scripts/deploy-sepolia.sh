#!/usr/bin/env bash
# Deploy KaribuNotary to Celo Sepolia and register Karibu on the ERC-8004
# Identity Registry. Reads AGENT_PRIVATE_KEY from .env at runtime and never
# prints it. Idempotent: skips a step whose result is already recorded in .env.
# Addresses sourceRef: docs/FACTS.md sections 1 and 3.
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RPC="https://forno.celo-sepolia.celo-testnet.org"
IDENTITY_REGISTRY="0x8004A818BFB912233c491871b3d84c89A494BD9e"
ENV_FILE="$REPO_ROOT/.env"

read_env_value() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-
}

AGENT_ADDRESS="$(read_env_value AGENT_ADDRESS)"
AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
if [ -z "$AGENT_ADDRESS" ] || [ -z "$AGENT_PK" ]; then
  echo "ERROR=missing_wallet_in_env"; exit 1
fi
echo "AGENT_ADDRESS=$AGENT_ADDRESS"

BALANCE_WEI="$(cast balance "$AGENT_ADDRESS" --rpc-url "$RPC" 2>/dev/null || echo 0)"
echo "SEPOLIA_WEI_BALANCE=$BALANCE_WEI"
if [ "$BALANCE_WEI" = "0" ]; then
  echo "STATUS=NEED_FUNDING"; exit 0
fi

# Step 1: deploy KaribuNotary (native CELO gas).
NOTARY_ADDRESS="$(read_env_value KARIBU_NOTARY_ADDRESS_SEPOLIA)"
if [ -n "$NOTARY_ADDRESS" ]; then
  echo "NOTARY_ALREADY_DEPLOYED=$NOTARY_ADDRESS"
else
  echo "DEPLOYING_NOTARY..."
  DEPLOY_JSON="$(forge create contracts/KaribuNotary.sol:KaribuNotary \
    --rpc-url "$RPC" --private-key "$AGENT_PK" --broadcast --json 2>/tmp/karibu_forge_create_err.log)"
  NOTARY_ADDRESS="$(printf '%s' "$DEPLOY_JSON" | jq -r '.deployedTo // empty')"
  if [ -z "$NOTARY_ADDRESS" ]; then
    echo "DEPLOY_FAILED"; cat /tmp/karibu_forge_create_err.log; exit 1
  fi
  printf 'KARIBU_NOTARY_ADDRESS_SEPOLIA=%s\n' "$NOTARY_ADDRESS" >> "$ENV_FILE"
  echo "NOTARY_DEPLOYED=$NOTARY_ADDRESS"
fi

# Step 2: register on the ERC-8004 Identity Registry (native CELO gas).
AGENT_ID="$(read_env_value KARIBU_AGENT_ID)"
if [ -n "$AGENT_ID" ]; then
  echo "AGENT_ALREADY_REGISTERED=$AGENT_ID"
else
  REGISTRATION_JSON="$(cat <<JSON
{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1","name":"Karibu","description":"Gateway agent on Celo: Self-verified humans, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services.","image":"https://raw.githubusercontent.com/Andy00L/Karibu-/main/docs/karibu.png","endpoints":[{"type":"web","url":"https://karibu-celo.onrender.com","address":"$AGENT_ADDRESS","chainId":11142220},{"type":"notary","url":"https://karibu-celo.onrender.com/api/notary","address":"$NOTARY_ADDRESS","chainId":11142220}],"supportedTrust":[]}
JSON
)"
  AGENT_URI="data:application/json;base64,$(printf '%s' "$REGISTRATION_JSON" | base64 -w0)"
  REGISTER_TXHASH="$(cast send "$IDENTITY_REGISTRY" 'register(string)' "$AGENT_URI" \
    --private-key "$AGENT_PK" --rpc-url "$RPC" --json | jq -r '.transactionHash')"
  echo "REGISTER_TXHASH=$REGISTER_TXHASH"
  REGISTERED_TOPIC="$(cast keccak 'Registered(uint256,string,address)')"
  AGENT_ID_HEX="$(cast receipt "$REGISTER_TXHASH" --rpc-url "$RPC" --json \
    | jq -r --arg topic "$REGISTERED_TOPIC" '.logs[] | select(.topics[0]==$topic) | .topics[1]' | head -1)"
  if [ -n "$AGENT_ID_HEX" ] && [ "$AGENT_ID_HEX" != "null" ]; then
    AGENT_ID="$(cast --to-dec "$AGENT_ID_HEX")"
    printf 'KARIBU_AGENT_ID=%s\n' "$AGENT_ID" >> "$ENV_FILE"
    echo "AGENT_ID=$AGENT_ID"
    echo "OWNER_OF_AGENT=$(cast call "$IDENTITY_REGISTRY" 'ownerOf(uint256)(address)' "$AGENT_ID" --rpc-url "$RPC" 2>/dev/null || echo NA)"
  else
    echo "AGENT_ID_UNPARSED tx=$REGISTER_TXHASH"
  fi
fi
echo "DEPLOY_REGISTER_DONE"
