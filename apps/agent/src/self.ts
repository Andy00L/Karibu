import { z } from "zod";
import type { KaribuNetwork } from "@karibu/state-contract";

export const verifyParamsSchema = z.object({
  wallet: z.string(),
});

export type HumanBackedResult = {
  wallet: string;
  humanBacked: boolean;
  source: string;
  network: KaribuNetwork;
  note: string;
};

export type SelfVerifier = {
  isHumanBacked: (wallet: string) => Promise<HumanBackedResult>;
};

// The on-chain Self human-proof query is not yet wired on any network, so the
// verifier is an honest interface stub: it always reports the caller unverified
// (humanBacked false), and the payout policy treats every caller at the anonymous
// cap. Wiring the real query (a Self human-attestation registry on Celo mainnet,
// address to be second-verified on-chain before use) only flips results to true
// for genuinely verified callers; it changes no other behavior. sourceRef:
// KARIBU_BUILD_PLAN.md Day 1 item 5, docs/FACTS.md section 4, audit 2026-06-14.
export function createSelfVerifier(network: KaribuNetwork): SelfVerifier {
  return {
    async isHumanBacked(wallet: string): Promise<HumanBackedResult> {
      return {
        wallet,
        humanBacked: false,
        source: "self-agent-id",
        network,
        note: "Self human-proof lookup is not yet wired to an on-chain registry, so every caller is reported unverified (humanBacked false) and treated at the anonymous payout cap. The Self-gating interface and payout policy are live; only the on-chain attestation source is pending.",
      };
    },
  };
}
