"""Extract the game tables the site needs from Genshin Optimizer (MIT, github.com/frzyc/genshin-optimizer).

Usage: python3 tools/extract_go.py <commit>
Downloads libs/gi/stats/src/allStat_gen.json and the artifact set sheets at that commit and writes src/go_stats.json:
  src  - repo and commit the numbers come from
  cv   - level curves (index = level, 1..100)
  ch   - characters: [[hpBase, hpCurve], [atkBase, atkCurve], [defBase, defCurve]], ascension bonuses per phase 0..6
  we   - weapons: rarity, base atk and curve, ascension atk, substat type/base/curve, static refinement bonuses
  am   - artifact main stat by rarity, stat and level (fractions for percent stats, as in the game)
  as   - artifact substat roll tiers by rarity
  s2   - 2-piece set bonuses that show on the character panel
"""
import json, re, sys, pathlib, urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = 'frzyc/genshin-optimizer'
commit = sys.argv[1]
raw = lambda p: urllib.request.urlopen(f'https://raw.githubusercontent.com/{REPO}/{commit}/{p}', timeout=60).read().decode()
d = json.loads(raw('libs/gi/stats/src/allStat_gen.json'))

PANEL = {'hp_', 'atk_', 'def_', 'eleMas', 'enerRech_', 'critRate_', 'critDMG_', 'heal_', 'physical_dmg_',
         'pyro_dmg_', 'hydro_dmg_', 'electro_dmg_', 'cryo_dmg_', 'anemo_dmg_', 'geo_dmg_', 'dendro_dmg_'}

cv = {**d['char']['expCurve'], **d['weapon']['expCurve']}
ch = {}
for k, c in d['char']['data'].items():
    lc = {x['key']: [x['base'], x['curve']] for x in c['lvlCurves']}
    ch[k] = {'el': c.get('ele'), 'r': c['rarity'], 'lv': [lc['hp'], lc['atk'], lc['def']], 'asc': c['ascensionBonus']}
we = {}
for k, w in d['weapon']['data'].items():
    ms, ss = w['mainStat'], w.get('subStat')
    we[k] = {'r': w['rarity'], 'atk': [ms['base'], ms['curve']], 'asc': w['ascensionBonus'].get('atk', []),
             'sub': [ss['type'], ss['base'], ss['curve']] if ss else None,
             'ref': {s: v for s, v in w['refinementBonus'].items() if s in PANEL}}

# 2-piece bonuses live in the set sheets as `const x = greaterEq(input.artSet.Key, 2, value)` used under premod
sets = [k for k, v in d['art']['data'].items() if 5 in v['rarities']]
def set2(k):
    s = re.sub(r'\s+', ' ', raw(f'libs/gi/sheets/src/Artifacts/{k}/index.tsx'))
    pm, res = s[s.find('premod: {'):][:600], {}
    for m in re.finditer(r'const (\w+) = greaterEq\( ?input\.artSet(?:\.\w+|\[key\]), ?2, ?(?:percent\()?(-?[\d.]+)', s):
        v, val = m.group(1), float(m.group(2))
        for m2 in re.finditer(r'(\w+): ?(?:sum\()?[\w, ]*?\b' + v + r'\b', pm): res[m2.group(1)] = val
        if v in PANEL and re.search(r'[{,] ?' + v + r' ?[,}]', pm): res[v] = val
    return k, {a: b for a, b in res.items() if a in PANEL}
with ThreadPoolExecutor(16) as ex: s2 = dict(ex.map(set2, sets))

out = {'src': {'repo': REPO, 'commit': commit}, 'cv': cv, 'ch': ch, 'we': we,
       'am': {r: d['art']['main'][r] for r in ('4', '5')}, 'as': {r: d['art']['sub'][r] for r in ('4', '5')}, 's2': s2}
p = pathlib.Path(__file__).parent.parent / 'src' / 'go_stats.json'
p.write_text(json.dumps(out, separators=(',', ':')))
print(f'{p}: {p.stat().st_size} bytes, {len(ch)} characters, {len(we)} weapons, {len(s2)} sets')
