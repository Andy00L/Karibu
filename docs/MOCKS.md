# MOCKS.md: the honest-activity ledger

This file states plainly what is real and what is not, mirrored in the README.
sourceRef: KARIBU_BUILD_PLAN.md section 9.

## The rules we hold to

1. Every transaction shown anywhere is real on-chain activity. Every metric on
   the dashboard is measured from chain reads and server counters, never
   hardcoded.
2. Self-initiated activity (the hourly FX-rate attestation and operational
   transactions) is labeled selfInitiated in the event stream and counted
   separately from client-paid calls.
3. Drew's own wallets used in demos are listed by address below and excluded
   from the uniqueClientWallets count.
4. No feedback is ever submitted by the owner or operator. The ERC-8004
   contract blocks it and we do not attempt it. No incentives are paid for
   feedback.
5. If a direct-transfer fallback ever replaces x402 on an endpoint, it is
   declared here by endpoint name. As of now, no endpoint uses a fallback.
6. Testnet activity is never presented as mainnet activity. The dashboard and
   README state which network each number comes from, with separate counters.

## Wallets

- Agent wallet (owner and operator): 0x1147856217691a72C96F36F04697Abfb7305eF9f.
  This is the treasury and the only wallet holding funds. It never submits
  feedback on the agent.
- Drew's demo wallets (the human customer in the demo): to be listed here by
  address before the demo. These are excluded from uniqueClientWallets.

## MOCK_STREAM (development only)

The agent supports an environment flag MOCK_STREAM=1 that emits a synthetic
event stream so the dashboard can be skinned against live-looking data during
development. It is OFF for the real demo and submission. When MOCK_STREAM=1:

- Every event is sample data. Client wallets are the obvious placeholders
  0x1111..., 0x2222..., 0x3333..., and transaction hashes start with 0xmock.
- The /health endpoint reports mockStream true so the mode is never mistaken
  for real activity.

No sample data from MOCK_STREAM is ever shown in the demo or counted as real.

## Replay protection (in-memory)

Notary and swap requests may carry a client nonce; the server rejects a
duplicate nonce within a 24 hour window. The store is in-memory for now, so a
process restart clears it. sourceRef: KARIBU_BUILD_PLAN.md section 2.3.

## Real activity so far (Celo Sepolia, MODE T)

- ERC-8004 registration: agentId 358, owner 0x1147856217691a72C96F36F04697Abfb7305eF9f,
  tx 0xc200567358a8f56cd745b1d8ce9585652e95306ebe16c2024b22eb2be1d8caeb.
- KaribuNotary deployed at 0x42B8e75E43E28577E412026ceDb511b5B3cf0f41.
- Notary anchor (self-initiated verification test, native CELO gas):
  tx 0x90c3aa9598964dc8d5689c9aa1e6c185cd7b49e6cd24f752fd7cb220242c7a4c,
  anchorCount 1. Labeled self-initiated; not a client-paid call.

## Real activity so far (Celo mainnet)

- ERC-8004 registration: agentId 9373, owner 0x1147856217691a72C96F36F04697Abfb7305eF9f,
  tx 0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09 (status 1, block
  69558612), shown on 8004scan at https://8004scan.io/agents/celo/9373.

No wash volume. No owner or operator feedback. The paid-service flows (x402
settlement, Mento swap, cUSD-gas anchor, refund) are proven on Celo Sepolia above
and run on mainnet under the operator's per-kind approval. Self-initiated mainnet
activity is labeled as such.
