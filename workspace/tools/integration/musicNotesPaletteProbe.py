"""Read source musical-note palette allocations through script cleanup.
Complete legal parties and ordinary controller input; no state writes.
"""
import json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HARNESS=next(p for p in (ROOT,*ROOT.parents) if (p/'oracle/emerald_core.py').is_file())
sys.path.insert(0,str(HARNESS/'oracle'))
from emerald_core import EmeraldOracle
from battle_lab import BattleLab,validate_request
ref=(ROOT/'reference/pokeemerald').resolve()
names={}
for line in subprocess.check_output(['arm-none-eabi-nm','-a',str(ref/'pokeemerald.elf')],text=True).splitlines():
 p=line.split()
 if len(p)==3:
  try:names[p[2]]=int(p[0],16)
  except ValueError:pass
oracle=EmeraldOracle(ref/'pokeemerald.gba',ref/'pokeemerald.map',HARNESS/'oracle/bootstrap/factory.json')
lab=BattleLab(oracle,'battle-scene-on')
scenario,output,move_id=sys.argv[1:];move_id=int(move_id)
request=validate_request(json.loads(Path(scenario).read_text()),'battle-scene-on')
setup=lab.prepare(request)
def u16(a):return oracle.read_u8(a)|(oracle.read_u8(a+1)<<8)
def words(a,n):return [u16(a+i*2) for i in range(n)]
def snapshot(frame):
 return {'frame':frame,'tags':words(names['sSpritePaletteTags'],16),
         'unfaded':words(names['gPlttBufferUnfaded']+256*2,256),
         'faded':words(names['gPlttBufferFaded']+256*2,256),
         'scriptActive':oracle.read_u8(names['gAnimScriptActive'])}
data=json.loads((ROOT/'src/data/gen/live-animation-palette-resources.json').read_text())
rainbow_tags=[r['tag'] for r in data['rainbowNotes']]
first=None;rainbow=None;cleanup=None;frame=0
for segment in request['trace']['segments']:
 for _ in range(segment['frames']):
  oracle.advance(segment.get('buttons',[]));frame+=1
  active=oracle.read_u8(names['gAnimScriptActive'])
  if first is None:
   if not active or u16(names['sAnimMoveIndex'])!=move_id:continue
   first=snapshot(frame)
  current=snapshot(frame)
  if rainbow is None and all(t in current['tags'] for t in rainbow_tags):rainbow=current
  if not active:cleanup=current;break
 if cleanup is not None:break
assert first is not None,('move not observed',move_id)
assert rainbow is not None,('rainbow tags not observed',move_id)
assert cleanup is not None,('cleanup not observed',move_id)
Path(output).write_text(json.dumps({'moveId':move_id,'first':first,'rainbow':rainbow,'cleanup':cleanup},separators=(',',':')))
print('source music note palettes',move_id,first['frame'],rainbow['frame'],cleanup['frame'])
