# SUBMISSION.md: posts and checklist

The agent drafts; drew posts and submits. Nothing here is sent automatically.
sourceRef: KARIBU_BUILD_PLAN.md sections 1 and 11.

## Registration quote-tweet (post first)

Quote-tweet the hackathon announcement and post:

> Building Karibu for the Celo Onchain Agents Hackathon: the gateway agent on
> Celo. Proof-of-personhood with Self, Mento FX between local stables, and
> on-chain notary receipts, all sold as x402-paid services to humans and other
> agents, self-funding its gas in cUSD. Now registered on Celo mainnet
> ERC-8004: https://8004scan.io/agents/celo/9373 @Celo @CeloDevs

Mainnet registration is live: agentId 9373 on the Identity Registry
0x8004A169FB4a3325136EB29fA0ceB6D2e539a432, shown on 8004scan at
https://8004scan.io/agents/celo/9373 (page title resolves to "Karibu | 8004scan").
Celo Sepolia also has agentId 358 on 0x8004A818BFB912233c491871b3d84c89A494BD9e.

## Second tweet (the 8004scan agentId)

> Karibu is live on 8004scan as agentId 9373. Other agents
> discover its services for free at /api/skills and pay per call with x402, one
> npx install away. It pays its own gas in cUSD from revenue.
> https://8004scan.io/agents/celo/9373 @Celo @CeloDevs

Post this once the mainnet registration and 8004scan indexing are live.

## celobuilders submission flow (dry-run early, on Day 2)

1. From a clean shell: npx skills add https://celobuilders.xyz
2. Ask the coding agent: "Help me submit my project to the Celo Onchain Agents
   Hackathon", choose celo-onchain-agents.
3. Answer the questions, review, publish.
4. Save the confirmation screenshot.

Run this end to end early; editions have changed the mechanism before. Record
the exact steps that worked in docs/DECISIONS.md.

## Submission checklist (target Sunday June 14, 23:00 EDT)

- [ ] Public GitHub repo, README current, MIT LICENSE present.
- [ ] e2e.sh passes from a fresh clone following only the README.
- [ ] Mainnet or honestly-labeled Sepolia agentId, contract addresses, and
      explorer links listed; dashboard URL live.
- [ ] 120-second video uploaded and linked (docs/DEMO_SCRIPT.md).
- [ ] docs/MOCKS.md honest and current; FACTS.md and DECISIONS.md current.
- [ ] Money policy respected: SpendTracker total within funds, treasury
      reconciles, no value stranded.
- [ ] Final-check greps from SKILL_GENERAL.md pass on every file.
- [ ] Registration quote-tweet posted with the ERC-8004 link; second tweet with
      the 8004scan agentId; screenshots saved.
- [ ] Submitted through the verified celobuilders mechanism before the cutoff;
      confirmation screenshot saved.

## Current real state to cite (Celo mainnet)

- agentId 9373 on Identity Registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
  register tx 0x3c4a32ee9f478344c803c8fc2ff9eae7bfa9ca3e7cb0ac13ffe1625a18fdca09
  (status 1, block 69558612); ownerOf(9373) is the agent wallet; shown on 8004scan
  at https://8004scan.io/agents/celo/9373. KaribuNotary not yet deployed to mainnet.

## Current real state to cite (Celo Sepolia, MODE T)

- agentId 358; register tx
  0xc200567358a8f56cd745b1d8ce9585652e95306ebe16c2024b22eb2be1d8caeb.
- KaribuNotary 0x42B8e75E43E28577E412026ceDb511b5B3cf0f41; anchor tx
  0x90c3aa9598964dc8d5689c9aa1e6c185cd7b49e6cd24f752fd7cb220242c7a4c.
- Identity Registry 0x8004A818BFB912233c491871b3d84c89A494BD9e; Reputation
  Registry 0x8004B663056A597Dffe9eCcC1965A193B7388713.
