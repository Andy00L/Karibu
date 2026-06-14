#!/usr/bin/env bash
# Register Karibu on the Celo MAINNET ERC-8004 Identity Registry. Register only
# (does not deploy the notary). Reads AGENT_PRIVATE_KEY from .env, never prints
# it. Idempotent: skips if KARIBU_AGENT_ID_MAINNET is already set. sourceRef:
# scripts/deploy-sepolia.sh, docs/FACTS.md section 3 (mainnet registry).
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RPC="https://forno.celo.org"
IDENTITY_REGISTRY="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
ENV_FILE="$REPO_ROOT/.env"

read_env_value() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

AGENT_ADDRESS="$(read_env_value AGENT_ADDRESS)"
AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
if [ -z "$AGENT_ADDRESS" ] || [ -z "$AGENT_PK" ]; then echo "ERROR=missing_wallet_in_env"; exit 1; fi
echo "AGENT_ADDRESS=$AGENT_ADDRESS"

BALANCE_WEI="$(cast balance "$AGENT_ADDRESS" --rpc-url "$RPC" 2>/dev/null || echo 0)"
echo "MAINNET_WEI_BALANCE=$BALANCE_WEI"
if [ "$BALANCE_WEI" = "0" ]; then echo "STATUS=NEED_FUNDING"; exit 0; fi

AGENT_ID="$(read_env_value KARIBU_AGENT_ID_MAINNET)"
if [ -n "$AGENT_ID" ]; then echo "AGENT_ALREADY_REGISTERED_MAINNET=$AGENT_ID"; echo "REGISTER_MAINNET_DONE"; exit 0; fi

REGISTRATION_JSON="$(cat <<JSON
{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1","name":"Karibu","description":"Gateway agent on Celo: Self-verified humans, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services to humans and other agents.","image":"https://raw.githubusercontent.com/Andy00L/Karibu-/main/docs/karibu.png","endpoints":[{"type":"web","url":"https://karibu-celo.onrender.com","address":"$AGENT_ADDRESS","chainId":42220}],"supportedTrust":[]}
JSON
)"
AGENT_URI="data:application/json;base64,$(printf '%s' "$REGISTRATION_JSON" | base64 -w0)"

REGISTER_TXHASH="$(cast send "$IDENTITY_REGISTRY" 'register(string)' "$AGENT_URI" \
  --private-key "$AGENT_PK" --rpc-url "$RPC" --json | jq -r '.transactionHash')"
echo "REGISTER_TXHASH=$REGISTER_TXHASH"

REGISTERED_TOPIC="$(cast keccak 'Registered(uint256,string,address)')"
sleep 4 # forno read replicas lag after a write
AGENT_ID_HEX="$(cast receipt "$REGISTER_TXHASH" --rpc-url "$RPC" --json \
  | jq -r --arg topic "$REGISTERED_TOPIC" '.logs[] | select(.topics[0]==$topic) | .topics[1]' | head -1)"
if [ -n "$AGENT_ID_HEX" ] && [ "$AGENT_ID_HEX" != "null" ]; then
  AGENT_ID="$(cast --to-dec "$AGENT_ID_HEX")"
  printf 'KARIBU_AGENT_ID_MAINNET=%s\n' "$AGENT_ID" >> "$ENV_FILE"
  echo "AGENT_ID_MAINNET=$AGENT_ID"
  echo "OWNER=$(cast call "$IDENTITY_REGISTRY" 'ownerOf(uint256)(address)' "$AGENT_ID" --rpc-url "$RPC" 2>/dev/null || echo NA)"
else
  echo "AGENT_ID_UNPARSED tx=$REGISTER_TXHASH"
fi
echo "REGISTER_MAINNET_DONE"
