#!/usr/bin/env bash
# Read-only research helper for the 8004scan metadata investigation.
# Reads on-chain tokenURIs from the Celo mainnet Identity Registry and decodes
# the base64 data URIs. No transactions are sent. Safe to delete after use.
# sourceRef: docs/FACTS.md section 3 (mainnet registry 0x8004A169...).
set -uo pipefail
CAST="$HOME/.foundry/bin/cast"
RPC="https://forno.celo.org"
REG="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"

decode_token_uri() {
  # $1 = agentId, $2 = label
  local agent_id="$1"
  local label="$2"
  echo "===== ${label} tokenURI(${agent_id}) RAW (first 140 chars) ====="
  local raw
  raw="$("$CAST" call "$REG" "tokenURI(uint256)(string)" "$agent_id" --rpc-url "$RPC" 2>&1)"
  printf '%s\n' "$raw" | head -c 140
  echo ""
  echo "===== ${label} DECODED JSON ====="
  printf '%s' "$raw" \
    | sed -E 's/^"?data:application\/json;base64,//; s/"$//' \
    | base64 -d 2>/dev/null
  echo ""
  echo "----- end ${label} -----"
  echo ""
}

case "${1:-all}" in
  karibu) decode_token_uri 9373 "Karibu" ;;
  toppa)  decode_token_uri 1870 "Toppa" ;;
  eye)    decode_token_uri 1865 "AgenticEye" ;;
  owner)
    echo "ownerOf(9373)=$("$CAST" call "$REG" "ownerOf(uint256)(address)" 9373 --rpc-url "$RPC" 2>&1)"
    ;;
  contract)
    OWNER_ADDR="0x1147856217691a72C96F36F04697Abfb7305eF9f" # Karibu agent wallet = NFT owner of 9373
    echo "=== contract-level owner() ==="
    "$CAST" call "$REG" "owner()(address)" --rpc-url "$RPC" 2>&1
    echo "=== EIP-1967 implementation slot ==="
    "$CAST" storage "$REG" 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url "$RPC" 2>&1
    echo "=== setAgentURI selector === "
    "$CAST" sig 'setAgentURI(uint256,string)'
    echo "=== setMetadata selector ==="
    "$CAST" sig 'setMetadata(uint256,string,bytes)'
    echo "=== eth_call SIMULATION of setAgentURI(9373, ...) from the NFT owner (no tx sent) ==="
    # If this returns without revert, the function exists in the impl and the NFT owner is authorized.
    "$CAST" call "$REG" "setAgentURI(uint256,string)" 9373 "data:application/json,{}" \
      --from "$OWNER_ADDR" --rpc-url "$RPC" 2>&1 | head -c 300
    echo ""
    echo "=== eth_call SIMULATION of setAgentURI from a RANDOM non-owner (expect auth revert) ==="
    "$CAST" call "$REG" "setAgentURI(uint256,string)" 9373 "data:application/json,{}" \
      --from "0x000000000000000000000000000000000000dEaD" --rpc-url "$RPC" 2>&1 | head -c 300
    echo ""
    ;;
  *)
    decode_token_uri 9373 "Karibu"
    decode_token_uri 1870 "Toppa"
    decode_token_uri 1865 "AgenticEye"
    ;;
esac
