# g180m: first-row windows of gen:180 (python3 g180mClass.py gen) / body:DIG (dig) with the 5 engine cmds before each (needs t2k3 step.py + c-on/<seed>.json cmdtraces in the evidence dir)
import json,collections,sys
O='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k3/'
G='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/g180m/'
exec(open(O+'step.py').read().split("if __name__")[0])
which=sys.argv[1]
def out(cur):
    r=cur['r']; e=eng(r['seed'])
    cm=[c for c in e['cmds'] if c[0]<=r['ef']]
    # the engine cmd owning the first row: last cmd starting at or before ef
    prev=cm[-5:]
    desc=' | '.join(f"{c[3]}" + (":"+str(c[9]) if isinstance(c[9],str) else "") for c in prev)
    print(f"s{r['seed']} si{r['si']} rf{r['rf']} ef{r['ef']} step{r['step']:+d} mass{cur['mass']} rows{cur['rows']} romprev={r['prevc']} :: {desc}")
S=steps('on'); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
mine=(lambda c:c=='gen:180') if which=='gen' else (lambda c:c=='body:DIG')
cache={}
def eng(seed):
    if seed not in cache: cache[seed]=json.load(open(G+f'c-on/{seed}.json'))
    return cache[seed]
for k,l in sorted(seg.items()):
    cur=None
    for r in l:
        c=cause(r,'on')
        if r['step']!=0 or cur is None:
            if cur and cur['mine']: out(cur)
            cur=dict(r=r,mine=mine(c),mass=0,rows=0)
        cur['mass']+=abs(r['off']); cur['rows']+=1
    if cur and cur['mine']: out(cur)
