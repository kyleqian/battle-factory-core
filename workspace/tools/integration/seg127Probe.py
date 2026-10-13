#!/usr/bin/env python3
"""seg127 (S10A / ISSUES #168 SA2 prep; docs/seg127-status-se-gate.md): one battle-lab scenario in a fresh direct mGBA process (never the
shared HTTP oracles), Scene ON or OFF, sampling what the controller's IsBattleSEPlaying gate reads. idle94Probe.py's shape (same boot
selection, same frame numbering: frame 0 = after BattleLab.prepare, frame n = after n trace frames), without the screen / OAM hashes.

usage: seg127Probe.py <scenario.json> <on|off> <output.json> [--seed N]      (--seed overrides the scenario's explicit lab seed)
Per frame: gBattlescriptCurrInstr (`ptr`), gAnimScriptActive (`act`), gBattleControllerExecFlags (`exec`), gCurrentMove (`mv`),
gBattlerAttacker (`atk`), gMoveResultFlags (`mrf`), gMPlayInfo_SE1 / SE2 songHeader + status (`s1h` / `s1` / `s2h` / `s2`: m4a
MusicPlayerInfo +0 / +4), gBattlerControllerFuncs[0..1] (`cf0` / `cf1`) and gBattleMons[0..1].hp
(`hp0` / `hp1`: struct BattlePokemon +0x28, size 0x58). Symbols come from pokeemerald.map (the `name = .` lines too).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith("--seed")]
SEED = None
for i, a in enumerate(sys.argv):
    if a == "--seed":
        SEED = int(sys.argv[i + 1])
        args = [x for x in args if x != sys.argv[i + 1]]
if len(args) != 3 or args[1] not in ("on", "off"):
    raise SystemExit("usage: seg127Probe.py <scenario> <on|off> <output.json> [--seed N]")
SCENARIO, MODE, OUTPUT = Path(args[0]), args[1], Path(args[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = {"on": "battle-scene-on", "off": "battle-scene-off"}[MODE]
BOOT = {"on": "factory.json", "off": "factory-battle-scene-off.json"}[MODE]
NAMES = ("gBattlescriptCurrInstr", "gAnimScriptActive", "gBattleControllerExecFlags", "gCurrentMove", "gBattlerAttacker",
         "gMoveResultFlags", "gMPlayInfo_SE1", "gMPlayInfo_SE2", "gBattlerControllerFuncs", "gBattleMons")


def main() -> None:
    raw_req = json.loads(SCENARIO.read_text())
    raw_req["profile"] = PROFILE
    if SEED is not None:
        raw_req["seed"] = SEED
    request = validate_request(raw_req, PROFILE)
    ref = (ROOT / "reference/pokeemerald").resolve()
    sy = {}
    for line in open(ref / "pokeemerald.map"):
        m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(\w+)(\s*=\s*\.)?\s*$", line)
        if m and m.group(2) in NAMES:
            sy[m.group(2)] = int(m.group(1), 16)
    assert set(sy) == set(NAMES), set(NAMES) - set(sy)
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap" / BOOT)
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    se1, se2, cf = sy["gMPlayInfo_SE1"], sy["gMPlayInfo_SE2"], sy["gBattlerControllerFuncs"]
    rows = []
    frame = 0

    def sample() -> None:
        rows.append({"f": frame, "ptr": u32(sy["gBattlescriptCurrInstr"]), "act": u8(sy["gAnimScriptActive"]),
                     "exec": u32(sy["gBattleControllerExecFlags"]), "mv": u16(sy["gCurrentMove"]), "atk": u8(sy["gBattlerAttacker"]),
                     "mrf": u8(sy["gMoveResultFlags"]), "s1h": u32(se1), "s1": u32(se1 + 4), "s2h": u32(se2), "s2": u32(se2 + 4),
                     "cf0": u32(cf), "cf1": u32(cf + 4), "hp0": u16(sy["gBattleMons"] + 0x28),
                     "hp1": u16(sy["gBattleMons"] + 0x58 + 0x28)})

    sample()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            sample()
    OUTPUT.write_text(json.dumps({"schema": "seg127-probe/v1", "scenario": SCENARIO.name, "mode": MODE, "seed": request.get("seed"),
                                  "frameCount": frame, "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
