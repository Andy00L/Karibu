# FACTS_DRAFT.md: pre-researched external facts for Karibu

STATUS: DRAFT. UNTRUSTED UNTIL SECOND-VERIFIED.

This file was researched on June 12, 2026 in claude.ai sessions (two deep
research passes with web fetches of official docs). It is INPUT to Phase 0,
not its output. The build agent must second-verify every line before any of
it may be cited in code: re-fetch each sourceRef, confirm or correct the
line, resolve every item marked OPEN, then write the confirmed result to
docs/FACTS.md. Only FACTS.md (post-verification) is citable truth in code.
If a sourceRef and this draft disagree, the live source wins and the
discrepancy is recorded in docs/DECISIONS.md.

Legend:
  [V] verified on June 12, 2026 against the cited source (still re-verify)
  [S] from registry/training memory, plausible but weaker (re-verify first)
  [OPEN] not yet verified; Phase 0 must resolve before related code exists

---

## 1. Hackathon logistics

- [V] Event: Celo Onchain Agents Hackathon, May 22 - June 15, 2026, virtual,
  payments and everyday-applications themed, 5,000 USD pool paid in CELO.
  sourceRef: the official hackathon page (drew holds the link and a full copy
  in this conversation's project context).
- [V] Tracks (stackable): Track 1 Best Agent on Celo 2,500 / 1,000 / 500 USD;
  Track 2 Most Activity (onchain transactions) 500 USD; Track 3 Highest Rank
  in 8004scan for Celo 500 USD. sourceRef: hackathon page.
- [V] Deadlines: submissions close June 15, 9:00 GMT, which is 5:00 EDT in
  Montreal. Winners announced June 17, 15:00 GMT. Submissions opened June 8.
  Registration deadline June 15. sourceRef: hackathon page.
- [V] Registration: quote-tweet the announcement tagging @CeloDevs and @Celo,
  stating the project and the ERC-8004 registry link. A second tweet about
  the agent must include the 8004scan agentId and ideally the Self Agent ID,
  tagging @Celo and @CeloDevs. sourceRef: hackathon page.
- [V] Submission mechanism: npx skills add https://celobuilders.xyz then ask
  the coding agent "Help me submit my project to the Celo Onchain Agents
  Hackathon", choose celo-onchain-agents, answer questions, review, publish.
  sourceRef: hackathon page. [OPEN] Run the flow early (Day 2) to confirm it
  works end to end; editions have changed mechanisms before.
- [V] Track 1 judging: alignment with the ecosystem mission, delivery of
  consistent transactions and onchain activity, real-world utility. Judges
  perform manual review to filter sybil attempts. Self verification of the
  agent is requested; if Self does not support the region, a screenshot of
  the Self app error attached to the submission is the accepted fallback.
  sourceRef: hackathon page FAQ.
- [V] Judges: Lena Hierzi (DevRel Lead), Viral Sangani (AI Lead), Marek
  Olszewski (co-founder Celo and Self, CEO Celo Core Co.). sourceRef:
  hackathon page.
- [V] OpenClaw is recommended but any framework is allowed. Karibu uses a
  custom TypeScript agent (decision recorded in DECISIONS.md).
- [V] Previous edition (Real World Agent Hackathon V2, results March 2026):
  69 teams; winners Agentopolis, SocialClaw, Toppa, AgentHands (Track 1),
  Celo8004 (infra), Toppa (8004scan rank). Judged by trained review agents
  across 18 unpublished data points plus human review. sourceRef:
  https://www.celopg.eco/insights/and-the-winners-are-in-real-world-agent-hackathon-v2

## 2. Celo network facts

- [V] Chain IDs: Celo Mainnet 42220; Celo Sepolia 11142220. Alfajores (44787)
  is deprecated; do not use it. sourceRef:
  https://docs.celo.org/build-on-celo/build-with-ai/8004 (and Celo docs
  network pages).
- [V] Public RPC: https://forno.celo.org (no key). [S] Websocket
  wss://forno.celo.org/ws. [OPEN] Confirm the ws path; have a free backup
  RPC (dRPC or QuickNode) ready in .env.
- [V] Gas on Celo costs a fraction of a US cent per simple transaction.
- [OPEN] Celo Sepolia faucet URL and test-token (cUSD equivalent) addresses.
  Candidate: https://faucet.celo.org. Resolve before the Sepolia spike.

## 3. ERC-8004 (Identity + Reputation registries)

- [V] Celo Mainnet addresses: Identity Registry
  0x8004A169FB4a3325136EB29fA0ceB6D2e539a432, Reputation Registry
  0x8004BAa17C55a88189AE136b182e5fdA19dE9b63. sourceRef:
  https://docs.celo.org/build-on-celo/build-with-ai/8004
- [V] Celo Sepolia addresses: Identity
  0x8004A818BFB912233c491871b3d84c89A494BD9e, Reputation
  0x8004B663056A597Dffe9eCcC1965A193B7388713. Same sourceRef.
