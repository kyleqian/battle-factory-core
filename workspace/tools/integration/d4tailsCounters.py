#!/usr/bin/env python3
"""d4tails: per-body lag frames from two fresh speciesAudit2Counters.py runs per scenario (d4tailsCounters.sh).
usage: d4tailsCounters.py <runDir> <out.json> <scenario.json>...
A body = a maximal run of frames with gAnimScriptActive set and sAnimMoveIndex = one of MOVES; its age 0 is the activation frame (the first
active frame), its rows run activation .. last active frame. A lag frame is a frame whose main-loop pass counter (playTimeVBlanks: +1 per
PlayTimeCounter_Update pass) equals the previous frame's; reported as body ages. r0 == r1 compares the full counter rows."""
import hashlib, json, os, sys

MOVES = {196: "ICY_WIND", 59: "BLIZZARD", 185: "FAINT_ATTACK", 109: "CONFUSE_RAY"}
run_dir, out_path, scenarios = sys.argv[1], sys.argv[2], sys.argv[3:]
out = []
for scen in scenarios:
    stem = os.path.basename(scen)[:-5]
    runs = [json.load(open(os.path.join(run_dir, f"{stem}.run{r}.json"))) for r in (0, 1)]
    digests = [hashlib.sha256(json.dumps(r["rows"]).encode()).hexdigest()[:16] for r in runs]
    cols = runs[0]["cols"]; rows = runs[0]["rows"]
    pt, act, mv = cols.index("playTimeVBlanks"), cols.index("animActive"), cols.index("animMove")
    bodies, i = [], 1
    while i < len(rows):
        if rows[i][act] and rows[i][mv] in MOVES:
            j = i
            while j + 1 < len(rows) and rows[j + 1][act] and rows[j + 1][mv] == rows[i][mv]:
                j += 1
            lag = [k - i for k in range(i, j + 2) if k < len(rows) and rows[k][pt] == rows[k - 1][pt]]
            bodies.append({"move": MOVES[rows[i][mv]], "activation": i, "lastActive": j, "bodyRows": j - i + 1, "lagAges": lag})
            i = j + 1
        else:
            i += 1
    out.append({"scenario": scen, "digests": digests, "r0EqualsR1": digests[0] == digests[1], "bodies": bodies})
    print(stem, "r0==r1" if digests[0] == digests[1] else "RUNS DIFFER", [(b["move"], b["activation"], b["bodyRows"], b["lagAges"]) for b in bodies])
json.dump(out, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
