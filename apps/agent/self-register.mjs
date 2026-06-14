// Self Agent ID registration (Ed25519 mode): generates the agent's Ed25519 key,
// runs the challenge/sign/register flow, and prints the QR + deep link for the
// human to scan with the Self app. The on-chain registration completes only when
// the human scans. The private key is saved to the gitignored .env, never logged.
// sourceRef: https://app.ai.self.xyz/llms.txt (Ed25519 REST flow) + the OpenAPI.
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const BASE = "https://app.ai.self.xyz";
const NETWORK = process.env.SELF_NETWORK ?? "testnet"; // testnet | mainnet
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, "../../.env");

function fail(message) {
  console.error(`[self-register] ${message}`);
  process.exit(1);
}

// 1. Generate the agent's Ed25519 keypair. The 32-byte raw public key is the last
// 32 bytes of the SPKI DER.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const spki = publicKey.export({ type: "spki", format: "der" });
const pubHex = Buffer.from(spki.subarray(spki.length - 32)).toString("hex");
console.log(`[self-register] network=${NETWORK} pubkey=${pubHex}`);

// 2. Request the challenge.
const challengeResponse = await fetch(`${BASE}/api/agent/register/ed25519-challenge`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ pubkey: pubHex, network: NETWORK }),
});
const challengeText = await challengeResponse.text();
if (challengeResponse.status !== 200) {
  fail(`challenge failed ${challengeResponse.status}: ${challengeText.slice(0, 400)}`);
}
const challenge = JSON.parse(challengeText);
const challengeHash = challenge.challengeHash;
if (typeof challengeHash !== "string") {
  fail(`no challengeHash in response: ${challengeText.slice(0, 400)}`);
}
console.log(`[self-register] challengeHash=${challengeHash}`);

// 3. Sign the challenge-hash bytes with the Ed25519 private key (128 hex chars).
const challengeBytes = Buffer.from(challengeHash.replace(/^0x/, ""), "hex");
const signatureHex = Buffer.from(edSign(null, challengeBytes, privateKey)).toString("hex");

// 4. Submit the registration.
const registerResponse = await fetch(`${BASE}/api/agent/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ mode: "ed25519", ed25519Pubkey: pubHex, ed25519Signature: signatureHex, network: NETWORK }),
});
const registerText = await registerResponse.text();
if (registerResponse.status !== 200) {
  fail(`register failed ${registerResponse.status}: ${registerText.slice(0, 500)}`);
}
const registration = JSON.parse(registerText);
console.log(`[self-register] register keys: ${Object.keys(registration).join(", ")}`);
console.log(`[self-register] register response: ${JSON.stringify(registration).slice(0, 900)}`);

const token = registration.token ?? registration.sessionToken ?? registration.session ?? "";

if (typeof registration.deepLink === "string") {
  console.log(`DEEPLINK: ${registration.deepLink}`);
}
if (typeof registration.agentAddress === "string") {
  console.log(`AGENTADDRESS: ${registration.agentAddress}`);
}
if (typeof registration.humanInstructions === "string") {
  console.log(`INSTRUCTIONS: ${registration.humanInstructions.slice(0, 400)}`);
}
if (typeof registration.qrImageBase64 === "string") {
  writeFileSync(resolve(scriptDir, "self-qr-image.txt"), registration.qrImageBase64);
  console.log(`[self-register] wrote qrImageBase64 (${registration.qrImageBase64.length} chars) to self-qr-image.txt`);
}

// 5. Fetch a clean QR image URL + deep link.
if (token) {
  const qrResponse = await fetch(`${BASE}/api/agent/register/qr?token=${encodeURIComponent(token)}`);
  console.log(`[self-register] qr endpoint (${qrResponse.status}): ${(await qrResponse.text()).slice(0, 600)}`);
}

// 6. Persist the key + token to the gitignored .env (the value is never logged).
const privatePkcs8 = Buffer.from(privateKey.export({ type: "pkcs8", format: "der" })).toString("hex");
appendFileSync(
  envPath,
  `\nSELF_AGENT_ED25519_PUBKEY=${pubHex}\nSELF_AGENT_ED25519_PRIVKEY_PKCS8=${privatePkcs8}\nSELF_REGISTER_TOKEN=${token}\nSELF_NETWORK=${NETWORK}\n`,
);
console.log("[self-register] saved pubkey, private key, and token to .env");
console.log("SELF_REGISTER_OK");
