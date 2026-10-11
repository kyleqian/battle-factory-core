#!/usr/bin/env python3
"""fp100 (docs/fp100-focus-punch-d4.md): the age-131 optional-lag phase of every doll-free Focus Punch 264 body in fresh probe rows.
A lag row is one where gRng2Value (advanced once per main-loop pass) equals the previous row's (ctl95's instrument). Per body: the
activation frame, the ROM body rows (gAnimScriptActive rows), the lag ages inside the body, the phase ("event" = a lag at age 131),
and, joined from ctl95ControlCheck.ts outputs, production's px (r1 / r2) and bad ages.
usage: fp100Phase.py <probe dir> <check.json>... -- <stem>...   (prints a TSV; stems name <probe dir>/<stem>-r1.json)
"""
import json, sys

args = sys.argv[1:]
cut = args.index("--")
probe_dir, checks, stems = args[0], args[1:cut], args[cut + 1:]
px = {}
for c in checks:
    for r in json.load(open(c))["results"]:
        px[(r["stem"], r["activation"])] = r
print("stem\tbody\tside\tpair\tactivation\tromBodyRows\tlagAges\tphase\tpx_r1/r2\tbadAges")
for stem in stems:
    rows = json.load(open(f"{probe_dir}/{stem}-r1.json"))["frames"]
    assert [r["sha256"] for r in rows] == [r["sha256"] for r in json.load(open(f"{probe_dir}/{stem}-r2.json"))["frames"]], stem
    body = 0
    for i, r in enumerate(rows):
        if r["script"] != "Move_FOCUS_PUNCH" or (i > 0 and rows[i - 1]["script"] is not None):
            continue
        end = i
        while rows[end]["script"] is not None:
            end += 1
        side = "player" if r["animAttacker"] == 0 else "opponent"
        if r["battlers"][r["animAttacker"]]["behindSubstitute"]:
            continue
        lags = [a for a in range(1, end - i + 1) if rows[i + a]["rng2"] == rows[i + a - 1]["rng2"]]
        chk = px.get((stem, r["frame"]))
        print("\t".join(str(x) for x in [stem, body, side, f"{chk['attacker']}->{chk['target']}" if chk else "?", r["frame"], end - i,
            ",".join(map(str, lags)), "event" if 131 in lags else "no-event",
            "/".join(map(str, chk["px"])) if chk else "-", ",".join(chk["badAges"]) if chk and chk["badAges"] else "-"]))
        body += 1
