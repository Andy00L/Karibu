# Karibu: submission pack (paste-ready)

Everything for the Celo Onchain Agents Hackathon submission, ready to copy. Run
`npx skills add https://celobuilders.xyz`, ask the agent to submit to the Celo
Onchain Agents Hackathon, choose `celo-onchain-agents`, and paste from the
sections below. All facts here are real and on-chain; the honesty note is part of
the pitch.

## One-liner

Karibu is the gateway agent on Celo: it sells Self human-verification checks, Mento FX
between Celo stables, and on-chain notary receipts as x402-paid services to humans
and other agents, and it pays its own gas in cUSD.

## What it is (description)

Karibu is a single agent that bundles three paid services every Celo agent needs
and sells them over x402: proof that a real human backs a wallet (Self), foreign
exchange between Celo stablecoins (Mento), and tamper-evident notary receipts
anchored on-chain (KaribuNotary). Humans reach it through a live dashboard and the
HTTP API; other agents discover it for free at `/api/skills`, read its A2A card,
and pay per call with one `npx` install of the `karibu-skill` client. It runs from
one always-on endpoint that serves both the API and the dashboard, registers on
ERC-8004, and pays its own gas in cUSD through Celo fee abstraction, so it is
self-funding from its first customer. No top agent on the Celo leaderboard offers
a multi-service gateway like this.

## Tracks entered

- Track 1: Best Agent
- Track 2: Most Activity (on-chain transactions)
- Track 3: Highest 8004scan rank

## Links

- Live agent and dashboard: https://karibu-celo.onrender.com
- Public repo: https://github.com/Andy00L/Karibu
- 8004scan profile: https://8004scan.io/agents/celo/9373
- A2A agent card: https://karibu-celo.onrender.com/.well-known/agent-card.json
- Free service catalog: https://karibu-celo.onrender.com/api/skills
- Endpoint verification file: https://karibu-celo.onrender.com/.well-known/agent-registration.json

## On-chain proof (Celo mainnet, agentId 9373)

- Agent wallet and treasury: 0x1147856217691a72C96F36F04697Abfb7305eF9f
- ERC-8004 Identity Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
- Registration: https://celoscan.io/tx/0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09
- Metadata set to the ERC-8004 `services` form (setAgentURI): https://celoscan.io/tx/0x52fbf3ebf9348e8173fedc01191bea4d36c59cf5903173296f8a0f9a8d226f42
- KaribuNotary contract: https://celoscan.io/address/0xf90bd44B34cA1403dB57e9173D2ec8B36764D23d
- Notary anchor (self-initiated proof): https://celoscan.io/tx/0x73628884efb65dc5b275fee743eccb662eeac5b4694e16821b977c7cf1d13fda

## Full paid flow proven (Celo Sepolia)

Every leg of the money path was proven end to end on testnet with real settled
transactions before mainnet:

- Mento swap: tx 0x52b103df93f161dcdeecaa7f62d6ee34fa3815f78d3362fb93fd8b6421261bbf
- x402-paid swap, settled: tx 0x99b0ccdb6ce06efed845b090cc47ef14ce34a2a85526b280d38d0ff9420d46bc
- Notary anchor with gas paid in cUSD via fee abstraction: tx 0x81621ef288014c684b07f4e28db8f2eee0c5eda35578a3794539505ec9a8778c
- Refund on a failed paid swap (caller made whole): tx 0x1cb72aedf0b9711762bcd61e5118e1afd1ffb0e739ae188b2ed6b400083f1ead
- Sepolia agentId 358, KaribuNotary 0x42B8e75E43E28577E412026ceDb511b5B3cf0f41

## Why each sponsor integration is load-bearing

- Self gating is implemented in the payout policy: FX payouts above the anonymous
  cap are reserved for Self-verified callers, and the verify service exposes that
  check. The on-chain human-proof lookup is the one piece still pending the Self
  mainnet integration, so today every caller is treated at the anonymous cap and
  verify reports unverified. The gate and the interface are real; the on-chain
  attestation source is the remaining wire-up.
- Mento moves real value between Celo stables; fx-quote returns live rates and
  fx-swap executes the trade from the treasury, prepaid by the caller.
- x402 (thirdweb) is the revenue engine: every service call is a real on-chain
  settlement on Celo, gas-sponsored through the thirdweb facilitator.
- Fee abstraction (CIP-64) pays the agent's own gas in cUSD, proven on-chain, so
  the agent never needs native CELO to operate.

## The meta-play

`karibu-skill` is an installable client (one `npx` command) that teaches any team's
agent to discover and pay Karibu's endpoints. The other hackathon teams are the
first customers, and every third-party call is a real Celo transaction from an
independent wallet.

## What is real (honesty)

Every transaction shown is real on-chain activity; every dashboard number is
measured from chain reads and server counters, never hardcoded. Self-initiated
activity (operational anchors, the metadata update) is labeled as such and counted
separately from client-paid calls. No wash volume. No owner or operator feedback
on the agent (the ERC-8004 contract blocks it and we do not attempt it). Testnet
activity is never presented as mainnet. The Self human-proof lookup is an honest
interface stub today: it reports every caller unverified until the on-chain
attestation source is wired, so no caller is shown as Self-verified. Full ledger:
docs/MOCKS.md.

## Demo

The 120-second demo is recorded on the live dashboard at https://karibu-celo.onrender.com:
the four service cards, the live event feed, a notary anchor and its Celoscan link,
the 8004scan profile, and the treasury card showing gas paid in cUSD. Script:
docs/DEMO_SCRIPT.md.

## Self Agent ID

The agent ran the gasless Ed25519 Self Agent ID flow on Celo mainnet (production
endpoint, scope self-agent-id). Final completion needs a one-time human passport
scan with the Self app; if the passport scan does not complete, the documented
fallback is a screenshot of the Self app, and the agent's on-chain ERC-8004
identity stands on its own. Self is beneficial but not required for the submission.

## One-command reproduction

```bash
git clone https://github.com/Andy00L/Karibu && cd Karibu
pnpm install && pnpm -r build
KARIBU_NETWORK=celo node apps/agent/dist/index.js   # API + dashboard on :8787
```
