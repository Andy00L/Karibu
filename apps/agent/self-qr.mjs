// Fetches the current Self registration QR + deep link for the MAINNET agent
// session and writes the QR PNG to self-qr-image.txt so the human can scan it
// with the Self app. The .env can hold both a testnet and a mainnet registration
// block; this reads the token for the requested network (mainnet by default),
// because the production Self app refuses the testnet/staging deep link.
// sourceRef: self-register.mjs (append order + qr/status endpoints).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_BASE_URL = "https://app.ai.self.xyz"; // sourceRef: self-register.mjs
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "../../.env");
const qrImagePath = resolve(scriptDir, "self-qr-image.txt");
const envText = readFileSync(envPath, "utf8");

// self-register.mjs appends a 4-line block per run: pubkey, privkey, token,
// network. Several blocks can coexist (a testnet run and a mainnet run). Reading
// the first token blindly returns the testnet one, whose staging deep link the
// production Self app will not open. Walk the file and return the token whose
// block declares the requested SELF_NETWORK.
function readRegisterTokenForNetwork(targetNetwork) {
  let mostRecentToken = "";
  let matchedToken = "";
  for (const line of envText.split(/\r?\n/)) {
    const keyValueMatch = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (keyValueMatch === null) {
      continue;
    }
    const entryKey = keyValueMatch[1];
    const entryValue = keyValueMatch[2].trim();
    if (entryKey === "SELF_REGISTER_TOKEN") {
      mostRecentToken = entryValue;
    } else if (entryKey === "SELF_NETWORK" && entryValue === targetNetwork) {
      matchedToken = mostRecentToken;
    }
  }
  return matchedToken;
}

const targetNetwork = process.env.SELF_QR_NETWORK ?? "mainnet";
const registerToken = readRegisterTokenForNetwork(targetNetwork);
if (registerToken.length === 0) {
  console.error(`[readRegisterTokenForNetwork] no SELF_REGISTER_TOKEN for network ${targetNetwork} in .env`);
  process.exit(1);
}
// Log only the token tail, never the full session token (it grants access).
console.log(`[self-qr] network=${targetNetwork} token=...${registerToken.slice(-6)}`);

// Fetch the QR payload (deep link + base64 PNG) for this session.
const qrResponse = await fetch(`${SELF_BASE_URL}/api/agent/register/qr`, {
  headers: { Authorization: `Bearer ${registerToken}` },
});
const qrText = await qrResponse.text();
console.log(`[self-qr] qr endpoint status ${qrResponse.status}`);

let parsedQr = null;
try {
  parsedQr = JSON.parse(qrText);
} catch {
  parsedQr = null;
}

if (parsedQr === null) {
  console.log(`[self-qr] qr body (not JSON): ${qrText.slice(0, 600)}`);
} else {
  console.log(`[self-qr] qr keys: ${Object.keys(parsedQr).join(", ")}`);
  for (const linkField of ["deepLink", "universalLink", "scanUrl", "qrImageUrl", "url"]) {
    if (typeof parsedQr[linkField] === "string") {
      console.log(`${linkField.toUpperCase()}: ${parsedQr[linkField]}`);
    }
  }
  if (typeof parsedQr.qrImageBase64 === "string") {
    writeFileSync(qrImagePath, parsedQr.qrImageBase64);
    console.log(`[self-qr] wrote qrImageBase64 (${parsedQr.qrImageBase64.length} chars) to ${qrImagePath}`);
  }
}

// Poll the registration status so we can see whether the session is still open.
const statusResponse = await fetch(
  `${SELF_BASE_URL}/api/agent/register/status?token=${encodeURIComponent(registerToken)}`,
);
console.log(`[self-qr] status (${statusResponse.status}): ${(await statusResponse.text()).slice(0, 400)}`);
console.log("SELF_QR_DONE");
