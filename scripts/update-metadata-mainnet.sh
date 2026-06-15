#!/usr/bin/env bash
# Set agentId 9373's on-chain ERC-8004 metadata IN PLACE via setAgentURI (owner
# gated; the agent wallet is ownerOf(9373)). Native CELO gas. Reads the key from
# .env and never prints it. The payload is the spec-compliant `services` form (6
# services, each with an endpoint, no deprecated `endpoints` field) plus a
# self-contained data:image/png brand image (no external hosting), and the
# completeness fields 8004scan rewards (agent_type, version, tags, updatedAt),
# mirroring a high-scoring agent's metadata shape. Reproduces the live on-chain
# state and is safe to re-run. sourceRef: scripts/build-registration-v2.sh,
# docs/HACKATHON_STRATEGY.md, 8004scan agent 1870 metadata (completeness fields).
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
if [ ! -f docs/karibu.png ]; then echo "ERROR=brand_png_missing"; exit 1; fi
IMG_URI="data:image/png;base64,$(base64 -w0 docs/karibu.png)"
NOW="$(date +%s)"
# Declare the MCP service only when its endpoint is actually live, so the metadata
# never points 8004scan at a 404. The /mcp and /.well-known/mcp.json routes ship in
# the agent deploy. sourceRef: apps/agent/src/mcp.ts.
MCP_CODE="$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$BASE_URL/.well-known/mcp.json" 2>/dev/null || echo 000)"
if [ "$MCP_CODE" = "200" ]; then MCP_LIVE=true; else MCP_LIVE=false; fi
echo "MCP_ENDPOINT_LIVE=$MCP_LIVE (http $MCP_CODE)"

# Build the registration JSON with jq so every value is escaped correctly.
REGISTRATION_JSON="$(jq -cn --arg img "$IMG_URI" --arg base "$BASE_URL" --arg reg "$IDENTITY_REGISTRY" --argjson now "$NOW" --argjson mcplive "$MCP_LIVE" '{
  type:"https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name:"Karibu",
  description:"Gateway agent on Celo: Self human-verification, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services to humans and other agents.",
  image:$img,
  agent_type:"service",
  version:"0.1.0",
  tags:["payments","x402","stablecoin","fx","mento","notary","identity","self","celo","ai-agents","agent-gateway"],
  updatedAt:$now,
  active:true,
  x402Support:true,
  services:([
    {name:"A2A", endpoint:($base+"/.well-known/agent-card.json"), version:"0.2.0", a2aSkills:["technology/blockchain/smart_contracts","finance_and_business/finance/digital_payments","tool_interaction/automation/workflow_automation"]},
    {name:"OASF", version:"v0.8.0", endpoint:"https://github.com/agntcy/oasf/", skills:["tool_interaction/automation/workflow_automation"], domains:["technology/blockchain/cryptocurrency","technology/blockchain/smart_contracts","finance_and_business/finance/digital_payments"]},
    {name:"web", description:"Karibu web endpoint", endpoint:$base, method:"GET", protocol:"Web"},
    {name:"verify", description:"Whether a verified human backs a wallet, via Self.", endpoint:($base+"/api/verify/:wallet"), method:"GET", paymentRequired:true},
    {name:"fx-quote", description:"A Mento FX quote between Celo stables.", endpoint:($base+"/api/fx/quote"), method:"POST", paymentRequired:true},
    {name:"fx-swap", description:"Convert prepaid USDC to a Celo stable, paid out to you. Cost is the USDC amount you convert plus the 0.05 fee. Self-gated above the anonymous cap.", endpoint:($base+"/api/fx/swap"), method:"POST", paymentRequired:true},
    {name:"notary", description:"Anchor a sha256 hash on Celo and return a receipt.", endpoint:($base+"/api/notary"), method:"POST", paymentRequired:true}
  ] + (if $mcplive then [{name:"MCP", version:"2025-06-18", endpoint:($base+"/.well-known/mcp.json"), mcpTools:["discover","verify","fx_quote","fx_swap","notary"]}] else [] end)),
  registrations:[{agentId:9373, agentRegistry:("eip155:42220:"+$reg)}],
  supportedTrust:["reputation"]
}')"

if ! printf '%s' "$REGISTRATION_JSON" | jq -e . >/dev/null 2>&1; then echo "ERROR=json_invalid"; exit 1; fi
echo "REGISTRATION_JSON_BYTES=$(printf '%s' "$REGISTRATION_JSON" | wc -c)"
DATA_URI="data:application/json;base64,$(printf '%s' "$REGISTRATION_JSON" | base64 -w0)"
echo "DATA_URI_BYTES=$(printf '%s' "$DATA_URI" | wc -c)"

RECEIPT="$(cast send "$IDENTITY_REGISTRY" 'setAgentURI(uint256,string)' 9373 "$DATA_URI" \
  --private-key "$AGENT_PK" --rpc-url "$RPC" --json 2>/tmp/karibu_setagenturi_err.log)"
if [ -z "$RECEIPT" ]; then echo "SEND_FAILED"; cat /tmp/karibu_setagenturi_err.log; exit 1; fi
TXHASH="$(printf '%s' "$RECEIPT" | jq -r '.transactionHash')"
echo "SET_AGENT_URI_TX=$TXHASH"
echo "STATUS=$(printf '%s' "$RECEIPT" | jq -r '.status')"
echo "EXPLORER=https://celoscan.io/tx/$TXHASH"
echo "UPDATE_METADATA_DONE"
