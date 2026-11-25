import sys,os,collections
# usage: T2K4_DIR=DIR detail.py SCENE [TOPN]  -> per mechanism class (t2k10/classes.py windows): mass split by |step| bucket (<=2 = D4 / VBlank-phase size, 3-5, >5) x clean/carried,
# seed concentration, per-move (window-starting body) mass and the top windows. Needs attr-{on,off}.json.
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','t2k10'))
import classes as C
sc=sys.argv[1]; N=int(sys.argv[2]) if len(sys.argv)>2 else 12
W=[w for w in C.windows(sc) if w['cls']!='00 exact-start']
tot=sum(w['mass'] for w in W)
def b(w):
    s=abs(w['step']); return '<=2' if s<=2 else '3-5' if s<=5 else '>5'
for k in sorted({w['cls'] for w in W},key=lambda k:-sum(w['mass'] for w in W if w['cls']==k)):
    l=[w for w in W if w['cls']==k]; m=sum(w['mass'] for w in l)
    print(f"\n### {k} [{sc}] mass {m} ({100*m/tot:.0f}%) windows {len(l)}")
    for bk in ('<=2','3-5','>5'):
        x=[w for w in l if b(w)==bk]; cm=sum(w['mass'] for w in x if w['prev']==0)
        print(f"  |step| {bk:4}: mass {sum(w['mass'] for w in x):5} win {len(x):3} clean {cm:5} carried {sum(w['mass'] for w in x)-cm:5}")
    sd=collections.Counter()
    for w in l: sd[w['seed']]+=w['mass']
    print("  seeds:",' '.join(f"s{s}:{v}" for s,v in sd.most_common(8)))
    mv=collections.defaultdict(lambda:[0,0,[]])
    for w in l:
        key=w['cause']; mv[key][0]+=w['mass']; mv[key][1]+=1; mv[key][2].append(w['step'])
    print("  by cause:",'; '.join(f"{c} {v[0]}/{v[1]} steps{sorted(v[2])[:8]}" for c,v in sorted(mv.items(),key=lambda kv:-kv[1][0])[:10]))
    for w in sorted(l,key=lambda w:-w['mass'])[:N]:
        print(f"     s{w['seed']} d{w['d']} step{w['step']:+d} prev{w['prev']:+d} rows{w['rows']} mass{w['mass']} {w['cause']} mv={w['mv']} ecmd={w['ecmd']} prevc={w['prevc']}")
