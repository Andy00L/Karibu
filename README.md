# Karibu

Karibu is the gateway agent on Celo. It proves a human stands behind a wallet
(Self), quotes and executes FX between Celo stables (Mento), and anchors
verifiable receipts on-chain, and it sells all of it as x402-paid services that
both humans and other agents consume. It bootstraps with a community gas grant,
then pays its own gas in cUSD from revenue.

Status: registered on Celo mainnet (ERC-8004 agentId 9373) and proven end to end
on Celo Sepolia. One endpoint serves both the x402 API and a live dashboard at /.
Mainnet transactions run under the money policy with the operator's per-kind
approval.

## Proof links (Celo mainnet)

- ERC-8004 agentId 9373 on the Identity Registry
  0x8004A169FB4a3325136EB29fA0ceB6D2e539a432, owned by the agent wallet
  0x1147856217691a72C96F36F04697Abfb7305eF9f. Registration tx:
  https://celoscan.io/tx/0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09
- 8004scan profile: https://8004scan.io/agents/celo/9373

## Proof links (Celo Sepolia, measured, not hardcoded)

- ERC-8004 agentId: 358. Owner is the agent wallet
  0x1147856217691a72C96F36F04697Abfb7305eF9f.
  Registration tx:
  https://celo-sepolia.blockscout.com/tx/0xc200567358a8f56cd745b1d8ce9585652e95306ebe16c2024b22eb2be1d8caeb
- KaribuNotary contract:
  https://celo-sepolia.blockscout.com/address/0x42B8e75E43E28577E412026ceDb511b5B3cf0f41
- Notary anchor (self-initiated verification, native gas):
  https://celo-sepolia.blockscout.com/tx/0x90c3aa9598964dc8d5689c9aa1e6c185cd7b49e6cd24f752fd7cb220242c7a4c
- Identity Registry (Sepolia): 0x8004A818BFB912233c491871b3d84c89A494BD9e.
  Reputation Registry (Sepolia): 0x8004B663056A597Dffe9eCcC1965A193B7388713.
- Dashboard URL: to be added when deployed.
- Demo video: to be added.

## Services (sold over x402)

| Service | Method and path | Price | What it does |
|---------|-----------------|-------|--------------|
| verify | GET /api/verify/:wallet | $0.01 | Whether a verified human backs a wallet, via Self |
| fx-quote | POST /api/fx/quote | $0.01 | A Mento FX quote between Celo stables |
| fx-swap | POST /api/fx/swap | $0.05 | Execute a Mento FX swap, Self-gated above the anonymous cap |
| notary | POST /api/notary | $0.02 | Anchor a sha256 hash on Celo and return a receipt |

Any agent discovers these for free at GET /api/skills and installs the
client with the `karibu-skill` package (see packages/karibu-skill).

## Architecture

```
Other agents (the other teams)   Humans                   Celo
  npx karibu-skill               Telegram bot (grammY)    ERC-8004 Identity +
  wrapFetchWithPayment   ----->  small FX, notary  -----> Reputation registries
          |                           |                   Self registries + gate
          v                           v                   Mento broker (FX)
  +------------------- apps/agent (Fastify TS) ----------+ KaribuNotary (anchors)
  | x402 settlePayment gate -> handlers -> on-chain txs  | agent gas paid in cUSD
  | metrics + SpendTracker + SSE stream                  | via feeCurrency
  +------------------------------------------------------+
          |
          v
  live dashboard + /verify-receipt/:hash, both served by the agent
```

Repo layout: contracts/ (KaribuNotary + Foundry tests), packages/state-contract
(shared types and zod schemas), packages/karibu-skill (the installable client),
apps/agent (the Fastify server, the x402 API, and the live dashboard at /).

## Why each sponsor integration is load-bearing

- Self gates real money flows: FX payouts above the anonymous cap require a
  verified human behind the caller.
- Mento moves real value between Celo stables (USDm, EURm, KESm, and more); the
  fx-quote service returns live rates and fx-swap executes the trade.
- x402 (thirdweb) is the revenue engine: every service call is a real on-chain
  settlement, confirmed on both Celo mainnet and Celo Sepolia.
- Fee abstraction (CIP-64) lets the agent pay its own gas in cUSD/USDm, so it is
  self-funding from its first customer.

## Reproduce

```bash
# contracts
bash scripts/get-foundry-deps.sh   # vendors forge-std without git
forge test                          # 17 tests, all green

# workspace
pnpm install
pnpm -r build

# deploy to Sepolia and register (reads the key from .env at runtime)
bash scripts/deploy-sepolia.sh
```

A one-command end-to-end script (scripts/e2e.sh) that runs a full paid loop is
added once the x402 server wallet is configured.

## Run it

```bash
pnpm install && pnpm -r build
# fill .env from .env.example (agent key, thirdweb x402 credentials, network)
KARIBU_NETWORK=celo node apps/agent/dist/index.js
# the x402 API and the live dashboard are now on http://localhost:8787 (/ is the dashboard)
```

## Deploy

The agent is one stateless Node service. Use the included render.yaml (Render
Blueprint, service name karibu-celo, which matches the registered endpoint URL) or
the Dockerfile (Fly, Railway, a VPS). Set the secrets from .env.example in the
host's dashboard; never commit them. The health check path is /health.

## What is real and what is not

See docs/MOCKS.md, the honesty ledger. In short: every transaction shown is real
on-chain activity, every metric is measured, self-initiated activity is labeled
and counted separately, the operator's demo wallets are excluded from the unique
client count, no feedback is ever submitted by the owner or operator, and no
testnet activity is presented as mainnet. The MOCK_STREAM development mode is
clearly labeled and off for the demo.

## Continuity

An Agent Visa application is filed after the build, since Karibu keeps running
and earning after the hackathon.

## License

MIT. See LICENSE.
