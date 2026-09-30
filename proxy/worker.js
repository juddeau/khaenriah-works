// Cloudflare Worker for Khaenri'ah Works on GitHub Pages. Adds CORS headers to two read-only lookups:
//   /api/uid/<UID>/  -> Enka.Network showcase (characters, artifacts with roll history)
//   /akasha/<UID>    -> Akasha System rankings for that UID (unofficial API, may change without notice)
// Only UIDs are accepted, only the site's own origin is allowed, answers are cached.
const SITE = 'https://juddeau.github.io';
const CORS = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Vary': 'Origin',
};
const UA = { 'User-Agent': 'KhaenriahWorks/1.0 (github.com/juddeau/khaenriah-works)' };

async function cached(ctx, cacheKey, upstream, ttlOf) {
  const cache = caches.default;
  const key = new Request(`https://kw-cache.local/${cacheKey}`);
  let res = await cache.match(key);
  if (!res) {
    const up = await fetch(upstream, { headers: UA });
    res = new Response(up.body, up);
    let ttl = 10;
    if (up.ok) ttl = await ttlOf(res.clone());
    res.headers.set('Cache-Control', `max-age=${ttl}`);
    if (up.ok) ctx.waitUntil(cache.put(key, res.clone()));
  }
  return res;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const path = new URL(request.url).pathname;
    let res;
    let m = path.match(/^\/api\/uid\/(\d{9,10})\/?$/);
    if (m) {
      res = await cached(ctx, `enka/${m[1]}`, `https://enka.network/api/uid/${m[1]}/`,
        async r => { try { return (await r.json()).ttl || 60; } catch { return 60; } });
    } else if ((m = path.match(/^\/akasha\/(\d{9,10})\/?$/))) {
      res = await cached(ctx, `akasha/${m[1]}`, `https://akasha.cv/api/getCalculationsForUser/${m[1]}`, async () => 600);
    } else {
      return new Response('Use /api/uid/<UID>/ or /akasha/<UID>', { status: 404, headers: CORS });
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
};
