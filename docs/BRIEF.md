# BRIEF: Karibu

## Goal

Karibu is the gateway agent on Celo. It proves a human stands behind a wallet
(Self), quotes and executes FX between Celo stables (Mento), and anchors
verifiable receipts on-chain, and it sells all of it as x402-paid services to
both humans (a Telegram bot) and other agents (an installable skill and a public
A2A endpoint). It bootstraps with a community gas grant, then pays its own gas in
cUSD from revenue. Winning means placing first in all three tracks of the Celo
Onchain Agents Hackathon: Best Agent, Most Activity, and Highest 8004scan rank.

## Deliverables

- Public GitHub repo with a one-command repro (scripts/e2e.sh) and an MIT license.
- The agent (apps/agent): x402-paid verify, fx-quote, fx-swap, notary, plus free
  discovery, the A2A card, and a receipt verifier.
- The installable client (packages/karibu-skill) and the shared types
  (packages/state-contract).
- The dashboard (apps/web), the 120-second demo video, the registration tweets,
  and the celobuilders submission.

## Deadline and milestones

- Friday June 12: Phase 0, second-verified FACTS.md, the Sepolia spike.
- Saturday June 13: the Day 1 GO/NO-GO gate (notary, x402 leg, register).
- Sunday June 14: the surface (FX, skill, Telegram, dashboard), then submit by
  23:00 EDT. Hard cutoff Monday June 15, 5:00 EDT.

## Judging or acceptance criteria

- Track 1 Best Agent: mission alignment, consistent on-chain transactions,
  real-world utility, Self verification of the agent.
- Track 2 Most Activity: third-party on-chain transactions, not self-dealing.
- Track 3 Highest 8004scan rank: third-party ERC-8004 feedback and score.

## Constraints

- Zero capital from drew: testnet-first (MODE T), then a community gas grant
  (MODE G), then revenue-funded gas (MODE R). Mainnet only under the money policy.
- The agent never runs git. Every external fact is second-verified into FACTS.md.
- Honesty: every metric measured, every transaction real, self-initiated activity
  labeled, demo wallets excluded, no owner or operator feedback, no wash volume.

## Stack

- Contracts: Solidity 0.8.28, Foundry.
- Agent: TypeScript, Fastify, thirdweb x402, viem-based Mento SDK, grammY.
- Shared: a zod-validated state contract; pnpm workspace; Next.js dashboard.

## Demo script or rollout plan

See docs/DEMO_SCRIPT.md for the timed 120-second script. In short: the live
dashboard ticks on a real paid call, a human scans Self and a gated payout
unlocks, another agent installs the skill and pays an endpoint, and the explorer
plus 8004scan show the proof.

## Out of scope

- A wallet, a custodial service, or a token.
- Copying Toppa's consumer airtime vertical.
- Any wash volume, self-feedback, or scripted fake customers.
