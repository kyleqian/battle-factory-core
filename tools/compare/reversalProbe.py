#!/usr/bin/env python3
"""Complete Scene-ON source/hardware/audio receipts for MOVE_REVERSAL."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4: raise SystemExit("usage: reversalProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:]); ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request # noqa
from emerald_core import EmeraldOracle # noqa
MOVE = 179

def main():
  request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
  ref = (ROOT / "reference" / "pokeemerald").resolve(); o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
  lab = BattleLab(o, "battle-scene-on"); setup = lab.prepare(request)
  nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
  pairs=[]
  for line in nm.splitlines():
    parts=line.split()
    if len(parts)==3 and all(c in '0123456789abcdefABCDEF' for c in parts[0]): pairs.append((int(parts[0],16),parts[2]))
  names={n:a for a,n in pairs}; by={a:n for a,n in pairs}; sy=o.symbols; sprites, matrices, tasks=sy['gSprites'],sy['gOamMatrices'],sy['gTasks']; active, ptr=names['gAnimScriptActive'],names['sBattleAnimScriptPtr']; start,end=names['Move_REVERSAL'],names['Move_PURSUIT']; tags=names['sSpritePaletteTags']; RGB.mkdir(parents=True,exist_ok=True)
  u16=lambda a:o.read_u8(a)|(o.read_u8(a+1)<<8); u32=lambda a:u16(a)|(u16(a+2)<<16)
  def s16(a):
    value=u16(a); return value-0x10000 if value>=0x8000 else value
  def s8(a):
    value=o.read_u8(a); return value-0x100 if value>=0x80 else value
  raw=lambda a,n:''.join(f'{o.read_u8(a+i):02x}' for i in range(n)); ident=lambda a:{'address':a,'symbol':by.get(a&~1)}
  def sprite(i):
    b=sprites+i*0x44;m=(u16(b+2)>>9)&31; q=matrices+m*8
    return {'slot':i,'raw':raw(b,0x44),'template':ident(u32(b+0x14)),'callback':ident(u32(b+0x1c)),'attr':[u16(b+j) for j in (0,2,4)],'matrixNum':m,'matrix':[s16(q+j) for j in (0,2,4,6)],'data':[s16(b+0x2e+j*2) for j in range(8)]}
  def player(n):
    i,t=sy[f'gMPlayInfo_{n}'],sy[f'gMPlayTrack_{n}'];return {'rawInfo':raw(i,0x40),'songHeader':u32(i),'status':u32(i+4),'tracks':[{'flags':o.read_u8(t+j*0x50),'panX':s8(t+j*0x50+0x15),'raw':raw(t+j*0x50,0x50)} for j in range(3)]}
  rows=[]; frame=0
  def take():
    if lab.snapshot()['engine']['currentMove'] != MOVE:return
    rgb=o.screen_rgb();(RGB/f'{frame:05d}.rgb').write_bytes(rgb); p=u32(ptr)
    live=[sprite(i) for i in range(64) if o.read_u8(sprites+i*0x44+0x3e)&1]; livetasks=[{'slot':i,'raw':raw(b,0x28),'func':ident(u32(b)),'data':[s16(b+8+j*2) for j in range(16)]} for i in range(16) if o.read_u8((b:=tasks+i*0x28)+4)]
    rows.append({'frame':frame,'sha256':hashlib.sha256(rgb).hexdigest(),'gAnimScriptActive':o.read_u8(active),'script':ident(p),'scriptOffset':p-start if start<=p<end else None,'visualTaskCount':o.read_u8(sy['gAnimVisualTaskCount']),'soundTaskCount':o.read_u8(sy['gAnimSoundTaskCount']),'tasks':livetasks,'sprites':live,'hardwareOam':[raw(0x07000000+i*8,8) for i in range(128)],'hardwareMatrices':[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],'fadedPalette':[u16(sy['gPlttBufferFaded']+i*2) for i in range(512)],'unfadedPalette':[u16(sy['gPlttBufferUnfaded']+i*2) for i in range(512)],'hardwarePalette':[u16(0x05000000+i*2) for i in range(512)],'paletteTags':[u16(tags+i*2) for i in range(16)],'registers':{n:u16(a) for n,a in {'dispcnt':0x04000000,'bldcnt':0x04000050,'bldalpha':0x04000052,'bldy':0x04000054,'winin':0x04000048,'winout':0x0400004A}.items()},'se1':player('SE1'),'se2':player('SE2')})
  take()
  for seg in request['trace']['segments']:
    for _ in range(seg['frames']): o.advance(seg.get('buttons',[]));frame+=1;take()
  first=next((i for i,r in enumerate(rows) if r['gAnimScriptActive'] and r['scriptOffset'] is not None),None)
  if first is None:raise RuntimeError('Reversal source pointer was not observable')
  last=next((i for i in range(first+1,len(rows)) if not rows[i]['gAnimScriptActive']),None)
  if last is None:raise RuntimeError('Reversal first inactive cleanup was not captured')
  source=rows[first:last+1];top={'tasks':sorted({x['func']['symbol'] for r in source for x in r['tasks'] if x['func']['symbol']}),'templates':sorted({x['template']['symbol'] for r in source for x in r['sprites'] if x['template']['symbol']}),'callbacks':sorted({x['callback']['symbol'] for r in source for x in r['sprites'] if x['callback']['symbol']})}
  needed={'gReversalOrbSpriteTemplate','gHorizontalLungeSpriteTemplate','gFistFootSpriteTemplate','gBasicHitSplatSpriteTemplate'}
  if not needed <= set(top['templates']) or sum(x['template']['symbol']=='gReversalOrbSpriteTemplate' for r in source for x in r['sprites']) < 6: raise RuntimeError(f'incomplete Reversal topology: {top}')
  OUTPUT.write_text(json.dumps({'schema':'reversal-dense-evidence/v1','setup':setup,'captureWindow':{'startFrame':rows[0]['frame'],'endFrame':rows[-1]['frame'],'frameCount':len(rows)},'sourceWindow':{'startFrame':source[0]['frame'],'endFrame':source[-1]['frame'],'frameCount':len(source)},'sourceSymbols':{'Move_REVERSAL':start,'Move_PURSUIT':end},'topology':top,'frames':source},separators=(',',':'))+'\n');print(f'wrote {OUTPUT}: source {source[0]["frame"]}..{source[-1]["frame"]} ({len(source)} frames)')
main()
