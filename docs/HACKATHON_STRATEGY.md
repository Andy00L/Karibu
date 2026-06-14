# Hackathon strategy and scoring (researched 2026-06-14)

What wins the Celo Onchain Agents Hackathon, how the three tracks are scored, and
the ranked priorities for Karibu (agentId 9373 on Celo mainnet). Researched from
the official page, the live 8004scan scoring API, and Celo mainnet RPC. Where a
detail is unpublished, it says so.

## Deadline and submission

- Submissions close 2026-06-15, 09:00 GMT (hard). Winners announced 2026-06-17.
- Submit via the Celo Builders skill, not a web form: `npx skills add https://celobuilders.xyz`,
  then ask your coding agent to submit, choose `celo-onchain-agents`, answer, publish.
- Registration tweet: quote-tweet the announcement, tag @CeloDevs and @Celo, say
  what you build, include the ERC-8004 link, hashtag #CeloAgents. Self Agent ID is
  beneficial but not required. Join the Telegram for updates (the page FAQ bodies
  and the exact Track 2 metric are unpublished; confirm there).

## The three tracks

- Track 1 Best Agent (2,500 USD). Hybrid human + AI review (judges: Lena Hierzi,
  Viral Sangani, Marek Olszewski), "trained review agents across 18 data points"
  (the rubric is not published). The page rewards agents that "generate real
  transactions and demonstrate genuine utility on-chain" with "real economic
  agency and global distribution." This is Karibu's realistic first-place target.
- Track 2 Most Activity (500 USD, stackable). On-chain transaction count; exact
  contract, window, and anti-gaming rules are unpublished. Win it with a high
  number of real service transactions, not empty self-transfers.
- Track 3 Highest 8004scan rank (500 USD, stackable). Fully scored by 8004scan's
  `v5_leaderboard_policy`, filtered to Celo (42220). Formula below.

## 8004scan score = weighted sum of five dimensions

- Engagement 30%: feedback satisfaction (avg score, the real lever) + feedback
  count (saturates against a global max) + community (stars, views).
- Service 25%: A2A + MCP endpoint quality and health. No live endpoint scores ~0
  here, which alone caps the total near the bottom.
- Publisher 20%: wallet credibility and age + validation bonus + optional
  certification. Slow to move.
- Compliance 15%: ERC-8004 metadata correctness + endpoint verification bonus
  (+10). Verify by serving /.well-known/agent-registration.json matching the
  on-chain registration, then POST /api/v1/agents/verify-endpoint/42220/9373.
- Momentum 10%: freshness (new-agent boost, decays over days) + recent activity.

Indexing is fast (minutes); the scoring cycle is separate (hours). Do not leave
the endpoint fix to the final hour.

ERC-8004 ReputationRegistry (Celo 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63):
any address that is not the agent owner or an approved operator may call
giveFeedback(agentId, value, valueDecimals, tags...). Self-feedback is blocked
on-chain. Honest feedback comes from real third-party callers after a genuine
paid interaction; feedback spam does not win (an agent with 1,401 feedbacks
scores 36 because its Service and Compliance are weak).

## Competition snapshot (live 2026-06-14, 86 Celo agents)

Toppa 93.97 (581 feedbacks, x402, MCP+A2A) is the bar. Pay For API Agent 91.73
(x402 API gateway) is the closest analog. CeloFX 70.63 and Earnbase 68.49 already
overlap two of Karibu's services and are live. Karibu scores 0 today only because
its endpoint is down. The differentiator Karibu can own: one gateway bundling
three distinct paid services plus self-funded cUSD gas; no top agent does that.

## Ranked priorities (about one day of work)

1. Deploy the endpoint and keep it up (decisive for Track 1, unlocks Service +
   Compliance, ~40% of the Track 3 score). render.yaml and Dockerfile are ready.
2. Serve /.well-known/agent-card.json + agent-registration.json (the agent does,
   once hosted) and verify the endpoint for the +10 Compliance bonus.
3. One real x402-paid call per service in cUSD with on-chain settlement (Track 1
   utility, Track 2 volume, seeds honest feedback).
4. Genuine feedback from real third-party callers (Engagement, the slow lever).
5. Publish the public GitHub repo and post the registration tweet.
6. Submit via the Celo Builders skill before 2026-06-15 09:00 GMT.

## Honest first-place read

Track 1 is reachable as a first-place contender, but only with the endpoint live,
the repo public, and one paid flow visibly working. Track 3 mid-rank is reachable
fast; top rank in a day is unlikely given the feedback gap to the leaders. Track 2
depends on an unpublished metric. The build quality is not the constraint; the
live endpoint, the public repo, and real third-party usage are.

Source pointers: https://8004scan.io/agents/celo/9373, https://api.8004scan.io/openapi.json,
https://celobuilders.xyz, https://docs.celo.org/build-on-celo/build-with-ai/8004
and /x402, https://www.celopg.eco/insights/and-the-winners-are-in-real-world-agent-hackathon-v2.
