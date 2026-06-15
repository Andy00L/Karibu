# DEMO_SCRIPT.md: the 120-second demo

The timed script for the submission video. Drew records it; the agent drafts it.
Every number shown is measured and every transaction is real. Nothing is staged:
if it is not demonstrable today it is not in the script. sourceRef:
KARIBU_BUILD_PLAN.md section 8, docs/MOCKS.md (honesty ledger).

## What is honestly demonstrable today (Celo mainnet, agentId 9373)

- Live agent and dashboard at https://karibu-celo.onrender.com; /health reports
  x402, notary, fx, fxSwap all true.
- ERC-8004 identity on 8004scan https://8004scan.io/agents/celo/9373, with the
  brand avatar and complete metadata (services form, tags, agent_type, version).
- The x402 paywall is real: an unpaid call to a paid endpoint returns a live HTTP
  402 challenge. That is shown directly, without faking a settlement.
- On-chain notary: KaribuNotary 0xf90bd44B34cA1403dB57e9173D2ec8B36764D23d, with
  real mainnet anchors (including this submission document, notarized on-chain).
- Tests: 17 Foundry contract tests and 36 agent tests pass.
- The full paid money path (Mento swap, x402 settlement, gas paid in cUSD via fee
  abstraction, refund on failure) is proven end to end on Celo Sepolia, labeled as
  testnet. It is not presented as mainnet.

What is NOT shown, because it is not real yet: third-party payments, a flipped
Self badge, feedback, or non-zero revenue. The dashboard shows the true counters.

## Script

```
0:00-0:15  Hook on the live dashboard (karibu-celo.onrender.com). "Karibu is a
           live gateway agent on Celo mainnet, agentId 9373." Show /health: four
           services up. The counters are honest, including where they are zero.

0:15-0:40  Mission. Celo is stablecoin payments for real people. Agents need three
           missing pieces: proof a human backs a wallet (Self), FX between local
           stables (Mento), and tamper-evident receipts (notary). Karibu sells all
           three over x402 and pays its own gas in cUSD.

0:40-1:10  Live product, honestly. Free discovery first: /api/skills (the catalog)
           and the A2A card. Then the paywall: curl POST /api/notary with no
           payment returns a real HTTP 402 x402 challenge on screen. Then the
           client: one npx command installs karibu-skill, the package that teaches
           any agent to discover and pay these endpoints.

1:10-1:40  On-chain proof (the core of the pitch). Celoscan: the ERC-8004
           registration, the KaribuNotary contract, and a mainnet notary anchor of
           this very submission. 8004scan: agentId 9373, the avatar, the metadata.
           Terminal: forge test (17 passing) and the agent tests (36 passing).

1:40-2:00  The proven money path and the close. Celo Sepolia explorer: the Mento
           swap, the x402-settled paid swap, the cUSD-gas anchor, and the refund on
           a failed swap, all real testnet transactions, labeled testnet. "On
           mainnet the identity, the notary, and the x402 paywall are live; revenue
           begins with the first third-party call, and every hackathon team's agent
           is a customer one npx install away." End on the live dashboard.
```

## On-chain references (Celo mainnet)

- Registration tx 0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09.
- KaribuNotary 0xf90bd44B34cA1403dB57e9173D2ec8B36764D23d; anchors:
  0x73628884efb65dc5b275fee743eccb662eeac5b4694e16821b977c7cf1d13fda (proof) and
  0x9fe634ad732b51f106425eb5f11e0abf318d7df219bb83177031b734d2024a30 (this
  submission document, anchorCount 2).
- Metadata setAgentURI: services form
  0x52fbf3ebf9348e8173fedc01191bea4d36c59cf5903173296f8a0f9a8d226f42; image and
  completeness 0x75e00e402b910c358e47f961ad95c6e7f2f553f23b4c05823e50f9783f8a2209.

## Honesty notes for the recording

- Do not show the MOCK_STREAM development feed as real activity. The dashboard is
  honest by construction; show it as is, zeros included.
- The Self human-backed badge stays "pending": the on-chain human-proof lookup is
  not wired yet, so no caller is shown as verified. Do not stage a flip.
- Label all Sepolia activity as testnet. Never present testnet counters as mainnet.
- If recording a live FX swap, do it in an open Mento forex window; USD-stable
  swaps (USDm to USDC) work at any hour as the fallback.
