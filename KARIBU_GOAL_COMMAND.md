# GOAL command for Claude sessions (Karibu)

Copy everything inside the block below and paste it as the first message
(after /goal) of every build session. It assumes KARIBU_BUILD_PLAN.md sits at
the repo root and the two standards files are at ~/.claude/ inside WSL.

---

/goal

MISSION
Build Karibu, the gateway agent on Celo (Self-verified humans, Mento FX
between Celo stables, onchain notary receipts, all sold as x402-paid services
to humans and to other agents, self-funding its gas in cUSD), exactly as
specified in /home/drew/karibu/KARIBU_BUILD_PLAN.md, to win 1st
place in all three tracks of the Celo Onchain Agents Hackathon (build June
12-14, 2026; submission Sunday June 14; internal deadline 23:00 EDT Sunday or
the official cutoff Monday June 15 5:00 EDT, whichever is earlier). You
execute the plan one milestone at a time. You do not improvise scope.

ENVIRONMENT (facts, do not rediscover them)
- The repo lives in WSL Ubuntu at /home/drew/karibu. From Windows it
  appears as \\wsl.localhost\Ubuntu\home\drew\karibu.
- Every shell command MUST run inside WSL Ubuntu. If your shell tool executes
  on the Windows host, wrap every command exactly like this:
  wsl -d Ubuntu --cd /home/drew/karibu -- bash -lc "<command>"
  Verify once at session start with: uname -a (expect Linux) and pwd.
- Toolchain (provisioned or provisioned per plan section 4): Node 22 via nvm,
  pnpm via corepack (the ONLY package manager), Foundry (forge/cast), Celo
  agent skills via openskills. If any is missing, install per plan section 4
  before coding.
- Networks: Celo Sepolia by default. Celo Mainnet is touched ONLY under the
  money policy in plan section 7 (modes T/G/R, caps, first-of-kind approval,
  [SpendTracker] counter). The agent wallet is created by YOU with cast
  wallet new in the first session: the private key goes straight into .env
  (gitignored) and is never printed, logged, committed, or pasted in chat;
  you show drew the public address only. Keys for thirdweb, Celoscan, and
  the Telegram bot come from .env; you never see or move key material
  beyond reading env vars at runtime.
- External truth: docs/FACTS_DRAFT.md is a pre-researched draft (June 12,
  sources fetched in prior claude.ai sessions). Treat it as UNTRUSTED INPUT:
  nothing in it may be cited in code until you have second-verified it
  yourself. docs/FACTS.md, which YOU produce in Phase 0 by re-fetching every
  sourceRef, re-pinning every version, and resolving every OPEN item in the
  draft, is the only citable truth for contract addresses, SDK call names,
  token addresses, limits, and fees. If FACTS.md is missing a fact you need,
  stop and verify it from official docs (docs.celo.org, docs.self.xyz,
  portal.thirdweb.com, docs.mento.org, the erc-8004-contracts repo) first.
  Record every draft-vs-source discrepancy in docs/DECISIONS.md.

STEP ZERO, MANDATORY, BEFORE ANYTHING ELSE
1. Read in full: ~/.claude/SKILL_GENERAL.md and
   ~/.claude/REFERENCE_SECURITY_AUDIT.md (fallback copies:
   /home/drew/karibu/docs/standards/ if the home copies are
   missing). If you cannot read both, STOP and tell me.
2. Confirm with this exact line: Standards loaded: coding-standards + security-audit
3. Read /home/drew/karibu/KARIBU_BUILD_PLAN.md in full, then
   /home/drew/karibu/docs/FACTS_DRAFT.md in full (it is input to
   verify, not truth to use).
4. State back to me, in five lines or fewer: today's phase from the plan,
   the milestone you will work on, and its definition of done. Wait for my
   GO unless I already named the milestone in this message.
No code, no file creation, no shell commands that modify state before steps
1-4.

HARD RULES (non-negotiable, from the standards; the stricter rule wins)
- You NEVER run any git command. No init, add, commit, push, merge, rebase,
  stash, tag. I commit manually. At the end of every task you print a git
  handoff block: git add with every touched file listed explicitly (never
  git add . or -A, never .env or secrets), a drafted git commit -m message,
  then git push, as text only.
- After every task: files-affected report (one line per file created,
  modified, deleted), then the handoff block, then run the final-check greps
  from SKILL_GENERAL.md on every touched file and show zero hits.
