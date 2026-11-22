# t68m: per window (cause given) the last SE 5 (A press) before the first row on each side: ROM press -> row vs engine press -> row.
# usage: python3 t68mPress.py CAUSE   (t2k3 step.py + hse1m full probes for eng-cmd / snd)
import json,collections,sys,os
EV='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/'
exec(open(EV+'t2k3/step.py').read().split("if __name__")[0])
want=sys.argv[1]
S=steps('on'); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
cache={}
def load(seed):
    if seed not in cache:
        d=EV+'hse1m/p/on/%d-full.'%seed
        if not os.path.exists(d+'snd.json'): cache[seed]=None
        else: cache[seed]=([e['frame'] for e in json.load(open(d+'snd.json'))['events'] if e['kind']=='se' and e['id']==5],
                           [x[0] for x in json.load(open(d+'eng-cmd.json'))['sound'] if x[1]=='se' and x[2]==5])
    return cache[seed]
for k,l in sorted(seg.items()):
    cur=None
    for i,r in enumerate(l):
        if r['step']!=0 or cur is None:
            cur=r
            if cause(r,'on')==want:
                c=load(r['seed'])
                if not c: print('s%d si%d no probe'%(r['seed'],r['si'])); continue
                rp=[f for f in c[0] if f<=r['rf']]; ep=[f for f in c[1] if f<=r['ef']]
                if not rp or not ep: continue
                a=r['rf']-rp[-1]; b=r['ef']-ep[-1]
                print(f"s{r['seed']} si{r['si']} off{r['off']:+d} step{r['step']:+d} rows{sum(1 for x in l if x['rf']>=r['rf'])}: ROM press->row {a}  ENG press->row {b}  (ENG-ROM {b-a:+d}); press offset ENG-ROM {(r['ef']-b)-(r['rf']-a):+d}")
# second table: engine plan index.cmd of the command owning the first row, and press -> that command's start (ENG) 
if len(sys.argv)>2 and sys.argv[2]=='cmd':
    print('--- engine owning cmd')
    for k,l in sorted(seg.items()):
        cur=None
        for i,r in enumerate(l):
            if r['step']!=0 or cur is None:
                cur=r
                if cause(r,'on')==want:
                    c=load(r['seed'])
                    if not c: continue
                    cm=[x for x in json.load(open(EV+'hse1m/p/on/%d-full.eng-cmd.json'%r['seed']))['cmds'] if x[0]<=r['ef']]
                    ep=[f for f in c[1] if f<=r['ef']]
                    own=cm[-1]; prevm=[x for x in cm if x[3]=='message'][-1:]
                    print(f"s{r['seed']} si{r['si']} off{r['off']:+d} owning cmd {own[1]}.{own[2]} {own[3]} @press+{own[0]-ep[-1]}; last message cmd {prevm[0][1]}.{prevm[0][2]} @press+{prevm[0][0]-ep[-1] if prevm else '?'}; prev cmds {[x[3] for x in cm[-6:-1]]}")
