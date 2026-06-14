#!/usr/bin/env bash
# Build and validate the ERC-8004 registration-v1 JSON for Karibu (agentId 9373)
# in the spec-compliant `services` form that 8004scan parses (fixes WA031 + WA008).
# This script ONLY builds, validates, and prints the data URI and the ready-to-run
# cast command. It sends NOTHING on-chain. The human runs the cast send separately.
#
# Schema cross-checked against:
#  - ERC-8004 spec registration-v1 (top-level `services`, per-service `name`+`endpoint`).
#  - Toppa (agentId 1870, score 93.97) real on-chain registration at
#    https://api.toppa.cc/registration.json (verbatim `services` shape).
#  - Karibu's own live catalog GET https://karibu-celo.onrender.com/api/skills and
#    packages/state-contract/src/index.ts SERVICE_CATALOG (paths + prices).
# sourceRef: docs/FACTS.md section 3; 8004scan agent 9373 warnings WA031/WA008.
set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

AGENT_ADDRESS="0x1147856217691a72C96F36F04697Abfb7305eF9f" # ownerOf(9373); sourceRef: docs/FACTS.md s.2
IDENTITY_REGISTRY="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" # Celo mainnet; sourceRef: docs/FACTS.md s.3
BASE_URL="https://karibu-celo.onrender.com"

# Compact, single-line JSON. `services` (not `endpoints`); every service carries an
# `endpoint` URL. The A2A service endpoint is the agent-card.json URL whose DOMAIN
# 8004scan resolves and matches against /.well-known/agent-registration.json.
read -r -d '' REGISTRATION_JSON <<JSON
{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1","name":"Karibu","description":"Gateway agent on Celo: Self-verified humans, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services to humans and other agents.","image":"https://raw.githubusercontent.com/Andy00L/Karibu-/main/docs/karibu.png","active":true,"x402Support":true,"services":[{"name":"A2A","endpoint":"${BASE_URL}/.well-known/agent-card.json","version":"0.2.0"},{"name":"web","description":"Karibu web endpoint","endpoint":"${BASE_URL}","method":"GET","protocol":"Web"},{"name":"verify","description":"Whether a verified human backs a wallet, via Self.","endpoint":"${BASE_URL}/api/verify/:wallet","method":"GET","paymentRequired":true},{"name":"fx-quote","description":"A Mento FX quote between Celo stables.","endpoint":"${BASE_URL}/api/fx/quote","method":"POST","paymentRequired":true},{"name":"fx-swap","description":"Convert prepaid USDC to a Celo stable, paid out to you. Cost is the USDC amount you convert plus the 0.05 fee. Self-gated above the anonymous cap.","endpoint":"${BASE_URL}/api/fx/swap","method":"POST","paymentRequired":true},{"name":"notary","description":"Anchor a sha256 hash on Celo and return a receipt.","endpoint":"${BASE_URL}/api/notary","method":"POST","paymentRequired":true}],"registrations":[{"agentId":9373,"agentRegistry":"eip155:42220:${IDENTITY_REGISTRY}"}],"supportedTrust":["reputation"]}
JSON

echo "===== 1) JSON validity check (jq) ====="
if printf '%s' "$REGISTRATION_JSON" | jq -e . >/dev/null 2>&1; then
  echo "JSON_VALID=true"
  echo "services_count=$(printf '%s' "$REGISTRATION_JSON" | jq '.services | length')"
  echo "every_service_has_endpoint=$(printf '%s' "$REGISTRATION_JSON" | jq '[.services[] | has("endpoint")] | all')"
  echo "has_endpoints_field(must_be_false)=$(printf '%s' "$REGISTRATION_JSON" | jq 'has("endpoints")')"
else
  echo "JSON_VALID=false"; printf '%s' "$REGISTRATION_JSON" | jq . ; exit 1
fi

echo ""
echo "===== 2) byte size of JSON ====="
echo "json_bytes=$(printf '%s' "$REGISTRATION_JSON" | wc -c)"

# Build the data URI exactly as cast will receive it.
DATA_URI="data:application/json;base64,$(printf '%s' "$REGISTRATION_JSON" | base64 -w0)"
echo ""
echo "===== 3) base64 round-trip check ====="
if printf '%s' "$DATA_URI" | sed 's/^data:application\/json;base64,//' | base64 -d | jq -e . >/dev/null 2>&1; then
  echo "ROUNDTRIP_VALID=true"
else
  echo "ROUNDTRIP_VALID=false"; exit 1
fi

echo ""
echo "===== 4) the agentURI data URI (paste-ready) ====="
printf '%s\n' "$DATA_URI"

echo ""
echo "===== 4b) eth_call SIMULATION of the real payload (read-only, sends NOTHING) ====="
CAST="$HOME/.foundry/bin/cast"
SIM_OUT="$("$CAST" call "$IDENTITY_REGISTRY" "setAgentURI(uint256,string)" 9373 "$DATA_URI" --from "$AGENT_ADDRESS" --rpc-url https://forno.celo.org 2>&1)"
if [ "$SIM_OUT" = "0x" ]; then
  echo "SIMULATION_FROM_OWNER=success(0x) -> function exists, owner authorized, payload accepted"
else
  echo "SIMULATION_FROM_OWNER_UNEXPECTED=$SIM_OUT"
fi
GAS_EST="$("$CAST" estimate "$IDENTITY_REGISTRY" "setAgentURI(uint256,string)" 9373 "$DATA_URI" --from "$AGENT_ADDRESS" --rpc-url https://forno.celo.org 2>&1)"
echo "GAS_ESTIMATE=$GAS_EST"

echo ""
echo "===== 5) READY-TO-RUN cast command (the human runs this; it sends a tx) ====="
cat <<CMD
# Update agentId 9373 metadata in place. Owner-gated; AGENT_ADDRESS is ownerOf(9373).
# AGENT_PRIVATE_KEY is read from .env and never printed.
source $REPO_ROOT/.env && \\
"\$HOME/.foundry/bin/cast" send $IDENTITY_REGISTRY \\
  'setAgentURI(uint256,string)' \\
  9373 \\
  '$DATA_URI' \\
  --private-key "\$AGENT_PRIVATE_KEY" \\
  --rpc-url https://forno.celo.org
CMD
