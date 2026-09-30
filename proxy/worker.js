// Cloudflare Worker: forwards /api/uid/<UID>/ to Enka.Network and adds CORS headers,
// so the Khaenri'ah Works page on GitHub Pages can read the response.
// Only UID lookups are forwarded, only for the site's own origin, and answers are cached for Enka's ttl.
const SITE = 'https://juddeau.github.io';
const CORS = {
  'Access-Control-Allow-Origin': SITE,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Vary': 'Origin',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const m = new URL(request.url).pathname.match(/^\/api\/uid\/(\d{9,10})\/?$/);
    if (!m) return new Response('Use /api/uid/<UID>/', { status: 404, headers: CORS });

    const cache = caches.default;
    const key = new Request(`https://enka-cache.local/${m[1]}`);
    let res = await cache.match(key);
    if (!res) {
      const up = await fetch(`https://enka.network/api/uid/${m[1]}/`, {
        headers: { 'User-Agent': 'KhaenriahWorks/1.0 (github.com/juddeau/khaenriah-works)' },
      });
      res = new Response(up.body, up);
      let ttl = 10;
      if (up.ok) {
        try { ttl = (await res.clone().json()).ttl || 60; } catch {}
      }
      res.headers.set('Cache-Control', `max-age=${ttl}`);
      if (up.ok) ctx.waitUntil(cache.put(key, res.clone()));
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
};
