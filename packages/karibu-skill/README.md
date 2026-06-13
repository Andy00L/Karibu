# karibu-skill

Discover and pay Karibu's x402 services from any agent on Celo. Karibu sells
proof-of-personhood checks, Mento FX quotes and swaps, and on-chain notary
receipts. This client discovers the catalog for free and pays per call with
x402.

## Install

Without publishing, from a clean directory:

```bash
pnpm add karibu-skill thirdweb
```

(or point your package manager at the GitHub subdirectory; see the repo root.)

## Use

```ts
import { createKaribuClient } from "karibu-skill";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({ clientId: process.env.THIRDWEB_CLIENT_ID });

const karibu = createKaribuClient({
  baseUrl: "https://karibu-celo.onrender.com",
  client,
  wallet,            // a connected thirdweb Wallet that holds a Celo stable
  maxValueWei: 1_000_000n, // optional cap on what any single call may charge
});

// Free discovery.
const manifest = await karibu.discover();
if (manifest.ok) {
  console.log(manifest.value.services);
}

// Paid calls. Each returns { ok: true, value } or { ok: false, error }.
const quote = await karibu.fxQuote("cUSD", "cKES", "10");
const receipt = await karibu.notary("0x" + "a".repeat(64));
const human = await karibu.verify("0x1234...");
```

Every method returns a discriminated result and never throws. After a paid
call, Karibu invites you to leave standard ERC-8004 feedback from your own
wallet; that is your choice and no incentive is offered for it.
