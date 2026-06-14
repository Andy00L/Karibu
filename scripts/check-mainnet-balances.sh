#!/usr/bin/env bash
# Read-only: the agent wallet's Celo mainnet balances (native CELO plus the
# stables Karibu uses), so we know which mainnet demos are funded. No tx is sent.
# sourceRef: apps/agent/src/config.ts (mainnet addresses), docs/FACTS.md sec 1, 7.
set -uo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
RPC="https://forno.celo.org"
AGENT="0x1147856217691a72C96F36F04697Abfb7305eF9f"

balance_of() { cast call "$1" 'balanceOf(address)(uint256)' "$AGENT" --rpc-url "$RPC" 2>/dev/null | awk '{print $1}'; }

echo "AGENT=$AGENT"
echo "CELO_WEI=$(cast balance "$AGENT" --rpc-url "$RPC")"
echo "USDC_RAW_6dp=$(balance_of 0xcebA9300f2b948710d2653dD7B07f33A8B32118C)"
echo "CUSD_RAW_18dp=$(balance_of 0x765DE816845861e75A25fCA122bb6898B8B1282a)"
echo "CKES_RAW_18dp=$(balance_of 0x456a3D042C0DbD3db53D5489e98dFb038553B0d0)"
echo "CEUR_RAW_18dp=$(balance_of 0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73)"
echo "BALANCES_DONE"
