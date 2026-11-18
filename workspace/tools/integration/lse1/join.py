"""lse1 join: ROM windows (ram/lse1-<name>-player-on.json) vs the app hpd4Cmds timeline (app/lse1-<name>-player-on.txt); run from the evidence dir."""
import json,re,sys,glob
sys.path.insert(0,'.')
from an import analyze
names=sorted(re.sub(r'ram/lse1-(.*)-player-on.json',r'\1',p) for p in glob.glob('ram/*.json'))
for n in names:
    w=analyze(f'ram/lse1-{n}-player-on.json')
    app=[l.split(' ',2) for l in open(f'app/lse1-{n}-player-on.txt').read().splitlines()[1:]]
    cmds=[(int(a[0]),a[1],a[2] if len(a)>2 else "") for a in app]
    # first non-Toss move-animation command
    idx=[i for i,c in enumerate(cmds) if 'move-animation' in c[2] and 'move=' in c[2] and 'move=69 ' not in c[2]]
    if not idx: print(n,'NO BODY'); continue
    i=idx[0]; S=cmds[i][0]; E=cmds[i+1][0]; m=re.search(r'bodyLead=(\d+) pre=(\d+) idle=(\d+) live=(\d+) post=(\d+) tail=(\d+) tailRows=(\d+)',cmds[i][2]).groups()
    r=w[0]
    print(f"{n:11} R={r['R']} L={r['lead']} RtoA={r['RtoA']} len={r['len']} H={r['H']} gap={r['H']-(r['A']+r['len'])} RtoH={r['RtoH']} | app S={S} bl/pre/idle/live/post={'/'.join(m[:5])} tail={m[5]} tailRows={m[6]} E-S={E-S} next={cmds[i+1][2].split(' ')[0] if False else cmds[i+1][1]+' '+cmds[i+2][1] if i+2<len(cmds) else ''} d={r['RtoH']-(E-S)}")
print()
for n in names:
    w=analyze(f'ram/lse1-{n}-player-on.json')
    app=[l.split(' ',2) for l in open(f'app/lse1-{n}-player-on.txt').read().splitlines()[1:]]
    cmds=[(int(a[0]),a[1],a[2] if len(a)>2 else "") for a in app]
    body=[c for c in cmds if 'move=' in c[2] and 'move=69 ' not in c[2]]
    toss=[c for c in cmds if 'move=69 atk=1' in c[2]]
    tw=[x for x in w if x['len']==220]
    if body and toss and tw:
        Sb=body[0][0]; St=toss[0][0]; Rb=w[0]['R']; Rt=tw[0]['R']
        print(f"{n:11} ROM R->R'toss={Rt-Rb} app S->S'toss={St-Sb} delta(ROM-app)={(Rt-Rb)-(St-Sb)}")
    else: print(n,'no toss window',[ (x['R'],x['len']) for x in w])
