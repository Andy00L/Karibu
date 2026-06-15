#!/usr/bin/env bash
# Update agentId 9373's on-chain metadata IN PLACE to the spec-compliant `services`
# form so 8004scan parses the endpoint (fixes warnings WA031 + WA008). setAgentURI
# is owner-gated and the agent wallet is ownerOf(9373). Native CELO gas. Reads
# AGENT_PRIVATE_KEY from .env and never prints it. The JSON below is the exact
# payload scripts/build-registration-v2.sh validated (6 services, every one with an
# endpoint, no deprecated endpoints field) and simulated clean from the owner.
# sourceRef: scripts/build-registration-v2.sh, docs/HACKATHON_STRATEGY.md.
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
RPC="https://forno.celo.org"
IDENTITY_REGISTRY="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
ENV_FILE="$REPO_ROOT/.env"
read_env_value() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }
AGENT_PK="$(read_env_value AGENT_PRIVATE_KEY)"
if [ -z "$AGENT_PK" ]; then echo "ERROR=missing_key_in_env"; exit 1; fi
BASE_URL="https://karibu-celo.onrender.com"

read -r -d '' REGISTRATION_JSON <<JSON
{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1","name":"Karibu","description":"Gateway agent on Celo: Self human-verification, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services to humans and other agents.","image":"${BASE_URL}/karibu.png","active":true,"x402Support":true,"services":[{"name":"A2A","endpoint":"${BASE_URL}/.well-known/agent-card.json","version":"0.2.0"},{"name":"web","description":"Karibu web endpoint","endpoint":"${BASE_URL}","method":"GET","protocol":"Web"},{"name":"verify","description":"Whether a verified human backs a wallet, via Self.","endpoint":"${BASE_URL}/api/verify/:wallet","method":"GET","paymentRequired":true},{"name":"fx-quote","description":"A Mento FX quote between Celo stables.","endpoint":"${BASE_URL}/api/fx/quote","method":"POST","paymentRequired":true},{"name":"fx-swap","description":"Convert prepaid USDC to a Celo stable, paid out to you. Cost is the USDC amount you convert plus the 0.05 fee. Self-gated above the anonymous cap.","endpoint":"${BASE_URL}/api/fx/swap","method":"POST","paymentRequired":true},{"name":"notary","description":"Anchor a sha256 hash on Celo and return a receipt.","endpoint":"${BASE_URL}/api/notary","method":"POST","paymentRequired":true}],"registrations":[{"agentId":9373,"agentRegistry":"eip155:42220:${IDENTITY_REGISTRY}"}],"supportedTrust":["reputation"]}
JSON

if ! printf '%s' "$REGISTRATION_JSON" | jq -e . >/dev/null 2>&1; then echo "ERROR=json_invalid"; exit 1; fi
DATA_URI="data:application/json;base64,$(printf '%s' "$REGISTRATION_JSON" | base64 -w0)"
echo "DATA_URI_BYTES=$(printf '%s' "$DATA_URI" | wc -c)"

RECEIPT="$(cast send "$IDENTITY_REGISTRY" 'setAgentURI(uint256,string)' 9373 "$DATA_URI" \
  --private-key "$AGENT_PK" --rpc-url "$RPC" --json 2>/tmp/karibu_setagenturi_err.log)"
if [ -z "$RECEIPT" ]; then echo "SEND_FAILED"; cat /tmp/karibu_setagenturi_err.log; exit 1; fi
TXHASH="$(printf '%s' "$RECEIPT" | jq -r '.transactionHash')"
echo "SET_AGENT_URI_TX=$TXHASH"
echo "STATUS=$(printf '%s' "$RECEIPT" | jq -r '.status')"
echo "BLOCK=$(printf '%s' "$RECEIPT" | jq -r '.blockNumber')"
echo "EXPLORER=https://celoscan.io/tx/$TXHASH"
sleep 4
echo "--- tokenURI(9373) now (first 90 chars) ---"
cast call "$IDENTITY_REGISTRY" 'tokenURI(uint256)(string)' 9373 --rpc-url "$RPC" 2>/dev/null | head -c 90
echo
echo "UPDATE_METADATA_DONE"
