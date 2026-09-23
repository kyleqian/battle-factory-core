"""Capture complete source-script windows during a legal multi-move input trace.
Reads only: no battle state, palette, sprite, or outcome writes are performed.
"""
import hashlib, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HARNESS=next(p for p in (ROOT,*ROOT.parents) if (p/'oracle/emerald_core.py').is_file())
sys.path.insert(0,str(HARNESS/'oracle'))
from emerald_core import EmeraldOracle
from battle_lab import BattleLab,validate_request
ref=(ROOT/'reference/pokeemerald').resolve()
names={}
for line in subprocess.check_output(['arm-none-eabi-nm','-a',str(ref/'pokeemerald.elf')],text=True).splitlines():
 parts=line.split()
 if len(parts)==3:
  try:names[parts[2]]=int(parts[0],16)
  except ValueError:pass
oracle=EmeraldOracle(ref/'pokeemerald.gba',ref/'pokeemerald.map',HARNESS/'oracle/bootstrap/factory.json')
lab=BattleLab(oracle,'battle-scene-on')
request=validate_request(json.loads(Path(sys.argv[1]).read_text()),'battle-scene-on')
setup=lab.prepare(request)
rgb_dir=Path(sys.argv[3]);rgb_dir.mkdir(parents=True,exist_ok=True)
bounds={325:(names['Move_SHADOW_PUNCH'],names['Move_EXTRASENSORY']),108:(names['Move_SMOKESCREEN'],names['Move_CONVERSION'])}
windows=[];current=None;frame=0
def capture():
 global current
 pointer=oracle.read_u32(names['sBattleAnimScriptPtr'])
 active=bool(oracle.read_u8(names['gAnimScriptActive']))
 move=next((move for move,(start,end) in bounds.items() if start<=pointer<end),None)
 if current is None and active and move is not None:
  current={'moveId':move,'attacker':oracle.read_u8(names['gBattleAnimAttacker']),'target':oracle.read_u8(names['gBattleAnimTarget']),'initial':lab.snapshot(),'rows':[]}
  windows.append(current)
 if current is None:return
 rgb=oracle.screen_rgb()
 (rgb_dir/f'{frame:05d}.rgb').write_bytes(rgb)
 current['rows'].append({'frame':frame,'sha256':hashlib.sha256(rgb).hexdigest(),'scriptActive':active,'scriptPointer':pointer,'bldcnt':oracle.read_u8(0x04000050)|(oracle.read_u8(0x04000051)<<8),'bldy':oracle.read_u8(0x04000054),'controllerFlags':oracle.read_u32(names['gBattleControllerExecFlags'])})
 if not active and not (oracle.read_u32(names['gBattleControllerExecFlags']) & (1 << current['attacker'])):current=None
capture()
for segment in request['trace']['segments']:
 for _ in range(segment['frames']):
  oracle.advance(segment.get('buttons',[]));frame+=1;capture()
if current is not None:raise RuntimeError('trace ended before complete source cleanup')
Path(sys.argv[2]).write_text(json.dumps({'schema':'live-palette-framebuffer-source/v1','setup':setup,'windows':windows},separators=(',',':')))
print('complete source windows',[(w['moveId'],len(w['rows']),w['rows'][0]['frame'],w['rows'][-1]['frame']) for w in windows])