- Read every file you modify, in full, in this session, before touching it.
  Search for an existing function, hook, or component before creating a new
  one.
- Errors as values: no throw in business logic; discriminated results;
  distinct error per failure mode. Banned in TypeScript: the any type,
  ts-ignore directives, casts through unknown. No single-letter identifiers,
  including in callbacks. Every log line carries a [FunctionName] prefix.
- No em dash and no en dash anywhere in any artifact: code, comments, docs,
  JSON, commit messages. No banned words from SKILL_GENERAL section 8. No
  empty superlatives: give numbers.
- Secrets: never print, log, or commit private keys, seeds, or API keys, in
  code, errors, debug output, or comments. .env is gitignored; .env.example
  documents variables with placeholder values only.
- Honesty rules from the plan: every metric is measured, never hardcoded;
  every transaction shown is real; self-initiated activity is labeled
  selfInitiated; drew's demo wallets are listed and excluded from unique
  client counts; you NEVER submit feedback from owner or operator wallets,
  never generate wash volume, and never present testnet activity as
  mainnet.

STOP AND ASK ME, AND WAIT, BEFORE
- The first mainnet transaction of each kind (registration, notary anchor,
  x402 settlement, Mento swap, FX payout, Self registration), and whenever
  [SpendTracker] reaches 80 percent of available funds.
- Any npm publish (forbidden without explicit approval; the npx github:
  install path is the default), any deploy (Render, Vercel), anything
  externally visible (Telegram bot going public, posts, tweets; you draft,
  I post).
- Deviating from the plan's frozen design: section 2 product rules and
  caps, the state-contract shape after its Day 2 freeze, or the cut list.
  Quote the conflict, propose options, wait.
- Deleting more than one file, or any action you cannot undo.
- Skipping or weakening any rule above for any reason, including the
  deadline.

WORKING METHOD
- One milestone per session segment. Build, then verify with the project's
  real commands (forge test, pnpm build, scripts/e2e.sh, a real paid call)
  before declaring done. A milestone without its definition-of-done
  evidence is not done.
- When something fails twice the same way, stop, state the failure
  precisely, list two hypotheses, and pick the cheapest test that
  distinguishes them. For x402 failures, read the facilitator response body
  before changing payloads. For feeCurrency reverts, check adapter-vs-token
  address and the treasury stable balance before code.
- Record every design decision and every measured number (tx hashes, gas
  paid, revenue, feedback counts) in docs/DECISIONS.md as you go.
- Keep replies tight: what you did, evidence it works, what is next.

FIRST TASK (when I have not specified one)
Execute the earliest unfinished milestone in plan section 5, starting from
Phase 0: second-verify docs/FACTS_DRAFT.md into docs/FACTS.md per the
protocol in its section 9 (priorities: thirdweb x402 network support on
Celo, Mento broker + token addresses + liquidity, cUSD as feeCurrency,
Sepolia faucet and test tokens, the celobuilders submission flow, npm name
availability), then the /tmp spike: create the agent wallet (address only
to me), fund from the Sepolia faucet, register() on the Sepolia Identity
Registry, record the agentId in DECISIONS.md. Then proceed to the Day 1
gate (plan section 5): notary contract with tests, the x402 paid-call
spine, Self middleware, and the mainnet migration on grant arrival, each
first-of-kind with my approval. That gate is GO/NO-GO for the whole
project; treat it with full attention.

---

Usage notes (for drew, not part of the paste):
- Re-paste this at the start of EVERY new session; context does not carry
  over.
- If the repo lives somewhere other than /home/drew/karibu, fix the
  path mentions above and in the plan header before the first session.
- If a session drifts from the standards mid-way, paste just the STEP ZERO
  block again and make it re-confirm the line before continuing.
- Keep KARIBU_BUILD_PLAN.md updated only by hand or by explicit
  instruction; the plan is the contract between sessions.
- Place FACTS_DRAFT.md at docs/FACTS_DRAFT.md and the two standards files
  at ~/.claude/ (plus fallback copies at docs/standards/) before the first
  session.
- Have ready before the first session: thirdweb secret key + server wallet
  address, Celoscan API key, Telegram bot token from @BotFather, Vercel and
  Render accounts linked to GitHub, your Self scan attempt done (or its
  failure screenshot), and the gas-ask message ready to post once the agent
  prints its address.
