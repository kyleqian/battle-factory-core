#!/usr/bin/env python3
"""adp1: write s10a-live-adapter-fixture/v1 fixtures from adp1Probes.sh probe outputs (window = [activation, first inactive row] of the nth Move_<NAME> body).
usage: adp1Fixtures.py <probe-dir> [<move> <side> <bodyIndex> <turn>]...   (default: every move/side, body 0, turn 0)"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
probe_dir = Path(sys.argv[1])
NAMES = {"withdraw": ("WITHDRAW", "BLASTOISE", "ONIX"), "rock-smash": ("ROCK_SMASH", "PRIMEAPE", "ONIX"), "beat-up": ("BEAT_UP", "PRIMEAPE", "ONIX")}

def windows(frames, label):
    out, start = [], None
    for f in frames:
        on = f["animScriptActive"] and f["script"] == label
        if on and start is None: start = f["frame"]
        if not on and start is not None: out.append((start, f["frame"])); start = None
    return out

def write(move, side, body, turn):
    label, att, tgt = NAMES[move]
    key = f"adp1-{move}-{side}"
    path = probe_dir / f"{key}.json"
    if not path.exists(): path = probe_dir / f"{key}-r1.json"
    frames = json.loads(path.read_text())["frames"]
    start, end = windows(frames, f"Move_{label}")[body]
    row = frames[start]["battlers"]
    p, o = row[0], row[1]
    fixture = {
        "schema": "s10a-live-adapter-fixture/v1", "move": label, "probe": "tools/probe/run-battle-lab-rgb.py",
        "scenario": f"tools/battle-lab/{key}.json", "denseWindow": {"startFrame": start, "endFrame": end},
        "windowSource": f"window = [activation, first inactive row] of body {body} of Move_{label} from adp1Probes.sh (trf174Probe.py)",
        "attacker": {"species": att, "geometry": {"side": side}},
        "target": {"species": tgt, "geometry": {"side": "opponent" if side == "player" else "player"}},
        "fieldProfile": {"playerHp": p["hp"], "playerMaxHp": p["maxHP"], "opponentHp": o["hp"], "opponentMaxHp": o["maxHP"],
                         "playerGender": "male", "opponentGender": "male"},
        "attackerPersonality": (p if side == "player" else o)["personality"],
    }
    if turn: fixture["requestFields"] = {"turn": turn}
    name = f"{key}" + (f"-b{body}" if body else "")
    (ROOT / f"tools/integration/fixtures/adp1/{name}.json").write_text(json.dumps(fixture, indent=1) + "\n")
    rows_path = ROOT / "tools/integration/fixtures/adp1/rom-rows.json"
    rows = json.loads(rows_path.read_text()) if rows_path.exists() else {"windows": {}}
    rows["windows"][name] = {"fixture": name, "rows": [f["sha256"] for f in frames[start:end + 1]]}
    rows_path.write_text(json.dumps(rows, indent=1) + "\n")
    print(name, start, end, end - start + 1)

args = sys.argv[2:]
if args:
    for i in range(0, len(args), 4): write(args[i], args[i + 1], int(args[i + 2]), int(args[i + 3]))
else:
    for m in NAMES:
        for s in ("player", "opponent"): write(m, s, 0, 0)
