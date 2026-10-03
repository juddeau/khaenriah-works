"""Build index.html: inline character data and the build stamp into the template."""
import pathlib, subprocess, datetime
src = pathlib.Path(__file__).parent
root = src.parent
t = (src / 'template.html').read_text()
data = (src / 'gen_data.json').read_text()
sha = subprocess.run(['git', '-C', str(root), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip() or 'dev'
build = f"{datetime.datetime.utcnow():%d.%m.%Y %H:%M} UTC · {sha}"
proxy = (root / 'proxy' / 'url.txt').read_text().strip() if (root / 'proxy' / 'url.txt').exists() else ''
t = t.replace('/*PROXY*/', proxy).replace('/*BUILD*/', build).replace('/*DATA*/null', data)
head, body = t.split('</style>', 1)
html = ('<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head + '</style>\n</head><body>' + body + '\n</body></html>\n')
(root / 'index.html').write_text(html)
print(f'index.html: {len(html)} bytes')
