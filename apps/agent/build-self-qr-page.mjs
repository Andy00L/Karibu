// Builds a standalone, browser-openable HTML page that displays the Self
// registration QR, read from self-qr-image.txt (the base64 PNG that
// self-register.mjs saved). The image is embedded as a data URI, so the page
// needs no server and no network: open apps/agent/self-qr.html in any browser
// and scan it with the Self app. sourceRef: self-register.mjs (writes
// self-qr-image.txt), self-qr.mjs (refreshes it).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const qrImagePath = resolve(scriptDir, "self-qr-image.txt");
const outputHtmlPath = resolve(scriptDir, "self-qr.html");

const rawQrImage = readFileSync(qrImagePath, "utf8").trim();
if (rawQrImage.length === 0) {
  console.error("[buildSelfQrPage] self-qr-image.txt is empty; run self-register.mjs or self-qr.mjs first");
  process.exit(1);
}

// self-register.mjs may save either a bare base64 string or a full data URI;
// normalize to a data URI so the <img> renders either way.
const imageSource = rawQrImage.startsWith("data:") ? rawQrImage : `data:image/png;base64,${rawQrImage}`;

const htmlPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Karibu Self Agent ID QR</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; font-family: system-ui, sans-serif; background: #faf7f0; color: #1a1a1a; }
  h1 { font-size: 18px; margin: 0; }
  p { margin: 0; font-size: 14px; color: #555; max-width: 360px; text-align: center; }
  img { width: 320px; height: 320px; image-rendering: pixelated; border: 1px solid #e5e0d5; border-radius: 12px; background: #fff; padding: 12px; }
</style>
</head>
<body>
  <h1>Karibu Self Agent ID</h1>
  <p>Open the Self app, choose scan, and point it at this code.</p>
  <img src="${imageSource}" alt="Self Agent ID registration QR code" />
  <p>Celo mainnet registration. If the app says the session expired, ask Karibu to refresh it.</p>
</body>
</html>
`;

writeFileSync(outputHtmlPath, htmlPage);
console.log(`[buildSelfQrPage] wrote ${outputHtmlPath} (${htmlPage.length} chars, image ${imageSource.length} chars)`);
console.log("BUILD_SELF_QR_PAGE_OK");
