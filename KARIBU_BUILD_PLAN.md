# Karibu: Build Plan

Karibu is the gateway agent on Celo: it proves a human stands behind a wallet
(Self), quotes and executes FX between Celo stables (Mento, cUSD<->cKES/cEUR),
anchors verifiable receipts onchain, and sells all of it as paid services over
x402 that BOTH humans (Telegram/MiniPay) and other agents (A2A + an installable
skill) consume. It bootstraps with a community gas grant, then pays its own gas
in cUSD from revenue. During this hackathon, the other competing teams are its
first customers: every third-party call is a real Celo transaction and a real
ERC-8004 feedback from an independent wallet.

Target: 1st place in all three tracks of the Celo Onchain Agents Hackathon
(Track 1 Best Agent 2,500 USD; Track 2 Most Activity 500 USD; Track 3 Highest
8004scan Rank 500 USD; stackable, 3,500 USD total).
Window: BUILD June 12 (evening) - June 14, 2026. SUBMIT Sunday June 14.
Internal deadline: feature freeze Sunday 16:00 EDT, demo video done by 19:00,
submitted plus registration tweet confirmed by 23:00 EDT Sunday. Absolute
cutoff Monday June 15, 5:00 EDT (9:00 GMT); the earlier time wins. Exact
submission mechanics are verified in Phase 0 and recorded in docs/FACTS.md.

Repo location (WSL): /home/drew/karibu
Windows path: \\wsl.localhost\Ubuntu\home\drew\karibu
Remote: https://github.com/Andy00L/Karibu-.git (rename to karibu when
convenient; old URL redirects). All commands run inside WSL Ubuntu, never in
PowerShell or cmd.

Governing standards: ~/.claude/SKILL_GENERAL.md and
~/.claude/REFERENCE_SECURITY_AUDIT.md apply to every file in this repo. The
agent never runs git. Networks: Celo Sepolia by default; Celo Mainnet only
under the money policy in section 7, never outside it.

---

## 1. Why this wins (the bar to hit)

1. Judge-criteria coverage in one product. Track 1 is judged on mission
   alignment, consistent onchain transactions, and real-world utility. Karibu
   is stablecoin payments + FX + proof-of-personhood + MiniPay-adjacent UX,
   which is the literal mission statement, and its transaction stream is
   continuous by design.
2. Third-party volume, not self-dealing. Track 2 and Track 3 reward activity
   and reputation, and the judges manually filter sybil patterns. Karibu's
   volume comes from independent wallets: other teams' agents paying its x402
   endpoints, and real humans using the Telegram bot. The ERC-8004 contract
   blocks owner/operator self-feedback anyway; every feedback Karibu earns is
   from a third party by construction.
3. Deep, non-decorative use of the sponsor stack. Self gates real money flows
   (Marek co-founded Self). Mento moves real local stables (cKES/cEUR). x402
   is the actual revenue engine. Fee abstraction pays real gas in cUSD. Each
   integration changes behavior; none is a logo.
4. The meta-play: infra for the other 68 teams. An installable skill (one npx
   command) plus a public A2A/x402 endpoint makes the competition itself the
   user base. Every adopting team strengthens Karibu's Track 2 and Track 3
   evidence with wallets the judges can independently verify.
5. The demo has a chain of proof moments: a human scans Self and a gated FX
   payout unlocks; another agent pays the endpoint and the dashboard counter
   ticks; the treasury card shows revenue in cUSD paying gas in cUSD; the
   8004scan card shows third-party feedback arriving. Every number on screen
   is measured and every claim has a transaction hash.

What it is NOT: not a wallet, not a custodial service, not a token, not a
copy of Toppa's consumer airtime vertical. No wash volume, no self-feedback,
no scripted "customers" pretending to be strangers. Self-initiated scheduled
activity (the hourly FX-rate attestation) is real work, clearly labeled as
self-initiated in the dashboard and in docs/MOCKS.md. Honest scope statements
are part of the pitch.

---

## 2. Product and protocol design (frozen before any code)

### 2.1 Services (the product surface)
- SVC-1 verify: GET /api/verify/:wallet. Returns whether a verified human
  backs the wallet/agent (Self registries). Price: 0.01 USD-equivalent via
  x402. The cheap, high-frequency call other agents integrate first.
