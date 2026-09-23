"""Observe source tag/unfaded-RAM transitions during stock battle initialization and input.
This is verification only. It never supplies captured state to production.
Only palette changes are retained; this is not a framebuffer/timing claim.
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
 parts=line.split()
 if len(parts)==3:
  try:names[parts[2]]=int(parts[0],16)
  except ValueError:pass
oracle=EmeraldOracle(ref/'pokeemerald.gba',ref/'pokeemerald.map',HARNESS/'oracle/bootstrap/factory.json')
lab=BattleLab(oracle,'battle-scene-on')
def u16(a):return oracle.read_u8(a)|(oracle.read_u8(a+1)<<8)
def words(a,n):return [u16(a+i*2) for i in range(n)]
rows=[];tick=0;last=None
move_events=[];last_move_active=False
include_move_events='--move-events' in sys.argv[3:]
def capture(phase):
 global last, last_move_active
 if include_move_events:
  active=bool(oracle.read_u8(names['gAnimScriptActive']))
  if active and not last_move_active and phase=='move':
   move_id=u16(names['sAnimMoveIndex'])
   if move_id:move_events.append({'tick':tick,'moveId':move_id,'attacker':oracle.read_u8(names['gBattleAnimAttacker'])})
  last_move_active=active
 tags=words(names['sSpritePaletteTags'],16)
 unfaded=words(names['gPlttBufferUnfaded']+256*2,256)
 key=(tags,unfaded)
 if last!=key:
  rows.append({'tick':tick,'phase':phase,'reserved':oracle.read_u8(names['gReservedSpritePaletteCount']),'tags':tags,'unfadedObj':unfaded,'fadedObj':words(names['gPlttBufferFaded']+256*2,256),'currentMove':u16(names['gCurrentMove'])})
  last=key
phase='prepare'
original=oracle.advance
def advance(buttons):
 global tick
 original(buttons);tick+=1;capture(phase)
oracle.advance=advance
request=validate_request(json.loads(Path(sys.argv[1]).read_text()),'battle-scene-on')
setup=lab.prepare(request)
capture('ready')
phase='move'
for segment in request['trace']['segments']:
 for _ in range(segment['frames']):oracle.advance(segment.get('buttons',[]))
Path(sys.argv[2]).write_text(json.dumps({'setup':setup,'rows':rows,**({'moveEvents':move_events} if include_move_events else {})},separators=(',',':')))
print('palette change rows',len(rows),'ticks',tick)
