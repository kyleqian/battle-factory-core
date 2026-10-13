#!/usr/bin/env python3
"""forced-switch: species sweep of the ROM continuation. Replaces the party slot the forced switch picks (party[1]) with each species, keeping the rest of the
scenario; runs forcedSwitchRomProbe.py (direct mGBA, fresh process) and prints send-in timings vs the species cry duration.
usage (workspace root, mgba venv, PY=venv python): forcedSwitchSweep.py <scenarioName> <side: player|opponent> <tag> <partySlot the ROM picks: 1 for Roar, 2 for Whirlwind>   e.g. mechanic-roar-player-houndour-opponent-onix opponent r1"""
import json, subprocess, sys, os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
name, side, tag, slot = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
SPECIES = json.load(open(os.environ["FS_SPECIES"])) if os.environ.get("FS_SPECIES") else [19, 292, 304, 12, 2, 198, 111, 95, 134, 130, 150, 249]  # FS_SPECIES=<json list of species ids>
cry = {r["id"]: r["durationTicks"] for r in json.load(open("src/data/gen/cry-durations.json"))["species"]}
tmp = Path(f"/tmp/fs/sweep-{tag}"); tmp.mkdir(parents=True, exist_ok=True)
base = json.load(open(f"tools/battle-lab/{name}.json"))
def run(sp):
    d = json.loads(json.dumps(base)); d["overrides"]["parties"][side][slot]["species"] = sp
    if os.environ.get("FS_GENDER"): d["overrides"]["parties"][side][slot]["gender"] = os.environ["FS_GENDER"]  # offs152: e.g. genderless
    s = tmp / f"{name}-{side}-{sp}.json"; s.write_text(json.dumps(d)); o = tmp / f"out-{name}-{side}-{sp}.json"
    subprocess.run([os.environ["PY"], "tools/integration/forcedSwitchRomProbe.py", str(s), str(o)], capture_output=True)
    return sp, o
rows = []
with ThreadPoolExecutor(8) as ex:
    for sp, o in ex.map(run, SPECIES):
        if not o.exists(): rows.append((sp, "FAILED")); continue
        d = json.loads(o.read_text()); E = d["E"] + 1; r = {int(k) - E: v for k, v in d["rows"].items()}
        ball = next((s["f"] - E for s in d["spawns"] if s.get("cb") == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] >= E), None)
        tgt = 1 if side == "opponent" else 0
        sl = next((k for k in sorted(r) if k > 0 and abs(r[k]["h"][tgt][3]) in (105, 110) and r[k]["h"][tgt][5] == 0), None)
        txt = next((k for k in sorted(r) if k > 20 and r[k]["txt"][:2] != r[0]["txt"][:2]), None)
        y2 = next((k for k in sorted(r) if k > 12 and r[k]["b"][tgt][4] != 0), None)
        idle = next((k for k in sorted(r) if k > 20 and r[k]["ctrl"][tgt] in ("PlayerBufferRunCommand", "OpponentBufferRunCommand", "Task_PlayerController_RestoreBgmAfterCry") and r[k - 1]["ctrl"][tgt] not in ("PlayerBufferRunCommand", "OpponentBufferRunCommand")), None)
        rows.append((sp, cry.get(sp), "pidx", r[40]["pidx"], "species", r[40]["species"], "ball", ball, "y2start", y2, "hbslide", sl, "ctrlIdle", idle, "txtStart", txt))
for x in rows: print(*x)
