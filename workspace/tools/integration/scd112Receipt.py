#!/usr/bin/env python3
"""scd112 (S10A, ISSUES #166 slice d): assemble tools/integration/fixtures/scd112-live-receipt.json from a scd112Run.sh run dir.

  python3 tools/integration/scd112Receipt.py <run-dir> <out.json>
<run-dir>/compare.json (+ compare-tracker-growl-zeroed.json, compare-neg-*.json), route-delta.json, census-delta.json (optional).
The delta check reads the committed stat101 receipts (playanimation -> next instruction rows, first screen change after E).
"""
import json, os, sys

run, out = sys.argv[1], sys.argv[2]
load = lambda name: json.load(open(os.path.join(run, name)))
stat101 = json.load(open('tools/integration/fixtures/stat101/receipts/stat-anim.json'))
cmp = load('compare.json')

def window_rows():
    for key, v in cmp.items():
        if key == 'summary':
            continue
        yield key, v

# delta check: (1) the ROM's launch -> next instruction span == addedRows + 1 on every window (the command's frames are the added
# rows rel 1 .. E+1); (2) through production at a == rel - 1 the boundary rows outside the message band are 0 px: rel -1 / 0 (the
# previous command), E+2 (the next command's first frame: the elevated shadow is back on both sides of the command); (3) the
# print path's next message prints its first glyph on its first frame (rel E+2) while the ROM's box changes on E+3.
delta = {'spans': {}, 'boundary': {}}
for scen, v in stat101.items():
    if v['index']['expectedAnimArg'] is None:
        continue
    for scene in ('on', 'off'):
        w = v[scene]['windows'][0]
        delta['spans'][f'{scen}-{scene}'] = {'span': w['script']['span'], 'E': w['E'] - w['A'],
                                             'firstScreenChangeAfterE': w['script']['firstScreenChangeAfterE']}
for key, v in window_rows():
    pm = {r[0]: r for r in v['perRowMismatches']}
    E = v['reducer']['endRel']
    delta['boundary'][key] = {'path': v['path'], 'rel-1': pm.get(-1, [0, 0, 0])[2], 'rel0': pm.get(0, [0, 0, 0])[2],
                              'nextFirstRowOutsideBox': v['nextCommandRows'][0]['outsideBoxPx'],
                              'nextFirstRowBoxBand': v['nextCommandRows'][0]['boxPx']}
delta['spansEqualAddedRowsPlusOne'] = all(s['span'] == (s['E'] + 2) for s in delta['spans'].values())
delta['boundaryOutsideBoxZero'] = all(b['rel-1'] == 0 and b['rel0'] == 0 and b['nextFirstRowOutsideBox'] == 0 for b in delta['boundary'].values())
delta['printPathNextGlyphOneRowEarly'] = sorted(k for k, b in delta['boundary'].items() if b['path'] == 'print' and b['nextFirstRowBoxBand'] > 0)

experiments = {}
for name in sorted(os.listdir(run)):
    if name.startswith('compare-') and name.endswith('.json'):
        e = json.load(open(os.path.join(run, name)))
        experiments[name[8:-5]] = {'summary': e['summary'],
                                   'nonZeroWindows': {k: {'rect': w['rect']['px'], 'fullScreen': w['fullScreen']['px']}
                                                      for k, w in e.items() if k != 'summary' and not w['zeroPx']}}
receipt = {
    'schema': 'scd112-live-receipt/v1',
    'base': '1cfac3f7f',
    'frameMapping': 'stats-change command age a == statsChangeRow rel a + 1',
    'deltaCheck': delta,
    'productionCompare': cmp,
    'experiments': experiments,
    'routes': load('route-delta.json'),
    'census': load('census-delta.json') if os.path.exists(os.path.join(run, 'census-delta.json')) else None,
}
json.dump(receipt, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
print('receipt', out, 'windows', cmp['summary'], 'routes', receipt['routes']['summary'])
