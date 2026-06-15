import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The live dashboard (the judge's screen) is a self-contained HTML document with
// inline CSS and vanilla JS, no external assets beyond the agent-served
// /karibu.png. It is kept as a separate file so it stays reviewable as HTML and
// needs no escaping, and is read once at startup and served verbatim at GET /.
// It consumes only the public read-only endpoints (/api/metrics, /api/skills,
// /api/treasury, /health) and the SSE stream (/api/stream). sourceRef:
// apps/agent/src/dashboard.html, KARIBU_BUILD_PLAN.md 2.5, apps/agent/src/server.ts.
const FALLBACK_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Karibu</title></head><body><p>Dashboard asset unavailable.</p></body></html>';

// Reads the dashboard HTML from the first path that resolves, so it works whether
// the process is launched from the repo root (process.cwd) or only the compiled
// module path is known. Errors as values: a missing file falls back to minimal
// HTML rather than throwing at import time. sourceRef: server.ts brand-image read.
function loadDashboardHtml(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    join(moduleDir, "..", "src", "dashboard.html"),
    join(moduleDir, "dashboard.html"),
    join(process.cwd(), "apps", "agent", "src", "dashboard.html"),
  ];
  for (const candidatePath of candidatePaths) {
    try {
      return readFileSync(candidatePath, "utf8");
    } catch {
      // not at this path; try the next candidate
    }
  }
  return FALLBACK_HTML;
}

export const DASHBOARD_HTML: string = loadDashboardHtml();
