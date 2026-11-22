# g180m: first-turn windows of two-turn moves (Dig / Solar Beam / Fly / Bounce) with the previous ROM cause (needs t2k3 step.py)
import json,collections,sys
O='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/t2k3/'
exec(open(O+'step.py').read().split("if __name__")[0])
S=steps('on'); seg=collections.defaultdict(list)
for r in S: seg[(r['seed'],r['si'])].append(r)
TT={'FLY','BOUNCE','DIVE','SOLAR_BEAM','SKULL_BASH','RAZOR_WIND','SKY_ATTACK','DIG'}
for k,l in sorted(seg.items()):
    cur=None
    for r in l:
        c=cause(r,'on')
        if r['step']!=0 or cur is None:
            if cur and cur['tt']: print(cur['h'],cur['c'],'prev',cur['p'],'mass',cur['m'],'rows',cur['n'])
            cur=dict(h=f"s{r['seed']} si{r['si']} rf{r['rf']} step{r['step']:+d}",c=c,p=r['prevc'],tt=(c.startswith('body:') and c[5:] in TT),m=0,n=0)
        cur['m']+=abs(r['off']);cur['n']+=1
    if cur and cur['tt']: print(cur['h'],cur['c'],'prev',cur['p'],'mass',cur['m'],'rows',cur['n'])
