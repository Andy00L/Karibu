import { Bot } from "grammy";
import { quoteFx, type FxRuntime } from "./fx.js";
import { anchorSha256, type NotaryRuntime } from "./notary.js";
import type { SelfVerifier } from "./self.js";
import type { EventBus } from "./events.js";
import { logError, logInfo } from "./logger.js";

// The human channel (SVC-5). Exposes verify, fx-quote, and notary
// conversationally. These bot flows are a free convenience for humans; the
// paid x402 services are for agents. Real notary anchors still post on-chain
// and appear on the dashboard feed. sourceRef: KARIBU_BUILD_PLAN.md 2.1 (SVC-5).
export type TelegramDeps = {
  fxRuntime: FxRuntime | null;
  notaryRuntime: NotaryRuntime | null;
  selfVerifier: SelfVerifier;
  events: EventBus;
};

export type TelegramBotHandle = {
  username: string;
  stop: () => Promise<void>;
};

export type StartTelegramResult =
  | { ok: true; handle: TelegramBotHandle }
  | { ok: false; reason: string };

export async function startTelegramBot(token: string, deps: TelegramDeps): Promise<StartTelegramResult> {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Karibu is the gateway agent on Celo. Try:\n/quote cUSD cKES 10\n/notary 0x<64 hex sha256>\n/verify 0x<wallet>\n/help",
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Commands:\n/quote <from> <to> <amount> for a Mento FX quote\n/notary <sha256> to anchor a hash on Celo\n/verify <wallet> to check if a human backs it",
    );
  });

  bot.command("quote", async (ctx) => {
    if (deps.fxRuntime === null) {
      await ctx.reply("FX is not configured right now.");
      return;
    }
    const parts = ctx.match.trim().split(/\s+/);
    const fromSymbol = parts[0];
    const toSymbol = parts[1];
    const amount = parts[2];
    if (fromSymbol === undefined || toSymbol === undefined || amount === undefined) {
      await ctx.reply("Usage: /quote <from> <to> <amount>, for example /quote cUSD cKES 10");
      return;
    }
    const result = await quoteFx(deps.fxRuntime, fromSymbol, toSymbol, amount);
    if (result.ok) {
      await ctx.reply(
        `${amount} ${result.quote.fromSymbol} is about ${result.quote.amountOutWei} wei of ${result.quote.toSymbol}.`,
      );
    } else {
      await ctx.reply(`Quote unavailable: ${result.reason}`);
    }
  });

  bot.command("notary", async (ctx) => {
    if (deps.notaryRuntime === null) {
      await ctx.reply("Notary is not configured right now.");
      return;
    }
    const sha256Input = ctx.match.trim();
    if (sha256Input.length === 0) {
      await ctx.reply("Usage: /notary <sha256 hash>");
      return;
    }
    const result = await anchorSha256(deps.notaryRuntime, sha256Input);
    if (result.ok) {
      if (!result.alreadyAnchored) {
        deps.events.emit({
          type: "notary_anchored",
          sha256: result.sha256,
          txHash: result.txHash,
          selfInitiated: false,
        });
      }
      await ctx.reply(`Anchored. Receipt: ${result.explorerUrl}`);
    } else {
      await ctx.reply(`Could not anchor: ${result.reason}`);
    }
  });

  bot.command("verify", async (ctx) => {
    const walletInput = ctx.match.trim();
    if (walletInput.length === 0) {
      await ctx.reply("Usage: /verify <wallet address>");
      return;
    }
    const result = await deps.selfVerifier.isHumanBacked(walletInput);
    await ctx.reply(`Human-backed: ${result.humanBacked}. ${result.note}`);
  });

  bot.catch((botError) => {
    logError("startTelegramBot", "bot handler error", { error: botError.message });
  });

  try {
    const me = await bot.api.getMe();
    logInfo("startTelegramBot", "telegram bot connected", { username: me.username ?? "" });
    // Long-polling runs until stop() is called; do not await it.
    void bot.start();
    return {
      ok: true,
      handle: {
        username: me.username ?? "",
        stop: async () => {
          await bot.stop();
        },
      },
    };
  } catch (startError) {
    const message = startError instanceof Error ? startError.message : String(startError);
    logError("startTelegramBot", "telegram bot failed to start", { error: message });
    return { ok: false, reason: message };
  }
}