- [V] No official Validation Registry is deployed on Celo (spec under active
  update with the TEE community). Do not depend on it. Same sourceRef.
- [V] register(agentURI) mints an ERC-721 agent NFT. agentURI points to a
  registration JSON (HTTPS, IPFS, or base64 data URI) with at least: type
  "https://eips.ethereum.org/EIPS/eip-8004#registration-v1", name,
  description, image, services [{name, endpoint}] including web, A2A card at
  /.well-known/agent-card.json, and the x402 API base. sourceRef: same Celo
  docs page + https://eips.ethereum.org/EIPS/eip-8004
- [V] Domain verification: serving
  /.well-known/agent-registration.json containing the agentRegistry address
  and agentId marks the endpoint verified in explorers. Same sourceRef.
- [V] Reputation: giveFeedback(agentId, score 0-100, decimals, tag1, tag2,
  endpoint, detailedFeedbackURI, feedbackHash). Standard tags: starred,
  uptime, successRate, responseTime, reachable. getSummary(agentId,
  clientAddresses) requires a non-empty client list. readAllFeedback exists.
  sourceRef: Celo 8004 docs page + https://github.com/erc-8004/erc-8004-contracts
- [V] The contract BLOCKS the agent owner and operator addresses from
  submitting feedback on their own agent. Self-feedback is impossible at the
  contract level; never attempt it. Same sourceRefs.
- [V] Agent identifier format: eip155:42220:0x8004A169...#<agentId>.
- [S] TS SDK: @chaoschain/sdk wraps the registries. [OPEN] Pin the version
  and confirm it targets the Celo deployments; otherwise call the contracts
  directly with viem using the ABI from the erc-8004-contracts repo.
- [V] 8004scan.io leaderboard is "ranked by score, popularity, and
  activity". The score is a normalized composite (about 0-100), not the raw
  feedback count: snapshot June 12, Toppa 94.0 with 581 feedbacks ranks
  above Agentic Eye 93.8 with 700. The exact formula is unpublished. Treat
  Track 3 as opportunistic. sourceRef: https://8004scan.io/leaderboard
- [V] Secondary explorer + API: https://erc-8004.quicknode.com. [OPEN]
  Indexing delay of 8004scan for new Celo agents (register early to absorb
  it).

## 4. Self Agent ID (proof of human behind the agent)

- [V] Celo Mainnet contracts: SelfAgentRegistry
  0xaC3DF9ABf80d0F5c020C06B04Cced27763355944, SelfHumanProofProvider
  0x4b036aFD959B457A208F676cf44Ea3ef73Ea3E3d, SelfReputationRegistry
  0x69Da18CF4Ac27121FD99cEB06e38c3DC78F363f4, SelfValidationRegistry
  0x71a025e0e338EAbcB45154F8b8CA50b41e7A0577, AgentDemoVerifier
  0xD8ec054FD869A762bC977AC328385142303c7def, AgentGate
  0x26e05bF632fb5bACB665ab014240EAC1413dAE35, Identity Hub V2
  0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF. sourceRef:
  https://docs.self.xyz/contract-integration/deployed-contracts and
  https://docs.self.xyz/self-agent-id
- [V] SDK: npm @selfxyz/agent-sdk. Server gating middleware:
  SelfAgentVerifier.create().requireAge(18).requireOFAC().sybilLimit(n)
  .rateLimit({perMinute}).build(); app.use(verifier.auth()); handler reads
  req.agent.address and req.agent.credentials. Agent-side signed calls:
  SelfAgent.fetch() adds x-self-agent-address, x-self-agent-signature,
  x-self-agent-timestamp headers. sourceRef:
  https://docs.self.xyz/self-agent-id/verification-patterns and
  https://github.com/selfxyz/self-agent-id
- [V] Onchain gating: AgentGate.sol exposes onlyVerifiedAgent backed by
  registry.isVerifiedAgent(bytes32). Agent identity NFT is soulbound; proof
  renewal is deregister then re-register. Modes: verified-wallet,
  agent-identity (recommended for autonomous agents), wallet-free,
  smart-wallet. Same sourceRefs.
- [V] Human verification happens by scanning a passport (NFC) in the Self
  app; iOS app exists; dev portal at tools.self.xyz; agent app at
  app.ai.self.xyz. [OPEN, HUMAN-BLOCKED] Canadian passport scan on drew's
  iPhone: drew tests tonight; on failure, screenshot the error (accepted
  submission fallback per section 1) and use wallet-free mode.

## 5. x402 payments (thirdweb) on Celo

- [V] Server pattern: import { settlePayment, facilitator } from
  "thirdweb/x402"; facilitator({ client, serverWalletAddress });
  settlePayment({ resourceUrl, method, paymentData: req.headers["x-payment"],
  payTo, network: celo, price: "$0.01", facilitator }) returns status 200 on
  paid, else status + responseHeaders + responseBody to forward (the HTTP
  402 flow). Client pattern: wrapFetchWithPayment(client, account,
  { paymentOptions }) auto-handles 402. Dynamic pricing scheme "upto" with
  minPrice/price. sourceRef: https://portal.thirdweb.com/x402 and the Celo
  x402 docs page under docs.celo.org/build-on-celo/build-with-ai.
