#!/usr/bin/env python3
"""rollout/endeavor prep: direct-mGBA (Scene ON, fresh process) probe.
usage: rolloutEndeavorProbe.py <scenario.json> <output.json>   (workspace root, mgba venv; see rolloutEndeavorProbes.sh)
Records per animation body (gAnimScriptActive/sAnimMoveIndex): activation + end frames, gDisableStructs[b].rolloutTimer/StartValue (byte +0x11 of a 0x1c-stride array),
status2, gAnimMovePower / gBattleMovePower / gDynamicBasePower, gAnimDisableStructPtr, the rollout animation's two counter formulas
(rock: start-timer, ice: start-timer-1; battle_anim_rock.c:759, battle_anim_ice.c:1540/1613).
Every WRITE to gBattleMovePower (value-independent): the frame is flagged with a sentinel (0xFFFF written before each frame, restored if untouched), the flagged frame is
re-run single-stepped from a saved state, recording each CalculateBaseDamage entry (lr = caller) and the post-write value.  The sentinel perturbs nothing read by the
ROM outside CalculateBaseDamage/attackanimation; --nosentinel gives the unperturbed value-change log for cross-checking."""
import json, subprocess, sys
from pathlib import Path
args = [a for a in sys.argv[1:] if not a.startswith("--")]
NOSENT = "--nosentinel" in sys.argv
SCEN, OUT = map(Path, args[:2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
from mgba import ffi
ref = ROOT / "reference" / "pokeemerald"
_d = json.loads(SCEN.read_text()); _d["profile"] = "battle-scene-on"
req = validate_request(_d, "battle-scene-on")
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
lab = BattleLab(o, "battle-scene-on"); lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
sym = {}; funcs = []
for l in nm.splitlines():
    p = l.split()
    if len(p) == 3:
        sym[p[2]] = int(p[0], 16)
        if p[1] in "tT": funcs.append((int(p[0], 16), p[2]))
funcs.sort()
def fname(a):
    best = None
    for fa, n in funcs:
        if fa <= a: best = (fa, n)
        else: break
    return f"{best[1]}+0x{a - best[0]:x}" if best else hex(a)
u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
core = o.core
BMP = sym["gBattleMovePower"]; CBD = sym["CalculateBaseDamage"] & ~1
SENT = 0xFFFF
def wr16(a, v): core.memory.u8.raw_write(a, v & 0xff); core.memory.u8.raw_write(a + 1, v >> 8)
def ds(b):
    byte = u8(sym["gDisableStructs"] + 0x1c * b + 0x11)
    return {"rolloutTimer": byte & 15, "rolloutTimerStartValue": byte >> 4}
def snap():
    d = {"gAnimMovePower": u16(sym["gAnimMovePower"]), "gBattleMovePower": u16(BMP), "gDynamicBasePower": u16(sym["gDynamicBasePower"]),
         "currentMove": u16(sym["gCurrentMove"]), "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]),
         "animAttacker": u8(sym["gBattleAnimAttacker"]), "animDisablePtr": u32(sym["gAnimDisableStructPtr"]), "animTurn": u8(sym["gBattleScripting"] + 24),
         "status2": [u32(sym["gBattleMons"] + 0x58 * b + 0x50) for b in (0, 1)], "ds": [ds(0), ds(1)], "gDisableStructsBase": sym["gDisableStructs"],
         "mons": [{"species": u16(sym["gBattleMons"] + 0x58 * b), "hp": u16(sym["gBattleMons"] + 0x58 * b + 0x28)} for b in (0, 1)]}
    return d
def enrich(d):
    a = d["animAttacker"]
    st = d["ds"][a]; d["counterRock"] = st["rolloutTimerStartValue"] - st["rolloutTimer"]; d["counterIce"] = d["counterRock"] - 1
    d["animDisablePtrIsAttackerSlot"] = d["animDisablePtr"] == d["gDisableStructsBase"] + 0x1c * a
    pb = u8(d["animDisablePtr"] + 0x11); d["animPtrRollout"] = {"rolloutTimer": pb & 15, "rolloutTimerStartValue": pb >> 4}  # what the animation script actually reads (buffer copy)
    d["animPtrCounterRock"] = d["animPtrRollout"]["rolloutTimerStartValue"] - d["animPtrRollout"]["rolloutTimer"]
    d["defenseCurl"] = bool(d["status2"][a] & (1 << 30))  # STATUS2_DEFENSE_CURL = 1<<30
    return d
bodies, writes, changes = [], [], []
cur = None; prevp = None; f = 0
def step_obs():
    global cur, prevp
    a, m = bool(u8(sym["gAnimScriptActive"])), u16(sym["sAnimMoveIndex"])
    p = (u16(BMP), u16(sym["gDynamicBasePower"]), u16(sym["gAnimMovePower"]))
    if p != prevp and not (not NOSENT and p[0] == SENT):
        changes.append({"f": f, "gBattleMovePower": p[0], "gDynamicBasePower": p[1], "gAnimMovePower": p[2], "currentMove": u16(sym["gCurrentMove"]), "animActive": a}); prevp = p
    if cur is None and a:
        cur = {"move": m, "start": f, "end": None, "atActivation": enrich(snap())}; bodies.append(cur)
    elif cur is not None and (not a or cur["move"] != m):
        cur["end"] = f; cur = None
        if a: cur = {"move": m, "start": f, "end": None, "atActivation": enrich(snap())}; bodies.append(cur)
step_obs()
def stepthrough(buttons):
    """single-step one frame from the restored state; record CBD entries + the write"""
    o._set_buttons(buttons); fc = core.frame_counter; entries = []; wrote = None; n = 0
    while core.frame_counter == fc:
        pc = core.cpu.pc
        if pc == CBD + 2 or pc == CBD: entries.append({"lr": core.cpu.lr & ~1, "caller": fname(core.cpu.lr & ~1), "currentMove": u16(sym["gCurrentMove"]),
                                                       "attacker": u8(sym["gBattlerAttacker"]), "target": u8(sym["gBattlerTarget"]), "gDynamicBasePower": u16(sym["gDynamicBasePower"]), "dynamicMoveType": u8(sym["gBattleStruct"] and 0) })
        core.step(); n += 1
        v = u16(BMP)
        if wrote is None and v != SENT: wrote = {"stepPc": fname(core.cpu.pc), "firstValue": v}
    return entries, wrote
for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]):
        btn = seg.get("buttons", [])
        if NOSENT:
            o.advance(btn); f += 1; step_obs(); continue
        before = u16(BMP); st0 = bytes(ffi.buffer(core.save_raw_state()))
        o.advance(btn); st1 = bytes(ffi.buffer(core.save_raw_state())); after = u16(BMP)   # the REAL (unperturbed) frame
        core.load_raw_state(st0); wr16(BMP, SENT); o._set_buttons(btn); core.run_frame()    # throwaway replay with the sentinel: was the register written at all?
        wrote_any = u16(BMP) != SENT
        if wrote_any:
            core.load_raw_state(st0); wr16(BMP, SENT)
            entries, wrote = stepthrough(btn)
            writes.append({"f": f + 1, "before": before, "after": after, "valueChanged": after != before, "currentMoveAfter": u16(sym["gCurrentMove"]) if False else None, "entries": entries, "firstWrite": wrote})
        core.load_raw_state(st1)
        f += 1; step_obs()
OUT.write_text(json.dumps({"scenario": SCEN.name, "nosentinel": NOSENT, "frames": f, "bodies": bodies, "bmpWrites": writes, "powerChanges": changes}, separators=(",", ":")))
