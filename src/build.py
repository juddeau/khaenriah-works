"""Build index.html: inline character data, config catalogue and config files into the template."""
import json, re, pathlib
src = pathlib.Path(__file__).parent
root = src.parent
t = (src / 'template.html').read_text()
meta = (src / 'meta.js').read_text()
data = (src / 'gen_data.json').read_text()
files = {}
for f in re.findall(r"file:'([^']+)'", meta):
    s = (root / 'configs' / f).read_text()
    json.loads(s)
    files[f] = s
import subprocess, datetime
sha = subprocess.run(['git','-C',str(root),'rev-parse','--short','HEAD'],capture_output=True,text=True).stdout.strip() or 'dev'
build = f"{datetime.datetime.utcnow():%d.%m.%Y %H:%M} UTC · {sha}"
t = t.replace('/*BUILD*/', build).replace('/*DATA*/null', data).replace('/*FILES*/null', json.dumps(files, ensure_ascii=False)).replace('/*META*/', meta)
head, body = t.split('</style>', 1)
html = ('<!doctype html>\n<html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + head + '</style>\n</head><body>' + body + '\n</body></html>\n')
(root / 'index.html').write_text(html)
print(f'index.html: {len(html)} bytes, {len(files)} configs')
