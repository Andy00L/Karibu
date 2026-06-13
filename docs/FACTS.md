# FACTS.md: second-verified external facts for Karibu

STATUS: CITABLE TRUTH. Produced in Phase 0 by second-verifying docs/FACTS_DRAFT.md.
Only this file may be cited in code. Verification date: 2026-06-13.

Confidence legend:
  [V-CHAIN] verified by a read-only on-chain call (cast) on 2026-06-13. Gold standard.
  [V-DOCS]  verified against the live official documentation page on 2026-06-13.
  [V-NPM]   verified against the npm registry on 2026-06-13.
  [S]       from the draft or registry memory, plausible, not yet hard-verified. Re-verify before first use.
  [OPEN]    not resolved. Listed in section 11. Resolve before the related code ships.

Verification tooling: Foundry forge/cast 1.7.1. Read calls used cast symbol(), decimals(),
code(), chain-id() against the public RPCs in section 1. No transactions were sent.

---

## 1. Networks

- [V-CHAIN] Celo Mainnet chain id 42220. RPC https://forno.celo.org (rate limited).
  sourceRef: cast chain-id against forno.celo.org returned 42220.
- [V-CHAIN] Celo Sepolia chain id 11142220. RPC https://forno.celo-sepolia.celo-testnet.org.
  sourceRef: cast chain-id against that RPC returned 11142220.
- [V-DOCS] Celo Sepolia block explorer https://celo-sepolia.blockscout.com. A Celoscan
  testnet explorer also exists at https://sepolia.celoscan.io. sourceRef: docs.celo.org network page.
- [V-DOCS] Alfajores (44787) is deprecated. Do not use it. sourceRef: docs.celo.org.
- [S] Have a backup RPC (dRPC or QuickNode) ready in .env in case forno rate limits during the demo.

## 2. Agent wallet (this build)

- The Karibu agent wallet was created in Phase 0 with cast wallet new. Public address
  0x1147856217691a72C96F36F04697Abfb7305eF9f. The private key is stored only in the
  gitignored .env as AGENT_PRIVATE_KEY and is never printed, logged, or committed.
- Sepolia CELO balance at creation: 0 (funding pending, see section 8 and DECISIONS.md).

## 3. ERC-8004 Identity and Reputation registries

- [V-CHAIN] Celo Mainnet Identity Registry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
  (ERC-721, token symbol AGENT, deployed). Reputation Registry
  0x8004BAa17C55a88189AE136b182e5fdA19dE9b63. sourceRef: cast symbol()/code() reads +
  https://docs.celo.org/build-on-celo/build-with-ai/8004
- [V-CHAIN] Celo Sepolia Identity Registry 0x8004A818BFB912233c491871b3d84c89A494BD9e
  (symbol AGENT, deployed). Reputation Registry 0x8004B663056A597Dffe9eCcC1965A193B7388713
  (deployed). sourceRef: cast symbol()/code() reads + same docs page.
- [V-REPO] register function (the one Karibu uses):
  register(string agentURI) returns (uint256 agentId). Overloads also exist: register()
  and register(string agentURI, MetadataEntry[] metadata). sourceRef:
  https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/abis/IdentityRegistry.json
- [V-REPO] Event on registration: Registered(uint256 indexed agentId, string agentURI,
  address indexed owner). A standard ERC-721 Transfer(from, to, tokenId) also fires (mint).
  Read agentId from the Registered event or the Transfer tokenId. sourceRef: same ABI.
- [V-REPO] Read functions: getAgentWallet(uint256 agentId) returns address,
  getMetadata(uint256 agentId, string key) returns bytes, ownerOf(uint256), tokenURI(uint256).
  sourceRef: same ABI.
- [V-DOCS] agentURI points to a registration JSON (HTTPS, IPFS, or base64 data URI) with at
  least: type, name, description, image, an endpoints array of {type, url, address, chainId},
  and a supportedTrust array. Include the web endpoint, the A2A card at
  /.well-known/agent-card.json, and the x402 API base. sourceRef: docs.celo.org 8004 page.
- [V-DOCS] Serving /.well-known/agent-registration.json with the registry address and agentId
  marks the endpoint verified in explorers. sourceRef: same page.
- [V-DOCS] giveFeedback(agentId, score 0-100, decimals, tag1, tag2, endpoint,
  detailedFeedbackURI, feedbackHash). Standard tags: starred, uptime, successRate,
  responseTime, reachable. sourceRef: docs.celo.org 8004 page.
- [V-DOCS] The contract blocks the owner and operator addresses from submitting feedback on
  their own agent. Self-feedback is impossible at the contract level. Never attempt it.
  sourceRef: same page.
