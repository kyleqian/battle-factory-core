#!/usr/bin/env python3
"""d4later (S10A D4: first vs later body): per-body lag frames from two fresh speciesAudit2Counters.py runs per scenario (d4laterCounters.sh).
usage: d4laterCounters.py <runDir> <out.json> <scenario.json>...
A body = a maximal run of frames with gAnimScriptActive set and sAnimMoveIndex = one of MOVES; age 0 is the activation frame, rows run
activation .. last active frame. A lag frame is a frame whose main-loop pass counter (playTimeVBlanks) equals the previous frame's, as body
ages. `priorAnimRuns` counts the earlier gAnimScriptActive runs of ANY animation (moves, stat / status animations): 0 = the battle's first
body (the order host's firstBody). Sky Attack 143: the charge (gAnimMoveTurn 0) and the strike share the move index; `part` is the n-th 143
body of the same scenario, charge / strike alternate. r0 == r1 compares the full counter rows."""
import hashlib, json, os, sys

MOVES = {329: "SHEER_COLD", 326: "EXTRASENSORY", 143: "SKY_ATTACK"}
run_dir, out_path, scenarios = sys.argv[1], sys.argv[2], sys.argv[3:]
out = []
for scen in scenarios:
    stem = os.path.basename(scen)[:-5]
    runs = [json.load(open(os.path.join(run_dir, f"{stem}.run{r}.json"))) for r in (0, 1)]
    digests = [hashlib.sha256(json.dumps(r["rows"]).encode()).hexdigest()[:16] for r in runs]
    cols = runs[0]["cols"]; rows = runs[0]["rows"]
    pt, act, mv = cols.index("playTimeVBlanks"), cols.index("animActive"), cols.index("animMove")
    bodies, i, prior, seen = [], 1, 0, {}
    while i < len(rows):
        if rows[i][act]:
            j = i
            while j + 1 < len(rows) and rows[j + 1][act] and rows[j + 1][mv] == rows[i][mv]:
                j += 1
            if rows[i][mv] in MOVES:
                lag = [k - i for k in range(i, j + 2) if k < len(rows) and rows[k][pt] == rows[k - 1][pt]]
                n = seen.get(rows[i][mv], 0); seen[rows[i][mv]] = n + 1
                bodies.append({"move": MOVES[rows[i][mv]], "activation": i, "lastActive": j, "bodyRows": j - i + 1, "lagAges": lag,
                               "priorAnimRuns": prior, "firstBody": prior == 0, "part": n})
            prior += 1
            i = j + 1
        else:
            i += 1
    out.append({"scenario": scen, "digests": digests, "r0EqualsR1": digests[0] == digests[1], "bodies": bodies})
    print(stem, "r0==r1" if digests[0] == digests[1] else "RUNS DIFFER", [(b["move"][:5], b["activation"], b["bodyRows"], b["lagAges"], b["priorAnimRuns"]) for b in bodies])
json.dump(out, open(out_path, "w"), indent=1)
open(out_path, "a").write("\n")
