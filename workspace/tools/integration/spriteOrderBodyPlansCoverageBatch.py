#!/usr/bin/env python3
"""Single-run event-probe sweep of LIVE_MOVE_ANIMATION_IDS that the allocator net-zero manifests (and therefore the 221-scenario
extra batch) do not cover, from the stock BattleLab scenarios tools/battle-lab/mechanic-<move>-(player|opponent)-*.json.
usage (from workspace/, mGBA venv as in docs/sprite-order-provider-design.md s5): spriteOrderBodyPlansCoverageBatch.py [dir=/tmp/ev-live]
optional 2nd arg `ids`: comma list of extra move ids (e.g. the order-dependent adapters 52,215,195,348,82) matched by the relaxed
glob mechanic-<move>-*.json (no -off/-delayed/-success/-repeat variants), side from the scenario overrides.
then: spriteOrderBodyPlans.py --extra /tmp/ev-extra,/tmp/ev-live --write.  Direct in-process mGBA only (no HTTP oracle)."""
import re, subprocess, sys, glob, os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, 'tools/integration')
import spriteOrderBodyPlans as P
import spriteOrderBatch as B
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/ev-live'); OUT.mkdir(exist_ok=True)
names = {int(v): n for n, v in re.findall(r'#define MOVE_(\w+)\s+(\d+)', open('reference/pokeemerald/include/constants/moves.h').read())}
have = {int(m) for m, _ in B.jobs()}
force = {int(x) for x in sys.argv[2].split(',')} if len(sys.argv) > 2 else set()
jobs = []
for mid in sorted(set(P.live_ids()) | force):
    if (mid in have and mid not in force) or mid not in names:
        continue
    slug = names[mid].lower().replace('_', '-')
    for f in sorted(glob.glob(f'tools/battle-lab/mechanic-{slug}-*.json')):
        b = os.path.basename(f)
        if re.match(rf'mechanic-{re.escape(slug)}-(player|opponent)-', b) or (mid in force and not re.search(r'-(off|delayed-hit-off|success|repeat|dense|stomp)', b)):
            jobs.append((mid, f))
def run(j):
    mid, sc = j
    subprocess.run([sys.executable, 'tools/compare/spriteOrderEventProbe.py', str(mid), sc, str(OUT) + f'/{mid}-{Path(sc).stem}-0.json'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, jobs))
print(len(jobs), 'scenarios,', len(list(OUT.glob('*-0.json'))), 'rows written')
