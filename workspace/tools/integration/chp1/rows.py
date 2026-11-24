import json,subprocess,re,sys
D='.integration/evidence/chp1/p/on'; seed=sys.argv[1]
e=json.load(open(f'{D}/{seed}-on.eng-cmd.json'))
dec=[x for x in e['decisions'] if x.get('commitFrame') is not None]
for i,d in enumerate(dec):
    cm=[r for r in e['cmds'] if r[9] and 'CONFUSION' in str(r[9]) and d['commitFrame']<=r[0]<(dec[i+1]['commitFrame'] if i+1<len(dec) else 1e9)]
    if not cm: continue
    out=subprocess.run(['python3','tools/integration/hcr3mCmp.py',D,seed,'--decision',str(i),'--span','-40:1200'],capture_output=True,text=True).stdout.splitlines()
    rows=[]
    for l in out[1:]:
        m=re.match(r'\s*(-?\d+) (ROM|ENG)\s+(.*)',l)
        if m: rows.append((int(m[1]),m[2],m[3]))
    def first(pred):
        for f,s,t in rows:
            if pred(s,t): return f
    r0=first(lambda s,t:s=='ROM' and 'MoveUsedIsConfused+0x0' in t)
    r3=first(lambda s,t:s=='ROM' and 'MoveUsedIsConfused+0x3 ex2' in t)
    r3r=first(lambda s,t:s=='ROM' and 'MoveUsedIsConfused+0x3 ex0' in t)
    rc=first(lambda s,t:s=='ROM' and 'MoveUsedIsConfused+0xc ex2' in t)
    rce=first(lambda s,t:s=='ROM' and 'MoveUsedIsConfused+0xc ex0' in t)
    rse=first(lambda s,t:s=='ROM' and 'SE 176' in t)
    # engine cmds around the confusion status-animation
    ei=[k for k,(f,s,t) in enumerate(rows) if s=='ENG' and 'status-animation' in t and 'CONFUSION' in t]
    k=ei[0]; est=rows[k][0]; emin=re.search(r'min=(\d+)',rows[k][2])[1]
    # preceding engine cmds
    prev=[(f,t.split(' b')[0]) for f,s,t in rows[:k] if s=='ENG' and t.startswith('cmd')][-3:]
    ese=first(lambda s,t:s=='ENG' and 'SE 176' in t and True)
    # first ENG SE 176 after the est
    ese=[f for f,s,t in rows if s=='ENG' and 'SE 176' in t and f>=est]; ese=ese[0] if ese else None
    rse=[f for f,s,t in rows if s=='ROM' and 'SE 176' in t and (rc is None or f>=rc)]; rse=rse[0] if rse else None
    emsg=[f for f,s,t in rows[:k] if s=='ENG' and ' message ' in t][-1:]
    # what ROM did just before +0x0
    pre=[(f,t) for f,s,t in rows if s=='ROM' and r0 is not None and f<=r0][-3:]
    nxt=[(f,t) for f,s,t in rows if s=='ROM' and rce is not None and f>=rce][:1]
    print(f'd{i} commit ENG {d["commitFrame"]} | ROM +0x0 {r0} +0x3ex2 {r3} +0x3ex0 {r3r} +0xc ex2 {rc} ex0 {rce} SE176 {rse} | ENG msg {emsg} status {est} min {emin} SE176 {ese} | dstart ENG-ROM msg {None if r3 is None or not emsg else emsg[0]-r3} status {None if rc is None else est-rc} SE {None if rse is None or ese is None else ese-rse} | prevENG {prev} | ROMpre {[t.split()[0] for f,t in pre]} next {[t.split()[0] for f,t in nxt]}')