- [S] Agent identifier format: eip155:42220:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432#<agentId>.
  sourceRef: draft, consistent with CAIP-10 plus token id.
- [V-DOCS] No official Validation Registry on Celo. Do not depend on it. sourceRef: same page.
- [S] 8004scan.io ranks by a normalized composite score (about 0-100), not raw feedback count.
  Formula unpublished. Treat Track 3 as opportunistic. Register early to absorb indexing delay.
  Secondary explorer https://erc-8004.quicknode.com. sourceRef: https://8004scan.io/leaderboard

## 4. Self Agent ID

- [V-NPM] SDK npm @selfxyz/agent-sdk, latest 0.2.1. TypeScript SDK for agents to sign requests
  and for services to validate agent identity through on-chain proof-of-human credentials.
  sourceRef: https://registry.npmjs.org/@selfxyz/agent-sdk
- [V-DOCS] Server gating middleware shape: SelfAgentVerifier.create().requireAge(18)
  .requireOFAC().sybilLimit(n).rateLimit({ perMinute }).build(); app.use(verifier.auth());
  handler reads req.agent.address and req.agent.credentials. Agent-side signed calls:
  SelfAgent.fetch() adds x-self-agent-address, x-self-agent-signature, x-self-agent-timestamp.
  sourceRef: https://docs.self.xyz/self-agent-id/verification-patterns
- [S] Modes: verified-wallet, agent-identity (recommended for autonomous agents), wallet-free,
  smart-wallet. Identity NFT soulbound; renewal is deregister then re-register. sourceRef: draft + docs.self.xyz.
- [S] Celo Mainnet contracts (re-verify on-chain before first Self registration):
  SelfAgentRegistry 0xaC3DF9ABf80d0F5c020C06B04Cced27763355944,
  SelfHumanProofProvider 0x4b036aFD959B457A208F676cf44Ea3ef73Ea3E3d,
  SelfReputationRegistry 0x69Da18CF4Ac27121FD99cEB06e38c3DC78F363f4,
  SelfValidationRegistry 0x71a025e0e338EAbcB45154F8b8CA50b41e7A0577,
  AgentDemoVerifier 0xD8ec054FD869A762bC977AC328385142303c7def,
  AgentGate 0x26e05bF632fb5bACB665ab014240EAC1413dAE35,
  Identity Hub V2 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF.
  sourceRef: https://docs.self.xyz/contract-integration/deployed-contracts
- [OPEN, HUMAN-BLOCKED] Canadian passport scan on drew's iPhone. On failure: screenshot the
  Self app error (accepted hackathon submission fallback) and use wallet-free mode.

## 5. x402 payments (thirdweb)

- [V-DOCS] Server imports: import { settlePayment, facilitator } from "thirdweb/x402";
  import { celo, celoSepolia } from "thirdweb/chains". Client: wrapFetchWithPayment({ client,
  account, paymentOptions: { maxValue } }). A React hook useFetchWithPayment also exists; the
  agent client uses wrapFetchWithPayment. sourceRef: https://portal.thirdweb.com/x402/server
  and https://docs.celo.org/build-on-celo/build-with-ai/x402
- [V-DOCS] settlePayment arguments: { resourceUrl, method, paymentData (from x-payment header),
  payTo, network, price, facilitator, routeConfig: { description, mimeType, maxTimeoutSeconds } }.
  network is a chain object from thirdweb/chains (celo or celoSepolia). Returns status 200 on
  paid; otherwise returns the status, response headers, and response body to forward as the HTTP
  402. sourceRef: same pages.
- [V-DOCS] thirdweb x402 settles on BOTH Celo Mainnet (network: celo) and Celo Sepolia
  (network: celoSepolia). Tokens on Celo: USDC, USDT, USDm. Price is a USD string, for example
  "$0.01"; the facilitator selects the token, defaulting to USDC. sourceRef: Celo x402 page +
  https://blog.thirdweb.com/changelog/expanding-x402-payments-to-26-new-chains/ (Celo listed
  among chains with both mainnet and testnet support).
- [V-DOCS] Server needs a thirdweb client created with secretKey (env THIRDWEB_SECRET_KEY) and a
  thirdweb server wallet address (drew creates it in the thirdweb dashboard). payTo is the
  receiving address (the Karibu treasury). sourceRef: portal.thirdweb.com/x402/server
- [OPEN] thirdweb facilitator fee on Celo, and which token actually settles on Celo Sepolia in
  practice. Confirm by reading the facilitator response body on the first live paid call before
  pricing endpoints. Fallback if testnet settlement fails: direct ERC-20 transfer verified
  on-chain before serving, declared in MOCKS.md.

