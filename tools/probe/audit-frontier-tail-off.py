#!/usr/bin/env python3
"""Read-only OFF battle-lab evidence for Lock On, Imprison, and Snatch."""
from __future__ import annotations
import json, sys
from pathlib import Path
if len(sys.argv) != 3: raise SystemExit(f"usage: {sys.argv[0]} SCENARIO.json OUTPUT.json")
SCENARIO_PATH, OUTPUT_PATH = map(Path, sys.argv[1:])
HERE = Path(__file__).resolve().parent; WORKTREE_ROOT = HERE.parent.parent
def harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file(): return candidate
    raise SystemExit("could not find harness oracle")
ORACLE_DIR = harness_root(WORKTREE_ROOT) / "oracle"; sys.path.insert(0, str(ORACLE_DIR))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
BATTLE_MON_SIZE=0x58; DISABLE_SIZE=0x18; DISABLE_SURE_HIT=0x15
STATUS3_ALWAYS_HITS=0x00000018; STATUS3_IMPRISONED=0x00002000; PROTECT_STEAL=1 << 5
SRANDCOUNT_ADDR=0x020249C0 # static src/random.c:5; not exported by the linker map
def main() -> None:
    raw=json.loads(SCENARIO_PATH.read_text())
    if raw.get("profile") != "battle-scene-off": raise ValueError("requires battle-scene-off")
    req=validate_request(raw,"battle-scene-off"); ref=(WORKTREE_ROOT/"reference"/"pokeemerald").resolve()
    oracle=EmeraldOracle(ref/"pokeemerald.gba",ref/"pokeemerald.map",ORACLE_DIR/"bootstrap"/"factory-battle-scene-off.json")
    BattleLab(oracle,"battle-scene-off").prepare(req); s=oracle.symbols
    def u16(a:int)->int:return oracle.read_u8(a)|(oracle.read_u8(a+1)<<8)
    def snap():
        mons=s["gBattleMons"]; dis=s["gDisableStructs"]; prot=s["gProtectStructs"]; st3=s["gStatuses3"]
        return {"randCount":oracle.read_u32(SRANDCOUNT_ADDR),"rngValue":oracle.read_u32(s["gRngValue"]),"currentMove":u16(s["gCurrentMove"]),"attacker":oracle.read_u8(s["gBattlerAttacker"]),"target":oracle.read_u8(s["gBattlerTarget"]),"effectBattler":oracle.read_u8(s["gEffectBattler"]),"scriptingBattler":oracle.read_u8(s["gBattleScripting"]),"turnOrder":[oracle.read_u8(s["gBattlerByTurnOrder"]+i) for i in range(2)],"status3":[oracle.read_u32(st3+4*i) for i in range(2)],"alwaysHits":[bool(oracle.read_u32(st3+4*i)&STATUS3_ALWAYS_HITS) for i in range(2)],"imprisoned":[bool(oracle.read_u32(st3+4*i)&STATUS3_IMPRISONED) for i in range(2)],"sureHitOwner":[oracle.read_u8(dis+DISABLE_SIZE*i+DISABLE_SURE_HIT) for i in range(2)],"stealMove":[bool(oracle.read_u32(prot+16*i)&PROTECT_STEAL) for i in range(2)],"pp":[[oracle.read_u8(mons+BATTLE_MON_SIZE*i+0x24+j) for j in range(4)] for i in range(2)],"hp":[u16(mons+BATTLE_MON_SIZE*i+0x28) for i in range(2)]}
    changes=[]; prior=None; tick=0
    def cap():
        nonlocal prior
        now=snap()
        if now!=prior: changes.append({"tick":tick,**now}); prior=now
    cap()
    for seg in req["trace"]["segments"]:
        for _ in range(int(seg["frames"])): oracle.advance(seg.get("buttons",[])); tick+=1; cap()
    OUTPUT_PATH.write_text(json.dumps({"profile":"battle-scene-off","scenario":SCENARIO_PATH.name,"readOnlyAfterConstruction":True,"totalFrames":tick,"transitions":changes},indent=2)+"\n")
main()
