#!/usr/bin/env python3
"""Reversal target-shake probe (Scene ON, direct mGBA).

usage: reversalShakeProbe.py <orientation: player|opponent> <turns> <output.json>

Builds a legal mechanicLab request from tools/battle-lab/mechanic-reversal-hp-bands-off.json
(Raticate Super Fang x4 halves the Reversal user's real HP each turn; no HP injection).
orientation=player: the player lead (Yanma) uses Reversal; =opponent: roles mirrored
(opponent lead Yanma uses Reversal x4 slots, player lead Raticate uses Super Fang).
Per frame it samples gAnimScriptActive, sAnimMoveIndex, gAnimMovePower, gAnimMoveDmg and the
target battler sprite x2/y2; per Reversal body it stores the rows activation-1 .. cleanup+2.
"""
from __future__ import annotations
import copy, hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
ORIENT, TURNS, OUTPUT = sys.argv[1], int(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402
MOVE = 179
BASE = ROOT / "tools/battle-lab/mechanic-reversal-hp-bands-off.json"


def build() -> dict:
    r = json.loads(BASE.read_text())
    r["profile"] = "battle-scene-on"
    P = r["overrides"]["parties"]
    import os
    if os.environ.get("REVERSAL_TARGET_SPECIES"):
        P["opponent"][0].update(species=int(os.environ["REVERSAL_TARGET_SPECIES"]), gender=os.environ.get("REVERSAL_TARGET_GENDER", "female"))
    if ORIENT == "opponent":
        # mirror: opponent lead = Yanma w/ Reversal x4 (identical slots); player lead = Raticate Super Fang
        yanma, rat = copy.deepcopy(P["player"][0]), copy.deepcopy(P["opponent"][0])
        yanma["moves"] = [179, 179, 179, 179]
        rat["moves"] = [162, 33, 98, 104]
        P["player"][0], P["opponent"][0] = rat, yanma
        P["player"][0]["moves"] = [162, 33, 98, 104]
    segs = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
    for t in range(TURNS):
        segs += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
                 {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
    r["trace"] = {"segments": segs, "captureFrames": [0]}
    return r


def main() -> None:
    req = validate_request(build(), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(o, "battle-scene-on")
    lab.prepare(req)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    S = {p[2]: int(p[0], 16) for p in (l.split() for l in nm.splitlines()) if len(p) == 3}
    u8, u32 = o.read_u8, o.read_u32
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    s32 = lambda a: u32(a) - (1 << 32) if u32(a) >= 1 << 31 else u32(a)
    tgt = 1 if ORIENT == "player" else 0
    rows = []
    def cap(f):
        sid = u8(S["gBattlerSpriteIds"] + tgt)
        b = S["gSprites"] + 0x44 * sid
        pend = u8(S["gAnimScriptActive"]) and u16(S["sAnimMoveIndex"]) == MOVE and not (rows and rows[-1]["active"] and rows[-1]["mv"] == MOVE)
        snap = lab.snapshot() if pend else None
        rows.append({"f": f, "active": u8(S["gAnimScriptActive"]), "mv": u16(S["sAnimMoveIndex"]),
                     "power": u16(S["gAnimMovePower"]), "dmg": s32(S["gAnimMoveDmg"]),
                     "x2": s16(b + 0x24), "y2": s16(b + 0x26),
                     "hp": ({k: [v.get("hp"), v.get("maxHp", v.get("maxHP"))] for k, v in snap["battlers"].items()} if snap else None)})
    f = 0; cap(0)
    for seg in req["trace"]["segments"]:
        for _ in range(seg["frames"]):
            o.advance(seg.get("buttons", [])); f += 1; cap(f)
    bodies, i = [], 1
    while i < len(rows):
        if rows[i]["active"] and rows[i]["mv"] == MOVE and not (rows[i - 1]["active"] and rows[i - 1]["mv"] == MOVE):
            j = i
            while j < len(rows) and rows[j]["active"] and rows[j]["mv"] == MOVE: j += 1
            win = rows[i - 1:min(j + 3, len(rows))]
            nz = [r["f"] for r in rows[i:j] if r["x2"] != 0]
            bodies.append({"activation": rows[i]["f"], "firstInactive": rows[j]["f"] if j < len(rows) else None,
                           "power": rows[i]["power"], "dmg": rows[i]["dmg"], "powerAtCleanup": rows[j - 1]["power"],
                           "hpAtActivation": rows[i]["hp"], "nonzeroX2Frames": [nz[0], nz[-1]] if nz else None,
                           "x2": [[r["f"] - rows[i]["f"], r["x2"], r["y2"]] for r in win]})
            i = j
        else:
            i += 1
    seq = []
    for r in rows:
        if r["active"] and (not seq or seq[-1][0] != r["mv"]): seq.append([r["mv"], r["f"]])
    out = {"orientation": ORIENT, "turns": TURNS, "oracleProfile": "battle-scene-on", "totalFrames": f,
           "moveSequence": seq, "bodies": bodies}
    OUTPUT.write_text(json.dumps(out, indent=1) + "\n")
    print(ORIENT, [(b["activation"], b["power"], b["dmg"], b["hpAtActivation"]) for b in bodies])

main()