- [V] Requires a thirdweb project (secret key) and a thirdweb server wallet
  address (created in their dashboard by drew).
- [OPEN] Whether the thirdweb x402 facilitator settles on Celo Sepolia or
  mainnet only; which stable tokens it settles in on Celo (cUSD vs USDC);
  facilitator fees if any. Resolve from the thirdweb x402 docs and one live
  test before pricing endpoints. If testnet is unsupported, the x402 leg
  waits for the mainnet grant; fallback payment check is a direct ERC-20
  transfer verified onchain before serving (declared in MOCKS.md if used).

## 6. Fee abstraction (gas paid in stables, CIP-64)

- [V] viem supports feeCurrency on Celo transactions when using the celo
  chain definition. For 6-decimal tokens use the ADAPTER address as
  feeCurrency, never the token address: USDC token
  0xcebA9300f2b948710d2653dD7B07f33A8B32118C with adapter
  0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B; USDT token
  0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e with adapter
  0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72. sourceRef: the Celo
  fee-abstraction docs page under docs.celo.org/build-on-celo.
- [S] cUSD (18 decimals) is usable directly as feeCurrency. Candidate
  mainnet address 0x765DE816845861e75A25fCA122bb6898B8B1282a. [OPEN]
  Re-verify the address and the no-adapter claim from the same docs page
  before first use.
- [V] MiniPay constraint: fee abstraction limited to cUSD/USDm and legacy
  (non EIP-1559) transactions. Relevant only if a MiniPay mini-app is built.
  sourceRef: docs.celo.org MiniPay quickstart.

## 7. Mento (FX between Celo stables)

- [S] SDK: npm @mento-protocol/mento-sdk; swaps route through the Mento
  Broker contract. [OPEN] Pin SDK version; confirm the Broker mainnet
  address from docs.mento.org (training-memory candidate
  0x777A8255cA72412f0d706dc03C9D1987306B4CaD; DO NOT use without
  verification).
- [S] Candidate stable token mainnet addresses (ALL [OPEN], re-verify from
  the official Mento/Celo token list before use): cEUR
  0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73, cREAL
  0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787, cKES
  0x456a3D042C0DbD3db53D5489e98dFb038553B0d0.
- [OPEN] Live liquidity and minimum sizes for cUSD<->cKES and cUSD<->cEUR
  pairs; pick the deepest pair for the demo. If cKES is thin, cEUR or cREAL
  replaces it; if all are blocked, the FX service degrades to a Self-gated
  P2P cUSD transfer service (cut list, plan section 10).

## 8. Tooling, hosting, competition snapshot

- [V] Celo Agent Skills for the coding agent: npx openskills install
  celo-org/agent-skills -g (covers erc-8004, x402, fee-abstraction, mento,
  minipay, thirdweb). sourceRef: https://github.com/celo-org/agent-skills
- [S] Hosting: Render free tier spins down after about 15 minutes idle;
  UptimeRobot free pings keep it warm. Vercel free tier hosts the Next.js
  dashboard. [OPEN] Confirm current free-tier limits at signup time.
- [S] Telegram bot library: grammY (choice, record in DECISIONS.md).
- [V] Competition snapshot (June 12): top Celo agents on 8004scan are Toppa
  (score 94.0, 581 feedbacks, airtime/data/bills in cUSD, multi-chain) and
  Agentic Eye (93.8, 700 feedbacks). Other live Celo agents include an x402
  airtime/utilities agent (170+ countries), GameArena, Artesania Viajera.
  Karibu does not compete head-on with Toppa's consumer vertical; it sells
  infra services other agents and humans pay for. sourceRef:
  https://8004scan.io/leaderboard
- [V] Agent Visa program (Tourist -> Work Visa -> Citizenship) rewards
  agents proving real utility onchain; applying post-build is a continuity
  signal for the README. sourceRef: celopg.eco Agent Visa announcement.
- [OPEN] npm package name availability: karibu-skill and create-karibu-skill.
  Fallback install path that needs no npm publish: npx
  github:Andy00L/Karibu- (subdir). Decide on Day 2 with drew (npm publish is
  an externally visible action requiring approval).

## 9. Phase 0 second-verification checklist (in order)

1. Re-fetch every [V] sourceRef above; confirm or correct each line.
2. Re-pin every [S] item (npm view, official docs); record exact versions.
3. Resolve every [OPEN]: Sepolia faucet + test tokens; thirdweb x402 network
   support on Celo; cUSD-as-feeCurrency; Mento broker + token addresses +
   liquidity; @chaoschain/sdk fit; 8004scan indexing delay; celobuilders
   submission flow dry-run timing; npm name availability.
4. Write the confirmed result to docs/FACTS.md, one fact per line with its
   sourceRef. Delete nothing from this draft; FACTS.md supersedes it.
5. Record every draft-vs-source discrepancy in docs/DECISIONS.md.
