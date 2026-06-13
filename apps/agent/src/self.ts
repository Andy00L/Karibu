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

// Self's deployment on Celo Sepolia is not confirmed in Phase 0, so the verifier
// is the documented interface stub on testnet and says so honestly. The real
// on-chain Self human-proof query (SelfAgentRegistry on mainnet) replaces this
// once the grant lands and the addresses are second-verified on-chain.
// sourceRef: KARIBU_BUILD_PLAN.md Day 1 item 5 and docs/FACTS.md section 4.
export function createSelfVerifier(network: KaribuNetwork): SelfVerifier {
  return {
    async isHumanBacked(wallet: string): Promise<HumanBackedResult> {
      return {
        wallet,
        humanBacked: false,
        source: "self-agent-id",
        network,
        note: "Self human-proof lookup is wired on mainnet only; on this network the result is the documented interface stub.",
      };
    },
  };
}
