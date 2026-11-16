// Driftwood: a tiny, dependency-free web app used as Errata's deterministic demo.
// v1 matches docs/quickstart.md. v2 is "the redesign": two menus moved, one feature removed.
//   node server.mjs --version 2 --port 4177
import { createServer } from "node:http";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};

export function startDriftwood({ version = 2, port = 4177 } = {}) {
  const v = Number(version);
  const nav = v === 1 ? ["Dashboard", "Projects", "Team", "Reports", "Settings"] : ["Dashboard", "Projects", "Team", "Reports", "Settings", "Developers"];
  const href = (l) => (l === "Dashboard" ? "/" : `/${l.toLowerCase()}`);

  const page = (path, title, body, side = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Driftwood</title><style>
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#1d2433;background:#f6f7f9}
header{display:flex;align-items:center;gap:18px;padding:0 24px;height:56px;background:#fff;border-bottom:1px solid #e3e6ea}
.brand{font-weight:800;letter-spacing:-.02em;margin-right:12px}.brand i{color:#c26a1b;font-style:normal}
header nav{display:flex;gap:4px;flex:1}header nav a{padding:8px 12px;border-radius:8px;color:#4a5466;text-decoration:none;font-weight:500}
header nav a[aria-current]{background:#eef0f4;color:#1d2433;font-weight:650}
details.acct{position:relative}details.acct summary{list-style:none;cursor:pointer;padding:8px 12px;border:1px solid #e3e6ea;border-radius:999px;font-weight:600}
details.acct div{position:absolute;right:0;top:44px;background:#fff;border:1px solid #e3e6ea;border-radius:10px;padding:6px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,.08)}
details.acct div a{display:block;padding:8px 10px;border-radius:6px;color:#1d2433;text-decoration:none}details.acct div a:hover{background:#f1f3f6}
.wrap{display:flex;gap:24px;max-width:1080px;margin:28px auto;padding:0 24px}
aside{width:190px;display:flex;flex-direction:column;gap:2px}aside a{padding:8px 12px;border-radius:8px;color:#4a5466;text-decoration:none}
aside a[aria-current]{background:#fff;border:1px solid #e3e6ea;color:#1d2433;font-weight:650}
main{flex:1;background:#fff;border:1px solid #e3e6ea;border-radius:12px;padding:28px}
h1{margin:0 0 6px;font-size:24px;letter-spacing:-.02em}p.sub{margin:0 0 20px;color:#667085}
.btn{display:inline-block;padding:9px 16px;border-radius:8px;background:#1d2433;color:#fff;text-decoration:none;font-weight:600;border:0;font:inherit;cursor:pointer}
.btn.ghost{background:#fff;color:#1d2433;border:1px solid #d0d5dd}
table{width:100%;border-collapse:collapse;margin-top:16px}td,th{text-align:left;padding:10px;border-bottom:1px solid #eef0f3}th{color:#667085;font-weight:600;font-size:13px}
label{display:block;font-weight:600;margin:14px 0 6px}input{width:100%;max-width:380px;padding:9px 12px;border:1px solid #d0d5dd;border-radius:8px;font:inherit}
.note{padding:12px 14px;background:#fff8ec;border:1px solid #f5d9a8;border-radius:8px;color:#7a4b00}
.ok{padding:12px 14px;background:#ecfbf3;border:1px solid #a9e5c4;border-radius:8px;color:#05603a}
.ver{margin-left:auto;font:12px ui-monospace,monospace;color:#98a2b3}
</style></head><body>
<header><span class="brand">drift<i>wood</i></span><nav>${nav
    .map((l) => `<a href="${href(l)}"${path === href(l) || (href(l) !== "/" && path.startsWith(href(l))) ? ' aria-current="page"' : ""}>${l}</a>`)
    .join("")}</nav>${
    v === 2 ? `<details class="acct"><summary>Account</summary><div><a href="/account/profile">Profile</a><a href="/account/billing-history">Billing history</a><a href="/">Sign out</a></div></details>` : ""
  }<span class="ver">v${v}</span></header>
<div class="wrap">${side ? `<aside>${side}</aside>` : ""}<main>${body}</main></div></body></html>`;

  const settingsSide = (path) =>
    (v === 1 ? [["General", "/settings"], ["API Keys", "/settings/api-keys"], ["Billing", "/settings/billing"]] : [["General", "/settings"], ["Appearance", "/settings/appearance"]])
      .map(([l, h]) => `<a href="${h}"${path === h ? ' aria-current="page"' : ""}>${l}</a>`)
      .join("");
  const devSide = (path) => [["Tokens", "/developers/tokens"], ["Webhooks", "/developers/webhooks"]].map(([l, h]) => `<a href="${h}"${path.startsWith(h) ? ' aria-current="page"' : ""}>${l}</a>`).join("");

  const routes = {
    "/": () => page("/", "Dashboard", `<h1>Welcome back</h1><p class="sub">Your workspace at a glance.</p><table><tr><th>Project</th><th>Status</th></tr><tr><td>Harbor</td><td>Live</td></tr><tr><td>Lighthouse</td><td>Draft</td></tr></table>`),
    "/projects": () => page("/projects", "Projects", `<h1>Projects</h1><p class="sub">Everything your team is building.</p><a class="btn" href="/projects/new">New project</a><table><tr><th>Name</th><th>Owner</th></tr><tr><td>Harbor</td><td>Ana</td></tr><tr><td>Lighthouse</td><td>Kofi</td></tr></table>`),
    "/projects/new": () => page("/projects", "New project", `<h1>New project</h1><label for="pn">Project name</label><input id="pn" placeholder="e.g. Harbor">`),
    "/team": () => page("/team", "Team", `<h1>Team</h1><p class="sub">People in this workspace.</p><a class="btn" href="/team/invite">Invite member</a><table><tr><th>Name</th><th>Role</th></tr><tr><td>Ana</td><td>Owner</td></tr><tr><td>Kofi</td><td>Editor</td></tr></table>`),
    "/team/invite": () => page("/team", "Invite member", `<h1>Invite a member</h1><p class="sub">They'll get an email with a link.</p><label for="em">Email address</label><input id="em" type="email" placeholder="name@company.com">`),
    "/reports": () =>
      page(
        "/reports",
        "Reports",
        v === 1
          ? `<h1>Reports</h1><p class="sub">Weekly activity across projects.</p><a class="btn" href="/reports/export">Export CSV</a><table><tr><th>Week</th><th>Deploys</th></tr><tr><td>44</td><td>12</td></tr><tr><td>45</td><td>9</td></tr></table>`
          : `<h1>Reports</h1><p class="sub">Weekly activity across projects.</p><div class="note">Exports are being rebuilt and are not available in this version.</div><table><tr><th>Week</th><th>Deploys</th></tr><tr><td>44</td><td>12</td></tr><tr><td>45</td><td>9</td></tr></table>`,
      ),
    "/settings": (p) => page("/settings", "Settings", `<h1>General</h1><p class="sub">Workspace name and region.</p><label for="wn">Workspace name</label><input id="wn" value="Acme">`, settingsSide(p)),
  };
  if (v === 1) {
    Object.assign(routes, {
      "/reports/export": () => page("/reports", "Export", `<h1>Export CSV</h1><div class="ok">Your export is ready. <a href="#">Download reports-week45.csv</a></div>`),
      "/settings/api-keys": (p) => page("/settings", "API Keys", `<h1>API Keys</h1><p class="sub">Keys let your code talk to Driftwood.</p><a class="btn" href="/settings/api-keys/new">Create key</a>`, settingsSide(p)),
      "/settings/api-keys/new": () => page("/settings", "Create key", `<h1>Create a new API key</h1><label for="kn">Key name</label><input id="kn" placeholder="e.g. production">`, settingsSide("/settings/api-keys")),
      "/settings/billing": (p) => page("/settings", "Billing", `<h1>Billing</h1><p class="sub">Plan: Team.</p><a class="btn ghost" href="/settings/billing/invoices">Invoices</a>`, settingsSide(p)),
      "/settings/billing/invoices": () => page("/settings", "Invoices", `<h1>Invoices</h1><table><tr><th>Date</th><th>Amount</th></tr><tr><td>1 Nov 2026</td><td>$48.00</td></tr><tr><td>1 Oct 2026</td><td>$48.00</td></tr></table>`, settingsSide("/settings/billing")),
    });
  } else {
    Object.assign(routes, {
      "/settings/appearance": (p) => page("/settings", "Appearance", `<h1>Appearance</h1><p class="sub">Light or dark.</p>`, settingsSide(p)),
      "/developers": (p) => page("/developers", "Developers", `<h1>Developers</h1><p class="sub">Tokens and webhooks for your integrations.</p>`, devSide(p)),
      "/developers/tokens": (p) => page("/developers", "Tokens", `<h1>Tokens</h1><p class="sub">Tokens let your code talk to Driftwood.</p><a class="btn" href="/developers/tokens/new">New token</a>`, devSide(p)),
      "/developers/tokens/new": (p) => page("/developers", "New token", `<h1>Create a new API token</h1><label for="kn">Token name</label><input id="kn" placeholder="e.g. production">`, devSide(p)),
      "/developers/webhooks": (p) => page("/developers", "Webhooks", `<h1>Webhooks</h1><p class="sub">No webhooks yet.</p>`, devSide(p)),
      "/account/profile": () => page("/account", "Profile", `<h1>Profile</h1><label for="nm">Name</label><input id="nm" value="Ana">`),
      "/account/billing-history": () => page("/account", "Billing history", `<h1>Billing history</h1><table><tr><th>Date</th><th>Amount</th></tr><tr><td>1 Nov 2026</td><td>$48.00</td></tr><tr><td>1 Oct 2026</td><td>$48.00</td></tr></table>`),
    });
  }

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname.replace(/\/$/, "") || "/";
    const route = routes[path];
    res.setHeader("content-type", "text/html; charset=utf-8");
    if (!route) {
      res.statusCode = 404;
      res.end(page(path, "Not found", `<h1>Page not found</h1><p class="sub">There is nothing at ${path}.</p><a class="btn ghost" href="/">Back to dashboard</a>`));
      return;
    }
    res.end(route(path));
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve({ server, url: `http://localhost:${port}`, close: () => new Promise((r) => server.close(r)) }));
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("server.mjs")) {
  const port = Number(arg("port", 4177));
  startDriftwood({ version: arg("version", 2), port }).then(({ url }) => console.log(`Driftwood v${arg("version", 2)} on ${url}`));
}