- SVC-2 fx-quote: POST /api/fx/quote { from, to, amount }. Mento quote
  between cUSD, cKES, cEUR (pairs confirmed by FACTS.md liquidity check).
  Price: 0.01 via x402.
- SVC-3 fx-swap: POST /api/fx/swap. Executes the quoted swap from Karibu's
  treasury and pays out to the caller's address. Self-gated: payouts above
  the anonymous cap (section 2.3) require the caller to be Self-verified.
  Price: 0.05 via x402 plus the swap amount itself prepaid by the caller.
- SVC-4 notary: POST /api/notary { sha256 }. Anchors the hash in
  KaribuNotary on Celo, returns the tx hash and a /verify-receipt/:hash
  permalink. Price: 0.02 via x402. Also the engine of the hourly
  self-initiated FX-rate attestation (labeled, section 9).
- SVC-5 human channel: Telegram bot (grammY) exposing SVC-1/2/4 and small
  FX swaps conversationally for real humans. MiniPay-friendly flows (legacy
  tx, cUSD) if time allows; cut first per section 10.
- SVC-6 the skill: packages/karibu-skill, installable by any team with one
  npx command, teaching their agent to discover and pay Karibu's endpoints
  (wrapFetchWithPayment snippet + endpoint manifest at /api/skills).

### 2.2 Identity and trust plumbing
- Karibu registers on the ERC-8004 Identity Registry (Sepolia first, then
  mainnet under the money policy) with a registration JSON listing web, A2A
  card (/.well-known/agent-card.json), and the x402 API base; plus
  /.well-known/agent-registration.json for the verified-endpoint badge.
- Karibu registers a Self Agent ID (agent-identity mode) tied to drew's
  passport verification; the dashboard shows the Human-backed badge. If
  Self fails in Canada, the documented screenshot fallback applies and the
  badge states the fallback honestly.
- After each paid job, the response invites the client to giveFeedback on
  the Reputation Registry (their wallet, their choice, standard tags). No
  incentives are paid for feedback; solicitation text is neutral.

### 2.3 Money rules inside the product
- Anonymous callers: per-call FX payout cap 0.25 cUSD-equivalent, per-wallet
  daily cap 1.00. Self-verified callers: per-call cap 5.00, daily 20.00,
  within treasury balance. Constants live in one config file with unit and
  source comments.
- The treasury is the agent wallet. Revenue (x402 settlements) accrues in
  stables; ALL agent gas is paid with feeCurrency in cUSD (or the USDC
  adapter, per FACTS.md). The dashboard treasury card shows earned, gas
  paid, and net, measured from chain reads, never hardcoded.
- Replay protection: notary and swap requests carry a client nonce; the
  server rejects duplicates within a 24h window (persisted).

### 2.4 State contract (public interface, frozen Day 2 morning)
Package packages/state-contract, validated with zod at every boundary.
Frozen means fields may be added, never renamed or removed, for the rest of
the weekend. Drew skins the dashboard against MOCK_STREAM=1 from the moment
this freezes.

    export type KaribuNetwork = "celo" | "celo-sepolia";
    export type ServiceName = "verify" | "fx-quote" | "fx-swap" | "notary";

    export interface KaribuSnapshot {
      schemaVersion: 1;
      network: KaribuNetwork;
      agentId: string;
      selfVerified: boolean;
      txCountTotal: number;
      txCount24h: number;
      uniqueClientWallets: number;
      revenueCusd: number;
      gasPaidCusd: number;
      feedbackCount: number;
      scanScore: number | null;
      updatedAtMs: number;
    }

    export type KaribuEvent =
      | { type: "service_paid"; service: ServiceName; clientWallet: string; amountUsd: number; txHash: string; selfInitiated: boolean }
      | { type: "notary_anchored"; sha256: string; txHash: string; selfInitiated: boolean }
      | { type: "fx_swapped"; fromSymbol: string; toSymbol: string; amountFrom: number; txHash: string }
      | { type: "human_verified"; walletShort: string }
      | { type: "feedback_received"; clientWallet: string; score: number }
      | { type: "tick"; snapshot: KaribuSnapshot };

Every event with selfInitiated true renders with a distinct label in the
dashboard feed. The caps in 2.3 are named constants with sourceRef comments.

