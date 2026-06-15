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

## Self verification (interface stub)

The verify service and the Self payout-gating are implemented, but the on-chain
human-proof lookup is not yet wired, so isHumanBacked reports every caller
unverified (humanBacked false) and the payout policy applies the anonymous cap to
all callers. No caller is ever shown as Self-verified until the real on-chain
attestation source is connected. sourceRef: apps/agent/src/self.ts.

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
- Metadata updated to the ERC-8004 services form via setAgentURI (self-initiated config
  update): tx 0x52fbf3ebf9348e8173fedc01191bea4d36c59cf5903173296f8a0f9a8d226f42 (status 1).
- Profile image and metadata completeness set via setAgentURI (self-initiated config
  updates, native CELO gas, no external hosting): a self-contained data:image/png brand
  image (tx 0x04ab187e6006ed8bac29b6e547d35f6ebc7b5bbef29fc954994dd44f363df0cb, status 1),
  then agent_type, version, tags, and updatedAt for 8004scan completeness
  (tx 0x75e00e402b910c358e47f961ad95c6e7f2f553f23b4c05823e50f9783f8a2209, status 1),
  then the OASF skills/domains taxonomy and A2A skills, accurate to Karibu
  (tx 0xc52fbf9b54e9668039fb41a155d837e421dcdde864a6e38463b86c45353e6ab6, status 1),
  and finally the MCP service once its endpoint was live and functional (tx
  0x04958db770f2607aa27f3989c0e77c1441558ddbd8e9d778f75f958a8b7fd8bb, status 1), so the
  metadata declares 8 services including a working MCP server (A2A + OASF + Web + MCP).
  The agent wallet is ownerOf(9373); the registry blocks any non-owner here.
- KaribuNotary deployed at 0xf90bd44B34cA1403dB57e9173D2ec8B36764D23d (native CELO gas).
- Notary anchor (self-initiated mainnet proof, labeled, native CELO gas):
  tx 0x73628884efb65dc5b275fee743eccb662eeac5b4694e16821b977c7cf1d13fda (status 1).
- Notary anchor of the submission document itself (self-initiated, labeled, native
  CELO gas): the sha256 of docs/SUBMISSION_PACK.md at this commit
  (0x17900bfc966c92ed92b48fd158fd5f0a1d5b85547a6209e3bc6ddb5db821ac8e) anchored at
  tx 0x9fe634ad732b51f106425eb5f11e0abf318d7df219bb83177031b734d2024a30 (status 1),
  bringing anchorCount to 2. Anyone can sha256 the committed file and confirm it is
  anchored. The dashboard txCountTotal is seeded from this on-chain anchorCount.

No wash volume. No owner or operator feedback. The paid-service flows (x402
settlement, Mento swap, cUSD-gas anchor, refund) are proven on Celo Sepolia above
and run on mainnet under the operator's per-kind approval. Self-initiated mainnet
activity is labeled as such.
