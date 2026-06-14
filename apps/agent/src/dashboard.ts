// A self-contained live dashboard served by the agent at GET /. It reads only the
// public read-only endpoints (/api/metrics, /api/skills) and subscribes to the SSE
// stream (/api/stream), so every number is measured on the server, never hardcoded
// here. No external assets, so it renders identically whether hosted or run
// locally, with no CDN dependency. sourceRef: KARIBU_BUILD_PLAN.md section 2.5 (the
// judge's screen), apps/agent/src/server.ts (the endpoints it consumes),
// packages/state-contract (KaribuSnapshot and KaribuEvent shapes).
//
// The page is a plain string (no template interpolation, no backticks inside) so
// it compiles into dist and ships without a separate build step or static folder.
export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Karibu, the gateway agent on Celo</title>
<style>
  :root {
    --bg:#0b0e14; --panel:#131822; --border:#232c3d; --text:#e7ecf3; --muted:#8a97ab;
    --accent:#35d07f; --accent-2:#fbcc5c; --link:#6aa9ff;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  a { color:var(--link); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:1040px; margin:0 auto; padding:24px 20px 64px; }
  header { display:flex; align-items:center; justify-content:space-between; gap:16px;
    flex-wrap:wrap; margin-bottom:22px; }
  .brand { display:flex; align-items:baseline; gap:12px; }
  .brand h1 { font-size:22px; margin:0; font-weight:600; letter-spacing:0.2px; }
  .brand .tag { color:var(--muted); font-size:14px; }
  .live { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
  .dot { width:9px; height:9px; border-radius:50%; background:#555; }
  .dot.on { background:var(--accent); box-shadow:0 0 0 3px rgba(53,208,127,0.18); }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(232px,1fr)); gap:14px; }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:16px 18px; }
  .card h2 { font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:var(--muted);
    margin:0 0 12px; font-weight:600; }
  .big { font-size:30px; font-weight:700; font-variant-numeric:tabular-nums; }
  .stat { display:flex; align-items:baseline; justify-content:space-between; margin:7px 0; }
  .stat .label { color:var(--muted); font-size:13px; }
  .stat .value { font-size:16px; font-weight:600; font-variant-numeric:tabular-nums; }
  .badge { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px;
    font-size:12px; font-weight:600; border:1px solid var(--border); }
  .badge.ok { color:var(--accent); border-color:rgba(53,208,127,0.4); background:rgba(53,208,127,0.08); }
  .badge.warn { color:var(--accent-2); border-color:rgba(251,204,92,0.4); background:rgba(251,204,92,0.08); }
  .svc { display:flex; align-items:center; justify-content:space-between; padding:7px 0;
    border-top:1px solid var(--border); }
  .svc:first-child { border-top:0; }
  .svc .name { font-weight:600; font-size:14px; }
  .svc .price { color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums; }
  .feed { margin-top:22px; }
  .feed h2 { font-size:12px; text-transform:uppercase; letter-spacing:0.8px; color:var(--muted); margin:0 0 10px; }
  .events { display:flex; flex-direction:column; gap:8px; }
  .event { display:flex; align-items:center; gap:12px; background:var(--panel); border:1px solid var(--border);
    border-left:3px solid var(--accent); border-radius:10px; padding:10px 14px; }
  .event.self { border-left-color:var(--accent-2); }
  .event .kind { font-size:12px; font-weight:700; min-width:128px; }
  .event .detail { color:var(--muted); font-size:13px; flex:1; word-break:break-all; }
  .event .self-tag { color:var(--accent-2); font-size:11px; font-weight:700; text-transform:uppercase; }
  .empty { color:var(--muted); font-size:14px; padding:18px; text-align:center;
    border:1px dashed var(--border); border-radius:10px; }
  footer { margin-top:28px; color:var(--muted); font-size:12px; line-height:1.7; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand"><h1>Karibu</h1><span class="tag">the gateway agent on Celo</span></div>
    <div class="live"><span class="dot" id="liveDot"></span><span id="liveText">connecting</span></div>
  </header>

  <div class="grid">
    <div class="card">
      <h2>Activity</h2>
      <div class="big" id="txTotal">0</div>
      <div class="stat"><span class="label">transactions, last 24h</span><span class="value" id="tx24h">0</span></div>
      <div class="stat"><span class="label">unique client wallets</span><span class="value" id="uniqueWallets">0</span></div>
    </div>
    <div class="card">
      <h2>Treasury (cUSD)</h2>
      <div class="stat"><span class="label">earned</span><span class="value" id="revenue">0.00</span></div>
      <div class="stat"><span class="label">gas paid</span><span class="value" id="gasPaid">0.00</span></div>
      <div class="stat"><span class="label">net</span><span class="value" id="net">0.00</span></div>
    </div>
    <div class="card">
      <h2>Trust</h2>
      <div class="stat"><span class="label">human-backed (Self)</span><span id="selfBadge" class="badge warn">pending</span></div>
      <div class="stat"><span class="label">ERC-8004 agent</span><span class="value"><a id="agentLink" target="_blank" rel="noreferrer">unset</a></span></div>
      <div class="stat"><span class="label">third-party feedback</span><span class="value" id="feedbackCount">0</span></div>
      <div class="stat"><span class="label">8004scan score</span><span class="value" id="scanScore">n/a</span></div>
    </div>
    <div class="card">
      <h2>Services (x402)</h2>
      <div id="services"></div>
    </div>
  </div>

  <div class="feed">
    <h2>Live activity</h2>
    <div class="events" id="events"><div class="empty">waiting for the first on-chain event</div></div>
  </div>

  <footer id="footer">Every number is measured from chain reads and server counters, never hardcoded. Self-initiated activity is labeled and counted separately.</footer>
</div>

<script>
  (function () {
    var EXPLORER = { celo: "https://celoscan.io", "celo-sepolia": "https://celo-sepolia.blockscout.com" };
    function explorerTxUrl(network, txHash) { return (EXPLORER[network] || EXPLORER.celo) + "/tx/" + txHash; }
    function scanAgentUrl(network, agentId) {
      return network === "celo" ? "https://8004scan.io/agents/celo/" + agentId : null;
    }
    function shorten(value) { return value ? value.slice(0, 8) + "..." + value.slice(-6) : ""; }
    function shortWallet(value) { return value ? value.slice(0, 6) + "..." + value.slice(-4) : ""; }
    function setText(id, text) { var node = document.getElementById(id); if (node) { node.textContent = text; } }
    function asCusd(amount) { return (Number(amount) || 0).toFixed(2); }

    var currentNetwork = "celo";
    var currentAgentId = "";
    var feedHasEvents = false;

    function renderSnapshot(snapshot) {
      if (!snapshot) { return; }
      currentNetwork = snapshot.network || currentNetwork;
      currentAgentId = snapshot.agentId || currentAgentId;
      setText("txTotal", String(snapshot.txCountTotal || 0));
      setText("tx24h", String(snapshot.txCount24h || 0));
      setText("uniqueWallets", String(snapshot.uniqueClientWallets || 0));
      setText("revenue", asCusd(snapshot.revenueCusd));
      setText("gasPaid", asCusd(snapshot.gasPaidCusd));
      setText("net", asCusd((Number(snapshot.revenueCusd) || 0) - (Number(snapshot.gasPaidCusd) || 0)));
      setText("feedbackCount", String(snapshot.feedbackCount || 0));
      setText("scanScore", snapshot.scanScore == null ? "n/a" : String(snapshot.scanScore));
      var selfBadge = document.getElementById("selfBadge");
      if (selfBadge) {
        selfBadge.textContent = snapshot.selfVerified ? "verified" : "pending";
        selfBadge.className = snapshot.selfVerified ? "badge ok" : "badge warn";
      }
      var agentLink = document.getElementById("agentLink");
      if (agentLink && currentAgentId) {
        agentLink.textContent = "#" + currentAgentId;
        var url = scanAgentUrl(currentNetwork, currentAgentId);
        if (url) { agentLink.setAttribute("href", url); } else { agentLink.removeAttribute("href"); }
      }
    }

    var KIND_LABEL = {
      service_paid: "service paid", notary_anchored: "notary anchored", fx_swapped: "fx swapped",
      human_verified: "human verified", feedback_received: "feedback"
    };
    function describeEvent(event) {
      if (event.type === "service_paid") { return event.service + " / $" + (Number(event.amountUsd) || 0).toFixed(2) + " / " + shortWallet(event.clientWallet); }
      if (event.type === "notary_anchored") { return shorten(event.sha256); }
      if (event.type === "fx_swapped") { return event.amountFrom + " " + event.fromSymbol + " to " + event.toSymbol; }
      if (event.type === "human_verified") { return event.walletShort; }
      if (event.type === "feedback_received") { return "score " + event.score + " from " + shortWallet(event.clientWallet); }
      return "";
    }

    var eventsNode = document.getElementById("events");
    function appendFeedEvent(event) {
      if (event.type === "tick") { renderSnapshot(event.snapshot); return; }
      var label = KIND_LABEL[event.type];
      if (!label) { return; }
      if (!feedHasEvents) { eventsNode.innerHTML = ""; feedHasEvents = true; }
      var row = document.createElement("div");
      row.className = "event" + (event.selfInitiated ? " self" : "");
      var kind = document.createElement("span"); kind.className = "kind"; kind.textContent = label;
      var detail = document.createElement("span"); detail.className = "detail"; detail.textContent = describeEvent(event);
      row.appendChild(kind); row.appendChild(detail);
      if (event.selfInitiated) {
        var tag = document.createElement("span"); tag.className = "self-tag"; tag.textContent = "self-initiated"; row.appendChild(tag);
      }
      if (event.txHash) {
        var link = document.createElement("a"); link.textContent = "tx"; link.target = "_blank"; link.rel = "noreferrer";
        link.setAttribute("href", explorerTxUrl(currentNetwork, event.txHash)); row.appendChild(link);
      }
      eventsNode.insertBefore(row, eventsNode.firstChild);
      while (eventsNode.childNodes.length > 30) { eventsNode.removeChild(eventsNode.lastChild); }
    }

    function renderServices(skills) {
      var node = document.getElementById("services");
      if (!node || !skills || !skills.services) { return; }
      node.innerHTML = "";
      skills.services.forEach(function (service) {
        var row = document.createElement("div"); row.className = "svc";
        var name = document.createElement("span"); name.className = "name"; name.textContent = service.name;
        var price = document.createElement("span"); price.className = "price"; price.textContent = "$" + service.priceUsd;
        row.appendChild(name); row.appendChild(price); node.appendChild(row);
      });
    }

    function setLive(isLive) {
      var dot = document.getElementById("liveDot");
      var text = document.getElementById("liveText");
      if (dot) { dot.className = isLive ? "dot on" : "dot"; }
      if (text) { text.textContent = isLive ? "live" : "reconnecting"; }
    }

    function loadOnce() {
      fetch("/api/metrics").then(function (response) { return response.json(); }).then(renderSnapshot).catch(function () {});
      fetch("/api/skills").then(function (response) { return response.json(); }).then(function (skills) {
        renderServices(skills);
        var footer = document.getElementById("footer");
        if (footer && skills && skills.network) {
          footer.textContent = "Every number is measured from chain reads and server counters, never hardcoded. Self-initiated activity is labeled and counted separately. Network: " + skills.network + ".";
        }
      }).catch(function () {});
    }

    function connectStream() {
      if (typeof EventSource === "undefined") { return; }
      var source = new EventSource("/api/stream");
      source.onopen = function () { setLive(true); };
      source.onerror = function () { setLive(false); };
      source.onmessage = function (message) {
        try { appendFeedEvent(JSON.parse(message.data)); } catch (parseError) { /* ignore a malformed frame */ }
      };
    }

    loadOnce();
    connectStream();
  })();
</script>
</body>
</html>`;