- [V-NPM] thirdweb is pinned at 5.120.1. Exact x402 API from the installed type
  definitions. Server: settlePayment(args) where args = { resourceUrl, method,
  paymentData (the X-PAYMENT or PAYMENT-SIGNATURE header value, may be null),
  network (a thirdweb Chain such as celoSepolia, or a FacilitatorNetwork), price
  ("$0.01" or { amount, asset: { address, decimals } }), facilitator, payTo (the
  treasury), scheme ("exact" default or "upto"), routeConfig ({ description,
  mimeType, maxTimeoutSeconds }), waitUntil ("simulated" | "submitted" |
  "confirmed"), x402Version (1 or 2, default 2) }. Returns { status: 200,
  responseHeaders, paymentReceipt } when paid, else { status: 402,
  responseHeaders, responseBody }. facilitator(config) where config = { client
  (createThirdwebClient with secretKey), serverWalletAddress, waitUntil? }.
  Client: wrapFetchWithPayment(fetch, client, wallet, options?) with positional
  arguments (not an object), options = { maxValue?: bigint,
  paymentRequirementsSelector?, storage? }, and wallet is a thirdweb Wallet.
  sourceRef: node_modules thirdweb@5.120.1 dist/types/x402/{settle-payment,
  fetchWithPayment, types, facilitator}.d.ts.

## 6. Fee abstraction (gas paid in stables, CIP-64)

- [V-CHAIN] USDm (the token historically called cUSD) is 18 decimals on both networks, so it is
  usable directly as feeCurrency with no adapter. Mainnet 0x765DE816845861e75A25fCA122bb6898B8B1282a,
  Sepolia 0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b. sourceRef: cast decimals() returned 18 on both.
- [V-CHAIN] USDC is 6 decimals (Sepolia 0x01C5C0122039549AD1493B8220cABEdD739BC44E returned
  decimals 6), so for USDC or USDT the FeeCurrencyAdapter address must be passed as feeCurrency,
  never the token address. sourceRef: cast decimals() + docs.celo.org fee-abstraction page.
- [S] Mainnet adapter candidates from the draft, confirm against the FeeCurrencyDirectory
  on-chain before the first feeCurrency transaction that uses them: USDC token
  0xcebA9300f2b948710d2653dD7B07f33A8B32118C adapter 0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B;
  USDT token 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e adapter 0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72.
  sourceRef: draft + docs.celo.org. Karibu pays its own gas in USDm (no adapter), so the
  adapters are only needed if a client pays in USDC.
- [V-DOCS] viem supports the feeCurrency field on Celo when using the celo chain definition.
  Set feeCurrency to the token address (18-decimal tokens) or the adapter address (6-decimal).
  sourceRef: docs.celo.org fee-abstraction page.
- [V-DOCS] MiniPay constraint: fee abstraction limited to cUSD/USDm and legacy (non EIP-1559)
  transactions. Relevant only if a MiniPay mini-app is built. sourceRef: docs.celo.org MiniPay.

## 7. Mento (FX between Celo stables)

- [V-NPM] SDK npm @mento-protocol/mento-sdk, latest 3.2.8, official SDK for the Mento Protocol;
  swaps route through the Broker. sourceRef: https://registry.npmjs.org/@mento-protocol/mento-sdk
- [V-CHAIN] Mento Broker deployed on both networks. Mainnet 0x777A8255cA72412f0d706dc03C9D1987306B4CaD,
  Sepolia 0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba. sourceRef: cast code() + docs.mento.org deployments.
- [V-CHAIN] Stable token addresses, symbols, and decimals (all 18 decimals). The current Mento
  branding uses an m suffix; the historical c-prefixed names map to the same addresses:
    cUSD = USDm. Mainnet 0x765DE816845861e75A25fCA122bb6898B8B1282a, Sepolia 0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b.
    cEUR = EURm. Mainnet 0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73, Sepolia 0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a.
    cKES = KESm. Mainnet 0x456a3D042C0DbD3db53D5489e98dFb038553B0d0, Sepolia 0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF.
    cREAL = BRLm. Mainnet 0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787, Sepolia 0x2294298942fdc79417DE9E0D740A4957E0e7783a.
  sourceRef: cast symbol()/decimals() reads + docs.mento.org deployments addresses page +
  docs.celo.org token-contracts page.
- [OPEN] Live liquidity and minimum sizes for USDm<->KESm and USDm<->EURm. Get a real quote via
  the SDK on Day 2 and pick the deepest pair for the demo. If KESm is thin, use EURm or BRLm; if
  all FX is blocked, SVC-3 degrades to a Self-gated P2P USDm transfer (plan section 10).

