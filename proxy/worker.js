// Cloudflare Worker for Khaenri'ah Works on GitHub Pages. Adds CORS headers to two read-only lookups:
//   /api/uid/<UID>/  -> Enka.Network showcase (characters, artifacts with roll history)
//   /akasha/<UID>    -> Akasha System rankings for that UID (unofficial API, may change without notice)
//   /akasha-cats/<characterId>        -> Akasha leaderboard categories of a character
//   /akasha-lb/<calculationId>?lt=&size=&filter= -> a slice of one leaderboard (entries below result lt,
//                                        optionally one constellation), for the rank estimate
//   /akasha-size/<hash>               -> total rows of a leaderboard
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
    } else if ((m = path.match(/^\/akasha-cats\/(\d{1,12})\/?$/))) {
      res = await cached(ctx, `akcats/${m[1]}`, `https://akasha.cv/api/v2/leaderboards/categories?characterId=${m[1]}`, async () => 21600);
    } else if ((m = path.match(/^\/akasha-lb\/(\d{1,12})\/?$/))) {
      const q = new URL(request.url).searchParams;
      const lt = /^\d+(\.\d+)?$/.test(q.get('lt') || '') ? q.get('lt') : '';
      const size = Math.min(20, Math.max(1, parseInt(q.get('size'), 10) || 10));
      const filter = /^\[constellation\][0-6]$/.test(q.get('filter') || '') ? q.get('filter') : '';
      const qs = `calculationId=${m[1]}&size=${size}&page=${lt ? 2 : 1}&sort=calculation.result&order=-1&variant=&filter=${encodeURIComponent(filter)}&p=${lt ? encodeURIComponent('lt|' + lt) : ''}`;
      res = await cached(ctx, `aklb/${m[1]}/${lt}/${size}/${encodeURIComponent(filter)}`, `https://akasha.cv/api/leaderboards?${qs}`, async () => 3600);
    } else if ((m = path.match(/^\/akasha-size\/([A-Za-z0-9_-]{1,128})\/?$/))) {
      res = await cached(ctx, `aksize/${m[1]}`, `https://akasha.cv/api/getCollectionSize?hash=${m[1]}&variant=charactersLb`, async () => 3600);
    } else {
      return new Response('Use /api/uid/<UID>/, /akasha/<UID>, /akasha-cats/<id>, /akasha-lb/<id>, /akasha-size/<hash>', { status: 404, headers: CORS });
    }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
    return out;
  },
};
