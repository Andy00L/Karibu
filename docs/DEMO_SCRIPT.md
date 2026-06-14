# DEMO_SCRIPT.md: the 120-second demo

This is the timed script for the submission video. Drew records it; the agent
drafts it. Every number shown is measured and every transaction is real.
sourceRef: KARIBU_BUILD_PLAN.md section 8.

## Prerequisites before recording

- The agent is running with the thirdweb server wallet set, so a paid x402 call
  settles live and the dashboard tick increments.
- For the live local-currency FX swap, record during an open Mento forex window
  (Sunday evening, after about 5pm ET; weekends are closed). USD-stable swaps
  (USDm to USDC) work at any hour as a fallback live swap.
- If the gas grant has landed, the registration and the headline swap are on
  mainnet; otherwise the video states plainly that the activity is Celo Sepolia
  (MODE T) and the counters are testnet counters.

## Script

```
0:00-0:10  Hook on the live dashboard. "This is Karibu, and those ticks are
           other agents paying it right now." The Activity counter increments
           on a real x402 settlement.

0:10-0:35  Mission frame. Celo is stablecoin payments for real people. Agents
           need two missing pieces: proof a human is behind a wallet, and FX
           between local stables. Karibu sells both, plus on-chain notary
           receipts, over x402.

0:35-1:10  Live product. Drew's phone: a Self scan flips the Human-backed badge,
           and a gated cUSD to local-stable payout executes through the Telegram
           bot. Then a terminal: another agent installs the skill with one
           command (npx, the karibu-skill package) and pays /api/verify; the
           settlement and the SSE event appear on the dashboard.

1:10-1:40  On-chain proof. The explorer: the swap transaction and a notary
           anchor with the fee paid in cUSD. 8004scan: the agentId, the score,
           third-party feedback. forge test: 17 passing.

1:40-2:00  The loop. The Treasury card: earned X cUSD, paid Y gas, net positive;
           the agent is self-funding since its first customer. "Registered,
           verified, earning. Karibu stays after the hackathon: the Agent Visa
           application is filed." End on the live feed.
```

## What is real today (Celo Sepolia, MODE T)

- agentId 358, register tx
  0xc200567358a8f56cd745b1d8ce9585652e95306ebe16c2024b22eb2be1d8caeb.
- KaribuNotary 0x42B8e75E43E28577E412026ceDb511b5B3cf0f41, anchor tx
  0x90c3aa9598964dc8d5689c9aa1e6c185cd7b49e6cd24f752fd7cb220242c7a4c.
- The agent serves verify, fx-quote, notary behind x402, plus discovery and the
  A2A card; e2e.sh passes; 17 Foundry tests pass.

## Honesty notes for the recording

- Do not show the MOCK_STREAM development feed as real activity. Record against
  real settlements once the server wallet is set.
- Label testnet activity as testnet. Never present Sepolia counters as mainnet.
- The FX swap shown live must be in an open Mento market window.
