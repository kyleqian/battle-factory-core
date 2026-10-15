#!/usr/bin/env python3
"""snd179: fresh direct-mGBA (Scene ON) forced PLAYER send-in probes for the "X was dragged out!" row.
Builds one scenario per case from a battle-lab Roar / Whirlwind scenario (sent-in party slot species, sent-in nature, attacker species
overridden), runs forcedSwitchRomProbe.py (via tools/run-mgba-probe.py) in a fresh process, and records the sweep row
(ball / y2start / hbslide / ctrlIdle / txtStart, the same extraction as forcedSwitchSweep.py) plus the sha256 of the raw probe JSON.
usage (workspace root): PY=/srv/pokebench/vendor/mgba-venv/bin/python python3 tools/integration/snd179Probe.py <tag> <out.json> <cases.json>
cases.json: [{"id": "...", "scenario": "mechanic-roar-opponent-houndour-player-onix", "slot": 1, "species": 16, "nature": 6 (opt),
              "attacker": 228 (opt), "attackerSlot": 0 (opt), "attackerGender": "female" (opt)}]"""
import hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

tag, outp, casesp = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
PY = os.environ["PY"]
tmp = Path(os.environ.get("FS_TMP", "/tmp/snd179")) / tag
tmp.mkdir(parents=True, exist_ok=True)
cases = json.load(open(casesp))
env = dict(os.environ, FS_WINDOW=os.environ.get("FS_WINDOW", "320"), FS_PROFILE="battle-scene-on")


def run(c):
    d = json.load(open(f"tools/battle-lab/{c['scenario']}.json"))
    pl = d["overrides"]["parties"]["player"][c["slot"]]
    pl["species"] = c["species"]
    if "nature" in c:
        pl["nature"] = c["nature"]
    if "attacker" in c:
        a = d["overrides"]["parties"]["opponent"][c.get("attackerSlot", 0)]
        a["species"] = c["attacker"]
        if "attackerGender" in c:
            a["gender"] = c["attackerGender"]
    s = tmp / f"{c['id']}.json"
    s.write_text(json.dumps(d))
    o = tmp / f"out-{c['id']}.json"
    if o.exists():
        o.unlink()
    subprocess.run(["python3", "tools/run-mgba-probe.py", str(o), "--", PY, "tools/integration/forcedSwitchRomProbe.py", str(s), str(o)],
                   capture_output=True, env=env)
    if not o.exists():
        return c, {"id": c["id"], "failed": True}
    raw = o.read_bytes()
    j = json.loads(raw)
    E = j["E"] + 1
    r = {int(k) - E: v for k, v in j["rows"].items()}
    ball = next((s["f"] - E for s in j["spawns"] if s.get("cb") == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] >= E), None)
    tgt = 0
    sl = next((k for k in sorted(r) if k > 0 and abs(r[k]["h"][tgt][3]) in (105, 110) and r[k]["h"][tgt][5] == 0), None)
    txt = next((k for k in sorted(r) if k > 20 and r[k]["txt"][:2] != r[0]["txt"][:2]), None)
    y2 = next((k for k in sorted(r) if k > 12 and r[k]["b"][tgt][4] != 0), None)
    idle = next((k for k in sorted(r) if k > 20 and r[k]["ctrl"][tgt] in ("PlayerBufferRunCommand", "OpponentBufferRunCommand", "Task_PlayerController_RestoreBgmAfterCry")
                 and r[k - 1]["ctrl"][tgt] not in ("PlayerBufferRunCommand", "OpponentBufferRunCommand")), None)
    return c, {"id": c["id"], "case": c, "E": j["E"], "pidx": r[40]["pidx"], "species": r[40]["species"], "ball": ball, "y2start": y2, "hbslide": sl,
               "ctrlIdle": idle, "txtStart": txt, "message": None if txt is None or ball is None else txt - ball, "sha256": hashlib.sha256(raw).hexdigest(),
               "bytes": len(raw)}


with ThreadPoolExecutor(int(os.environ.get("SND179_JOBS", "3"))) as ex:
    rows = [row for _, row in ex.map(run, cases)]
outp.write_text(json.dumps(rows, indent=1) + "\n")
for r in rows:
    print(r["id"], "FAILED" if r.get("failed") else f"species {r['species']} ball {r['ball']} hbslide {r['hbslide']} txt {r['txtStart']} message {r['message']} sha {r['sha256'][:12]}")
