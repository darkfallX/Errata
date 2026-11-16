// --crawl: from a docs index page, collect same-site links that look like tutorials.
const TUTORIAL = /(quick-?start|getting-?started|tutorial|guide|walkthrough|how-?to|first-|create|setup|set-up)/i;

export async function crawl(start: string, limit: number): Promise<string[]> {
  const base = new URL(start);
  const res = await fetch(start);
  if (!res.ok) return [start];
  const html = await res.text();
  const seen = new Set<string>([base.toString()]);
  const ranked: { url: string; score: number }[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL;
    try {
      u = new URL(m[1], base);
    } catch {
      continue;
    }
    if (u.host !== base.host || !/^https?:$/.test(u.protocol)) continue;
    u.hash = "";
    const key = u.toString();
    if (seen.has(key) || /\.(png|jpe?g|svg|gif|pdf|zip|css|js)$/i.test(u.pathname)) continue;
    seen.add(key);
    const text = m[2].replace(/<[^>]+>/g, " ");
    const score = (TUTORIAL.test(u.pathname) ? 2 : 0) + (TUTORIAL.test(text) ? 1 : 0) + (u.pathname.startsWith(base.pathname) ? 1 : 0);
    ranked.push({ url: key, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  return [start, ...ranked.filter((r) => r.score > 0).slice(0, Math.max(0, limit - 1)).map((r) => r.url)];
}
