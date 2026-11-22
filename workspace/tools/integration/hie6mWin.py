# hie6m: print the ROM/engine rows (script labels, item exec, SEs, engine cmds with min=) around a decision's window from the hie6m probe files. usage: hie6mWin.py SEED DECISION LO HI (frames from each side's own commit)
import json,sys
H='/srv/pokebench/pokeemerald-factory-core/workspace/.integration/evidence/hie6m/p/'
seed=sys.argv[1]; dec=int(sys.argv[2]); lo=int(sys.argv[3]); hi=int(sys.argv[4])
rom=json.load(open(H+f'{seed}-on.rom.json')); drv=json.load(open(H+f'{seed}-on.drive.json'))['drive']
eng=json.load(open(H+f'{seed}-on.eng-cmd.json')); snd=json.load(open(H+f'{seed}-on.snd.json'))
rc=drv['anchors'][dec]['commitFrame']
ec=[x for x in eng['decisions'] if x.get('commitFrame') is not None][dec]['commitFrame']
L=[]
prev=0; last=None
for f,ptr,ex,anim,main,c0,h0,h1,mv,tp in rom['rows']:
    a=tp&0xff
    nm=rom['names'].get(hex(ptr),hex(ptr))
    if a and not prev: L.append((f-rc,'ROM print start '+nm))
    prev=a
    lab=nm.split('+')[0]
    if lab!=last: L.append((f-rc,'ROM label '+nm)); last=lab
    if ex==2 and ('ItemHeal' in nm or 'Berry' in nm and '+0x7' in nm): L.append((f-rc,'ROM item exec '+nm))
    if h1!=getattr(sys.modules[__name__],'_h',h1): L.append((f-rc,f'ROM hp {h0}/{h1}'))
    sys.modules[__name__]._h=h1
for e in snd['events']:
    if e['kind']=='se' and e['id'] in (152,228,102,15,16,13,12,14): L.append((e['frame']-rc,f"ROM SE {e['id']}"))
for r in eng['sound']:
    if r[1]=='se' and r[2] in (152,228,102,15,16,13,12,14): L.append((r[0]-ec,f"ENG SE {r[2]}"))
for r in eng['cmds']:
    if r[3] in ('message','hp','general-animation','hit-animation','faint','move-animation','stat','turn-end','status'): L.append((r[0]-ec,f"ENG cmd {r[1]}.{r[2]} {r[3]} b{r[4]} {r[5]}>{r[6]} {r[9] if r[3]=='general-animation' else ''} min={r[10]}"))
for f,t in sorted(L):
    if lo<=f<=hi: print(f,t)