### 2.5 Dashboard (the judge's screen)
Next.js app, dark fintech style, four cards above a live event feed (SSE):
Activity (txCountTotal, txCount24h, uniqueClientWallets), Treasury (earned,
gas paid, net, all cUSD), Trust (Self badge, ERC-8004 agentId link,
feedbackCount, scanScore), Services (per-service call counts + prices). A
/verify-receipt/:hash page renders any notary receipt with its Celoscan
link. Every number is measured; the feed links every event to its tx.

---

## 3. Architecture and repo layout

    Other agents (68 teams)         Humans                       Celo
    -----------------------         -------------------          -------------------------
    npx karibu skill                Telegram bot (grammY)        ERC-8004 Identity +
    wrapFetchWithPayment   ----->   small FX, notary    ----->   Reputation registries
            |                               |                    Self registries + gate
            v                               v                    Mento broker (FX)
    +------------------------- apps/agent (Fastify TS) --------+ KaribuNotary (anchors)
    | x402 settlePayment gate -> service handlers -> viem txs  | all agent gas paid in
    | Self verifier middleware on gated routes                 | cUSD via feeCurrency
    | treasury/SpendTracker + metrics + SSE stream             |
    +-----------------------------------------------------------+
            |
            v
    apps/web (Next.js dashboard + /verify-receipt)

Repo layout (SKILL_GENERAL folder hygiene: one concern per folder):

    karibu/
      CLAUDE.md                  repo-level standards pointer
      KARIBU_BUILD_PLAN.md       this file
      KARIBU_GOAL_COMMAND.md     the per-session goal paste
      docs/
        BRIEF.md                 one page: what, why, success criteria
        FACTS_DRAFT.md           pre-researched facts (June 12), UNTRUSTED input
        FACTS.md                 every SECOND-VERIFIED external fact + sourceRef
        DECISIONS.md             every design decision with date and reason
        MOCKS.md                 the honest-activity ledger (section 9)
        DEMO_SCRIPT.md           the timed demo script (section 8)
        standards/               fallback copies of the two standards files
      contracts/
        KaribuNotary.sol         anchor(bytes32) + Anchored event, Foundry tests
      packages/
        state-contract/          shared TS types + zod schemas (frozen Day 2)
        karibu-skill/            the installable skill (manifest + client snippet)
      apps/
        agent/                   Fastify server: x402, Self gate, Mento, notary,
                                 Telegram bot, treasury, metrics, SSE
        web/                     Next.js dashboard (drew owns final polish)
      scripts/
        deploy-sepolia.sh        deploy notary, register agent, write addresses
        e2e.sh                   full loop from the CLI, no browser
      README.md
      .env.example               documented variables, never real secrets
      .gitignore                 .env, out/, node_modules/, cache/, keys

---

## 4. Toolchain and environment setup (WSL Ubuntu)

Run every block inside WSL. If a command is issued from Claude Desktop and
the shell lands on Windows, wrap it:

    wsl -d Ubuntu --cd /home/drew/karibu -- bash -lc "<command>"

### 4.1 Base packages

    sudo apt update && sudo apt install -y build-essential curl git jq unzip

### 4.2 Node + pnpm + Foundry

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    source ~/.bashrc && nvm install 22 && nvm alias default 22
    corepack enable                       # pnpm is the ONLY package manager here
    curl -L https://foundry.paradigm.xyz | bash && source ~/.bashrc && foundryup

### 4.3 Celo skills for the coding agent (pre-verified June 12; re-pin Day 0)

    npx openskills install celo-org/agent-skills -g
    # Covers erc-8004, x402, fee-abstraction, mento, minipay, thirdweb usage.
    # Nothing from these skills or from FACTS_DRAFT.md may be cited in code
    # until second-verified into docs/FACTS.md.

### 4.4 Key npm packages (pin exact versions in Phase 0)

    viem (celo chain + feeCurrency), thirdweb (x402 settlePayment/facilitator,
    wrapFetchWithPayment), @selfxyz/agent-sdk, @mento-protocol/mento-sdk,
    fastify, grammy, zod, next, tailwindcss. ERC-8004: @chaoschain/sdk if it
    fits, else direct viem calls with the ABI from erc-8004-contracts.

