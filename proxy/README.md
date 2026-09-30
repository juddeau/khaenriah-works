# Посредник для Enka (Cloudflare Worker)

Браузер не даёт сайту на GitHub Pages напрямую читать ответ Enka.Network. Этот Worker делает запрос к Enka сам и отдаёт ответ сайту. Он пересылает только запросы вида `/api/uid/<UID>/`, отвечает только сайту `juddeau.github.io` и кэширует ответы, чтобы не нагружать Enka. Бесплатного тарифа Cloudflare хватает.

1. Зарегистрируйся на dash.cloudflare.com.
2. Слева Compute (Workers) → Workers & Pages → Create → Create Worker (Start with Hello World), имя `enka-proxy`, Deploy.
3. Edit code → удали весь код и вставь содержимое `worker.js` → Deploy.
4. Скопируй адрес вида `https://enka-proxy.<имя>.workers.dev` и пришли Claude. Он запишет его в `proxy/url.txt`, и сайт начнёт грузить UID сам.
