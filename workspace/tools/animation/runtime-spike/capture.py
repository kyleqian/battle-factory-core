#!/usr/bin/env python3
"""Read-only, fresh local mGBA capture for the standalone scheduler experiment.
No remote oracle, state injection beyond existing legal MechanicLab fixtures,
or gameplay changes. Only compact animation observations are retained.
"""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
COMMON = Path(subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=ROOT, text=True).strip())
HARNESS = COMMON.parent
sys.path.insert(0, str(HARNESS / 'oracle'))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
KEEPALIVE = []  # libmgba teardown can segfault; retain cores until JSON is written.


def capture(fixture_path):
    fixture = json.loads((ROOT / fixture_path).read_text())
    request = validate_request(json.loads((ROOT / fixture['scenario']).read_text()), 'battle-scene-on')
    ref = (ROOT / 'reference/pokeemerald').resolve()
    oracle = EmeraldOracle(ref / 'pokeemerald.gba', ref / 'pokeemerald.map', HARNESS / 'oracle/bootstrap/factory.json')
    KEEPALIVE.append(oracle)
    lab = BattleLab(oracle, 'battle-scene-on')
    lab.prepare(request)
    output = subprocess.check_output(['arm-none-eabi-nm', '-a', str(ref / 'pokeemerald.elf')], text=True)
    names = {parts[2]: int(parts[0], 16) for line in output.splitlines() if len(parts := line.split()) == 3 and all(c in '0123456789abcdefABCDEF' for c in parts[0])}
    reverse = {address: name for name, address in names.items()}
    def u8(a): return oracle.read_u8(a)
    def u16(a): return u8(a) | u8(a+1) << 8
    def u32(a): return u16(a) | u16(a+2) << 16
    def s16(a): return (u16(a) + 32768) % 65536 - 32768
    def sprite(battler):
        slot = u8(names['gBattlerSpriteIds'] + battler)
        base = names['gSprites'] + slot * 0x44
        matrix = (u16(base+2) >> 9) & 31
        reserved = u8(u32(u32(names['gBattleSpritesDataPtr'])+4) + battler*12 + 6)
        species = u16(names['gAnimBattlerSpecies']+battler*2)
        coords = names['gMonBackPicCoords' if battler == 0 else 'gMonFrontPicCoords']
        return dict(slot=slot, reservedMatrixNum=reserved, reservedMatrix=[s16(names['gOamMatrices']+reserved*8+i) for i in (0,2,4,6)], pictureYOffset=u8(coords+species*4+1), x=s16(base+0x20), y=s16(base+0x22), x2=s16(base+0x24), y2=s16(base+0x26),
                    attr=[u16(base+i) for i in (0,2,4)], matrixNum=matrix,
                    matrix=[s16(names['gOamMatrices']+matrix*8+i) for i in (0,2,4,6)])
    def se_playing():
        statuses = [u32(names['gMPlayInfo_' + channel]+4) for channel in ('SE1', 'SE2')]
        return not all(status & 0x80000000 for status in statuses) and any(status & 0xffff for status in statuses)
    frames = []
    root = names['Move_' + fixture['move']]
    started = False
    def take(frame):
        nonlocal started
        active = u8(names['gAnimScriptActive'])
        pc = u32(names['sBattleAnimScriptPtr'])
        if not started:
            if not active or pc != root: return False
            started = True
        tasks = []
        for slot in range(16):
            base = names['gTasks'] + slot * 0x28
            if u8(base+4):
                tasks.append(dict(slot=slot, callback=reverse.get(u32(base)&~1, hex(u32(base))), priority=u8(base+7),
                                  prev=u8(base+5), next=u8(base+6), data=[s16(base+8+i*2) for i in range(16)]))
        row = dict(frame=frame, active=bool(active), pc=pc,
                   wait=(u8(names['sAnimFramesToWait'])+128)%256-128,
                   args=[s16(names['gBattleAnimArgs']+i*2) for i in range(8)],
                   visual=u8(names['gAnimVisualTaskCount']), sound=u8(names['gAnimSoundTaskCount']),
                   attacker=u8(names['gBattleAnimAttacker']), target=u8(names['gBattleAnimTarget']),
                   sprites=[sprite(i) for i in range(2)], tasks=tasks,
                   sePlaying=bool(se_playing()),
                   softwareOam=[[u16(names['gMain']+0x38+i*8+j) for j in (0,2,4)] for i in range(128)],
                   hardwareOam=[[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],
                   hardwareMatrices=[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)])
        frames.append(row)
        return not active
    frame=0
    done=take(frame)
    for segment in request['trace']['segments']:
        if done: break
        for _ in range(segment['frames']):
            oracle.advance(segment.get('buttons', []))
            frame+=1
            if take(frame):
                done=True
                break
    if not started or not done: raise RuntimeError(f'incomplete {fixture_path}: {len(frames)} rows')
    return dict(fixture=fixture_path, move=fixture['move'], frames=frames)

if __name__ == '__main__':
    if len(sys.argv)<3: raise SystemExit('capture.py output.json fixture.json [...]')
    cases=[]
    for fixture in sys.argv[2:]:
        case=capture(fixture)
        cases.append(case)
        print(f"{fixture}: {len(case['frames'])} rows", flush=True)
    Path(sys.argv[1]).write_text(json.dumps(dict(schema='animation-runtime-spike-observations/v1', cases=cases), separators=(',', ':'))+'\n')