### 4.5 Wallets and funding
- The agent wallet is CREATED BY THE BUILD AGENT (cast wallet new) in the
  first session: private key written straight into .env (gitignored), never
  printed, never logged, never committed; only the public address is shown
  to drew. Drew posts the address in the hackathon Telegram for the gas
  grant.
- Drew's own test wallet (MiniPay/MetaMask) plays the human customer in
  demos and is labeled as drew's in MOCKS.md.
- thirdweb server wallet: created by drew in the thirdweb dashboard; address
  goes in .env.

---

## 5. Phase plan, day by day

Phase 0 runs tonight (Friday June 12), before serious code, and is limited
to reading, environment checks, verification, and throwaway spikes in /tmp.

### Phase 0: Friday June 12 evening (verification + spike)
Input: docs/FACTS_DRAFT.md (UNTRUSTED). Output: docs/FACTS.md.
- Standards loaded and confirmed; toolchain versions print (node, pnpm,
  forge).
- Second verification per FACTS_DRAFT section 9: re-fetch every [V],
  re-pin every [S], resolve every [OPEN]. Priority OPENs: thirdweb x402
  network support on Celo (mainnet vs Sepolia), Mento broker + token
  addresses + cKES/cEUR liquidity, cUSD-as-feeCurrency, Sepolia faucet and
  test tokens, celobuilders submission flow, npm name availability.
- Spike (throwaway, /tmp): create the agent wallet (key into .env, address
  only to drew), get Sepolia faucet funds, call register() on the Sepolia
  Identity Registry with a minimal data-URI registration JSON, read back
  the agentId. Done when the Sepolia agentId exists and is recorded in
  DECISIONS.md.
- Drew in parallel: Self passport scan attempt (screenshot on failure),
  Telegram gas ask with the printed address, accounts from the prep list.

### Day 1 (Saturday June 13): THE de-risk milestone, the spine. GO/NO-GO GATE
Goal: the thinnest revenue-generating slice, in this order.
1. Scaffold the repo per section 3; .env.example written; CLAUDE.md in
   place; pnpm workspace builds.
2. KaribuNotary.sol with Foundry tests (target 15+ meaningful tests);
   deploy Sepolia; verified on the explorer if supported.
3. apps/agent skeleton: health route, metrics, SSE stream, SpendTracker.
4. The x402 leg per FACTS.md: SVC-1 verify and SVC-4 notary behind
   settlePayment. One end-to-end paid call with wrapFetchWithPayment from a
   second test wallet, on whichever network FACTS.md confirmed.
5. Self verifier middleware mounted on the gated route group; agent-identity
   registration on the network FACTS.md supports (mainnet allowed for Self
   registration only if the grant has landed; else stub behind an interface
   and record it).
6. Mainnet migration the moment the gas grant lands (each first-of-kind tx
   per section 7): mainnet ERC-8004 register(), first real x402 settlement,
   first notary anchor with feeCurrency cUSD, first tiny Mento quote+swap.
Definition of done: transaction hashes for (a) Sepolia and, grant
permitting, mainnet registration, (b) one third-party-paid x402 call, (c)
one notary anchor with gas paid in cUSD, recorded in docs/DECISIONS.md.
THIS IS THE GO/NO-GO GATE. If x402 settlement on Celo is blocked after the
full day, stop, report honestly, and decide with drew: fallback payment
check (direct ERC-20 transfer verified onchain before serving, declared in
MOCKS.md) or scope cut per section 10. Do not start the surface layer while
this gate is red.

### Day 2 (Sunday June 14, morning to 16:00): the surface and the meta-play
- First task: finalize and freeze packages/state-contract plus
  MOCK_STREAM=1; tell drew the dashboard contract is ready. Dashboard
  skinning proceeds in parallel.
- SVC-2 fx-quote and SVC-3 fx-swap on the pair FACTS.md confirmed, with the
  caps from 2.3 and Self gating live.
- packages/karibu-skill finished; install tested from a clean /tmp dir via
  the no-publish path (npx github:...); npm publish only with drew's
  explicit approval.
- Telegram bot minimal (SVC-1/2/4 conversational).
- Hourly self-initiated FX-rate attestation cron, labeled selfInitiated.
- Adoption push: drew posts the skill + endpoint in the hackathon Telegram
  (drafted by the agent, posted by drew). Neutral feedback invitation in
  every paid response.