## 8. Faucet and test tokens

- [V-DOCS] Celo Sepolia faucet https://faucet.celo.org dispenses CELO. Browser based. GitHub
  sign-in gives a 10x amount and 10 claims per day; unauthenticated allows about 4 claims per day.
  No public CLI API, so funding the agent address is a human-assisted step. sourceRef: faucet.celo.org.
- [S] Backup faucets: https://cloud.google.com/application/web3/faucet/celo/sepolia and
  https://faucets.chain.link/celo-sepolia (both browser and login based). sourceRef: search 2026-06-13.
- [V-DOCS] Test USDC is obtained from https://faucet.circle.com (Circle), not from faucet.celo.org.
  sourceRef: faucet.celo.org note.
- [OPEN] How to obtain test USDm (or another x402-settle token) on Sepolia for the client wallet
  that pays the x402 call. Options to test Day 1: Circle USDC faucet, or swap CELO to USDm via the
  Sepolia Broker. Resolve when building the first paid call.

## 9. Tooling, hosting, submission, competition

- [V-DOCS] Celo Agent Skills for the coding agent: npx openskills install celo-org/agent-skills -g
  (covers erc-8004, x402, fee-abstraction, mento, minipay, thirdweb). Nothing from those skills is
  citable until second-verified here. sourceRef: https://github.com/celo-org/agent-skills
- [V-NPM] npm names karibu-skill and create-karibu-skill are both available (registry returned 404).
  Default install path is npx github:Andy00L/Karibu- (subdir), no publish. npm publish is an
  externally visible action that needs drew's approval. sourceRef: registry.npmjs.org 404 for both.
- [S] Hosting: Render free tier sleeps after about 15 minutes idle (UptimeRobot ping keeps it warm);
  Vercel free tier hosts the Next.js dashboard. Confirm free-tier limits at signup. sourceRef: draft.
- [S] Telegram bot library grammY. sourceRef: draft, recorded in DECISIONS.md.
- [V-DOCS] Agent Visa program rewards agents proving real utility on-chain; applying post-build is
  a continuity signal for the README. sourceRef: celopg.eco Agent Visa announcement.
- [S] Competition snapshot (June 12): top Celo agents on 8004scan are Toppa (score 94.0, 581
  feedbacks) and Agentic Eye (93.8, 700 feedbacks). Karibu sells infra, not a consumer vertical.
  sourceRef: https://8004scan.io/leaderboard

## 10. Hackathon logistics

- [V-DOCS, from draft] Event May 22 to June 15, 2026, virtual, payments and everyday-applications
  themed, 5,000 USD pool paid in CELO. Tracks (stackable): Track 1 Best Agent 2,500 / 1,000 / 500;
  Track 2 Most Activity 500; Track 3 Highest 8004scan Rank 500. Submissions close June 15, 9:00 GMT
  (5:00 EDT). Winners June 17, 15:00 GMT. sourceRef: hackathon page (drew holds the link).
- [V-DOCS, from draft] Registration: quote-tweet the announcement tagging @CeloDevs and @Celo, with
  the project and the ERC-8004 registry link. A second tweet includes the 8004scan agentId.
  sourceRef: hackathon page.
- [OPEN] Submission mechanism (npx skills add https://celobuilders.xyz, then ask the coding agent to
  submit to celo-onchain-agents). Run the flow end to end on Day 2 to confirm; editions have changed
  mechanisms before. sourceRef: hackathon page.
- [V-DOCS, from draft] Judges: Lena Hierzi, Viral Sangani, Marek Olszewski (co-founder Celo and Self).
  Self verification of the agent is requested; regional failure accepts a Self app error screenshot.

## 11. Remaining OPEN items (resolve before the related code ships)

1. thirdweb facilitator fee on Celo and the actual settle token on Celo Sepolia. Read the facilitator
   response body on the first live paid call (plan section 6 gotcha policy).
2. FeeCurrencyDirectory confirmation of the USDC and USDT adapter addresses (only needed if a client
   pays gas in USDC). Karibu's own gas uses USDm directly.
3. Live Mento liquidity and minimum sizes for USDm<->KESm and USDm<->EURm (real SDK quote, Day 2).
4. How to fund a Sepolia client wallet with an x402-settle stable (Circle USDC faucet or Broker swap).
5. celobuilders submission flow dry-run (Day 2).
6. 8004scan indexing delay for a new Celo agent (register early).
7. Self Celo contract addresses re-verified on-chain before the first Self registration (Day 1).
8. Backup RPC endpoint in .env in case forno rate limits during judging.
