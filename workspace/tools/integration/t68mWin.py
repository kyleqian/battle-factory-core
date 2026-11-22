# t68m: windows of one cause (gen:148 / body:ICE_BEAM / body:ROCK_SLIDE) with the previous row's cause + offset (inherited?) and the engine cmds before the first row.
# usage: python3 t68mWin.py CAUSE [--cmd DIR]   (needs t2k3 step.py; cmdtraces DIR/<seed>.json from soundCensusRomReplay --cmdtrace=1 optional)
import json,collections,sys,os
O='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k3/'
exec(open(O+'step.py').read().split("if __name__")[0])
want=sys.argv[1]; cdir=sys.argv[sys.argv.index('--cmd')+1] if '--cmd' in sys.argv else None
S=steps('on'); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
def eng(seed):
    p=f'{cdir}/{seed}.json'
    return json.load(open(p))['cmds'] if cdir and os.path.exists(p) else None
for k,l in sorted(seg.items()):
    wins=[];cur=None
    for i,r in enumerate(l):
        c=cause(r,'on')
        if r['step']!=0 or cur is None:
            cur=dict(i=i,r=r,c=c,mass=0,rows=0,prev=l[i-1] if i else None); wins.append(cur)
        cur['mass']+=abs(r['off']); cur['rows']+=1
    for w in wins:
        if w['c']!=want: continue
        r=w['r']; p=w['prev']
        pv=f"prev {cause(p,'on')} off{p['off']:+d}" if p else 'segment start'
        e=eng(r['seed']); d=''
        if e:
            cm=[c for c in e if c[0]<=r['ef']][-4:]
            d=' :: '+' | '.join(f"{c[3]}@{c[0]}" + (":"+str(c[9]) if isinstance(c[9],str) else "") for c in cm)
        print(f"s{r['seed']} si{r['si']} rf{r['rf']} ef{r['ef']} off{r['off']:+d} step{r['step']:+d} mass{w['mass']} rows{w['rows']} [{pv}]{d}")