- scripts/e2e.sh: fresh env, deploy notary (Sepolia), register, one paid
  verify call, one paid notary call, one fx quote, assert the snapshot
  counters moved. Exits 0 twice in a row.
- Registration quote-tweet drafted (agent) and posted (drew) with the
  mainnet ERC-8004 link, once mainnet registration exists.

### Day 3 (Sunday June 14, 16:00 to 23:00): hardening, polish, submit
- The audit triggers in REFERENCE_SECURITY_AUDIT.md fire now (submission
  freeze approaching, code touches payments): run the relevant phases
  against contracts/, apps/, packages/; fix list; re-run forge test and
  e2e.sh.
- Error states, reconnect handling, input validation hardening, rate
  limits.
- 16:00 feature freeze. README final: 30-second pitch, architecture
  diagram, proof links block at the top (agentId on 8004scan, Celoscan
  addresses, dashboard URL, video), why each sponsor integration is
  load-bearing, one-command repro (e2e.sh), What is real vs self-initiated
  copied from docs/MOCKS.md, Agent Visa application noted.
- Record the demo video per section 8. Two takes maximum, pick one. Done by
  19:00.
- Fresh-clone test following only the README. Submit through the verified
  celobuilders mechanism; second tweet with the 8004scan agentId; both
  confirmed with screenshots by 23:00. Monday morning stays a buffer only.

---

## 6. The spine pipeline (shape of the loop; exact names from FACTS.md)

    # contracts
    forge build && forge test
    forge create contracts/KaribuNotary.sol:KaribuNotary --rpc-url $RPC ...

    # registration (Sepolia first; addresses from FACTS.md only)
    #   register(agentURI) on the Identity Registry -> read agentId
    #   serve /.well-known/agent-registration.json + agent-card.json

    # one paid call, end to end (the revenue heartbeat)
    #   client: wrapFetchWithPayment(fetch) -> GET /api/verify/:wallet
    #   server: settlePayment(...) status 200 -> handler -> response
    #   verify: settlement visible onchain; SSE event service_paid emitted

    # one anchored receipt with gas in cUSD
    #   writeContract KaribuNotary.anchor(hash) with feeCurrency per FACTS.md
    #   verify: tx hash on Celoscan shows the fee currency

Known gotcha policy: if an x402 settlement fails, read the facilitator
response body and the settlement tx simulation BEFORE changing payloads. If
a feeCurrency tx reverts, check the adapter-vs-token address and the
treasury's stable balance FIRST, before touching code. Note both in comments
where the calls are made.

---

## 7. Money policy (hard rules)

Zero-capital constraint: drew provides no fiat and no personal crypto. The
ladder:
- MODE T, testnet-first (THE DEFAULT until the grant lands): everything on
  Celo Sepolia with faucet funds. Zero real money. All spine work possible
  except mainnet-only pieces identified in FACTS.md.
- MODE G, grant-funded mainnet: the Telegram community grant (target 1-5
  CELO or about 1 cUSD) funds mainnet registration and first transactions.
- MODE R, revenue-funded: x402 earnings in stables pay all further gas via
  feeCurrency. The agent is self-funding from its first customers.

Caps and rules (MODE G and R):
- Mainnet spend ceiling: grant received plus revenue earned, never more.
  Per-transaction value cap 0.25 cUSD until the first revenue lands, then
  the caps in section 2.3 govern payouts.
- The first transaction of each kind on mainnet (registration, notary
  anchor, x402 settlement, Mento swap, FX payout, Self registration)
  requires drew's explicit approval before sending. Approved kinds may
  repeat within the caps.
- A visible [SpendTracker] log line tracks cumulative mainnet spend and
  revenue (no secrets). Stop and report at 80 percent of available funds.
- Only the agent wallet holds funds. No path may strand value: e2e and
  tests on mainnet always return funds to the treasury or flag loudly at
  exit. The agent NEVER nags drew to fund anything; modes are drew's call.

---

