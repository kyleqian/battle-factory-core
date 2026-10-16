#!/usr/bin/env python3
"""pfr185: run pfr185Probe.py fresh for each (case, scene) and reduce the per-frame rows to the player faint-replacement send-in rows.
Scenario = tools/battle-lab/playerfaint-slot2-sunnyday.json with the party slot 1 (the forced menu's DOWN-then-A pick) overridden to
the case's species / nature.  Everything is measured from B = the frame the send-in's ball sprite (SpriteCB_WaitForBattlerBallReleaseAnim)
spawns, which is also the frame PlayerHandleSwitchInAnim hands over to SwitchIn_TryShinyAnimShowHealthbox.
usage (workspace root): PY=/srv/pokebench/vendor/mgba-venv/bin/python python3 tools/integration/pfr185Run.py <tag> <out.json> <cases.json> [on,off]
cases.json: [{"id": "pidgey", "species": 16, "nature": 6 (opt)}]   env PFR_JOBS (default 2)"""
import hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

tag, outp, casesp = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
scenes = (sys.argv[4] if len(sys.argv) > 4 else "off,on").split(",")
PY = os.environ["PY"]
tmp = Path(os.environ.get("PFR_TMP", "/tmp/pfr185")) / tag
tmp.mkdir(parents=True, exist_ok=True)
cases = json.load(open(casesp))
BASE = "tools/battle-lab/playerfaint-slot2-sunnyday.json"


def reduce(j):
    H = j["H"]
    r = {int(k): v for k, v in j["rows"].items()}
    closed = next(i["frame"] for i in j["inputs"] if i["kind"] == "menu-closed") - H
    B = next(s["f"] for s in j["spawns"] if s.get("cb") == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] > closed)
    ks = sorted(k for k in r if k >= B)

    def first(pred, lo=B):
        return next((k - B for k in ks if k >= lo and pred(r[k], k)), None)

    ctrlStart = first(lambda x, k: x["ctrl"][0] == "SwitchIn_TryShinyAnimShowHealthbox")
    clean = first(lambda x, k: x["ctrl"][0] == "SwitchIn_CleanShinyAnimShowSubstitute")
    sound = first(lambda x, k: x["ctrl"][0] == "SwitchIn_HandleSoundAndEnd")
    idle = first(lambda x, k: x["ctrl"][0] == "PlayerBufferRunCommand" and k - B > 20)
    slide = first(lambda x, k: abs(x["h"][0][3]) in (105, 110) and x["h"][0][5] == 0)
    txt_at_idle = r[B + idle]["txt"][:4]
    nextTxt = first(lambda x, k: k - B > idle and x["txt"][:4] != txt_at_idle)
    prompt = first(lambda x, k: x["ctrl"][0] == "HandleInputChooseAction" and k - B > idle)
    mainRun = first(lambda x, k: x["main"] == "RunTurnActionsFunctions" and k - B > idle)
    turnPassed = first(lambda x, k: x["main"] == "BattleTurnPassed" and k - B > idle)
    sel = first(lambda x, k: x["main"] == "HandleTurnActionSelectionState" and k - B > idle)
    goStart = next((k - B for k in sorted(r) if closed < k < B and r[k]["txt"][:4] != r[closed]["txt"][:4]), None)
    return {"H": H, "closed": closed, "ballFrame": B, "goTextStart": goStart, "ctrlStart": ctrlStart, "hbslide": slide, "cleanShiny": clean,
            "soundAndEnd": sound, "ctrlIdle": idle, "mainRunTurnActions": mainRun, "battleTurnPassed": turnPassed, "actionSelection": sel,
            "nextTxt": nextTxt, "actionPrompt": prompt, "species": r[B + idle]["species"][0], "pidx": r[B + idle]["pidx"][0]}


def run(job):
    c, scene = job
    d = json.load(open(BASE))
    pl = d["overrides"]["parties"]["player"][1]
    pl["species"] = c["species"]
    pl["nature"] = c.get("nature", 6)
    key = f"{c['id']}-{scene}"
    s = tmp / f"{key}.json"
    s.write_text(json.dumps(d))
    o = tmp / f"out-{key}.json"
    if o.exists():
        o.unlink()
    env = dict(os.environ, FS_PROFILE=f"battle-scene-{scene}")
    subprocess.run(["python3", "tools/run-mgba-probe.py", "--max-log-bytes", "20000", str(o), "--", PY, "tools/integration/pfr185Probe.py", str(s), str(o)],
                   capture_output=True, env=env)
    if not o.exists():
        return {"id": c["id"], "scene": scene, "failed": True}
    raw = o.read_bytes()
    row = {"id": c["id"], "scene": scene, "case": c, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
    try:
        row.update(reduce(json.loads(raw)))
    except Exception as e:  # noqa: BLE001
        row["reduceError"] = repr(e)
    return row


jobs = [(c, sc) for c in cases for sc in scenes]
with ThreadPoolExecutor(int(os.environ.get("PFR_JOBS", "2"))) as ex:
    rows = list(ex.map(run, jobs))
outp.write_text(json.dumps(rows, indent=1) + "\n")
for r in rows:
    if r.get("failed") or r.get("reduceError"):
        print(r["id"], r["scene"], "FAILED", r.get("reduceError", ""))
    else:
        print(r["id"], r["scene"], f"species {r['species']} slide {r['hbslide']} idle {r['ctrlIdle']} mainRun {r['mainRunTurnActions']} nextTxt {r['nextTxt']} prompt {r['actionPrompt']} sha {r['sha256'][:10]}")
