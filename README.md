# Khaenri'ah Works

Сайт с инструментами для Genshin Impact: профиль по UID (Enka.Network) или из экспорта Genshin Optimizer и готовые Custom Multi-target конфиги для GO под персонажей, созвездия и отряды.

- `configs/` — конфиги Custom Multi-target (JSON для Genshin Optimizer).
- `src/meta.js` — каталог конфигов: отряд, созвездия, ротация, предупреждения по переключателям GO.
- `src/template.html` — страница; `src/gen_data.json` — справочник персонажей из EnkaNetwork/API-docs.
- Сборка: `python3 src/build.py` → `index.html` (всё в одном файле, публикуется через GitHub Pages).
