#!/usr/bin/env python3
"""usage: affineTaskTimeline.py <scenario-name-prefix> <move-id> [summary.json]: per-frame matrix/task events of the first body of that move (age = frames since gAnimScriptActive rise)."""
import json,sys
S=json.load(open(sys.argv[3] if len(sys.argv)>3 else "tools/integration/fixtures/affine-task/summary.json"))
mv=int(sys.argv[2]); name=sys.argv[1]
for k,v in S.items():
    if not k.startswith(name) : continue
    for b in v['bodies']:
        if b['mv']!=mv: continue
        print('##',k,'rise',b['riseFrame'],'fall',b['fallFrame'],'end',b['end']['bitmap'],[(t[0],t[1]) for t in b['end']['tasks']])
        by={}
        for e in b['events']: by.setdefault(e[0]-b['riseFrame'],[]).append(e[1:])
        line=[]
        for f,es in by.items():
            line.append(f"@{f}:"+" ".join(f"{e[0]}{e[1]}"+(f"({e[2].replace('AnimTask_','').replace('_Step','')})" if len(e)>2 else '') for e in es))
        print('  '+' | '.join(line))
        break