## 8. Demo video script (120 seconds)

    0:00-0:10  Hook on the live dashboard. "This is Karibu, and those ticks
               are other teams in this hackathon paying it right now."
               Counter visibly increments.
    0:10-0:35  Mission frame. Celo is stablecoin payments for real people;
               agents need two missing pieces: proof a human is behind a
               wallet, and FX between local stables. Karibu sells both.
    0:35-1:10  Live product. Drew's phone: Self scan -> the Human-backed
               badge flips -> a gated cUSD->cKES payout executes via the
               Telegram bot. Then a terminal: another agent installs the
               skill with one npx command and pays /api/verify; the
               settlement and the SSE event appear.
    1:10-1:40  Onchain proof. Celoscan: the swap tx and a notary anchor
               with the fee paid in cUSD. 8004scan: the agentId, the score,
               third-party feedback. forge test: all green.
    1:40-2:00  The loop. Treasury card: earned X cUSD, paid Y gas, net
               positive; agent self-funding since its first customer.
               "Registered, verified, earning. Karibu stays after the
               hackathon: Agent Visa application filed." End on the feed.

---

## 9. Honest-activity ledger (docs/MOCKS.md, mirrored in README)

1. Every transaction shown anywhere is real onchain activity; every metric
   is measured from chain reads and server counters, never hardcoded.
2. Self-initiated activity (the hourly FX-rate attestation and treasury
   ops) is labeled selfInitiated in the event stream and counted separately
   from client-paid calls in the Activity card.
3. Drew's own wallets used in demos are listed by address and labeled; they
   are excluded from the uniqueClientWallets count.
4. No feedback is ever submitted by the owner or operator (the contract
   blocks it; we do not try). No incentives are paid for feedback;
   solicitation text is the neutral line quoted in MOCKS.md.
5. If the direct-transfer fallback replaced x402 on any endpoint, it is
   declared here by endpoint name.
6. If MODE T is still active at submission (no grant arrived), the README
   states plainly which activity is Sepolia and which is mainnet, with
   separate counters. Testnet volume is never presented as mainnet volume.

---

## 10. Risk register and fallbacks

1. Day 1 gate fails on x402 (facilitator does not settle on Celo or on the
   available network): fallback is the direct ERC-20 transfer-then-serve
   payment check (verify the transfer onchain before serving), declared in
   MOCKS.md. Decision with drew, end of Day 1, never unilaterally.
2. Gas grant never arrives: stay MODE T, ship the full product on Sepolia
   with honest labeling, and escalate once to drew with options (wait,
   submit testnet-honest, or drew finds 1-2 USD externally). Never pressure.
3. Mento cKES liquidity thin or addresses unverifiable: swap pair degrades
   to cEUR or cREAL; if all FX is blocked, SVC-3 becomes a Self-gated P2P
   cUSD transfer service and the narrative holds.
4. Self fails on the Canadian passport: screenshot fallback per the
   hackathon FAQ; wallet-free mode for the agent; the badge and README say
   so honestly.
5. No third-party adoption by Sunday noon: pivot the volume story to real
   human usage (Telegram bot) plus clearly-labeled drew-operated client
   agents with their own wallets (declared in MOCKS.md); the skill remains
   the public good even with few installs.
6. Render free tier sleeps: UptimeRobot ping; if unstable, the agent runs
   on drew's machine for the judging window with the dashboard on Vercel.
7. Time collapse cut order: Telegram bot first, then Mento swap (keep
   quotes), then the Sepolia multi-chain presence, then dashboard polish.
   NEVER cut: mainnet ERC-8004 registration (if the grant landed), one real
   x402-paid service with a third-party settlement, the notary with
   feeCurrency cUSD, the measured dashboard, e2e.sh, README + video +
   submission + registration tweet.

---

## 11. Submission checklist (Sunday June 14, 23:00 EDT target)

    [ ] Public GitHub repo, README per Day 3 spec, MIT license file
    [ ] e2e.sh passes from a fresh clone following only the README
    [ ] Mainnet (or honestly-labeled Sepolia) agentId + contract addresses +
        explorer links listed; dashboard URL live
    [ ] 120-second video uploaded and linked
    [ ] docs/MOCKS.md honest and current; FACTS.md and DECISIONS.md current
    [ ] Money policy respected: [SpendTracker] total within funds, treasury
        reconciles, no value stranded
    [ ] Final-check greps from SKILL_GENERAL.md pass on every file
    [ ] Registration quote-tweet posted with the ERC-8004 link; second tweet
        with the 8004scan agentId; screenshots saved
    [ ] Submission sent through the verified celobuilders mechanism before
        the verified cutoff; confirmation screenshot saved
