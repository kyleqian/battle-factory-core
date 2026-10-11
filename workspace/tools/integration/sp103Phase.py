#!/usr/bin/env python3
"""sp103 (docs/next-adapters-sp103.md): the age-90 optional-lag phase of every doll-free Shadow Punch 325 body in fresh probe rows
(fp100Phase.py's instrument). A lag row is one where gRng2Value (advanced once per main-loop pass) equals the previous row's. Per body:
the activation frame, the ROM body rows (gAnimScriptActive rows), the lag ages inside the body, the phase ("event" = a lag at age 90),
the predecessor (the script of the last animation before the body in the trace), and, joined from the check outputs: production's
body px (r1 / r2) and bad body ages (ctl95ControlCheck.ts --shift=8: the accepted body window A+8 .., production age = row - 8) and
its lead rows N and lead px (audit24LeadCheck.ts: rows A .. A+N-1; N = 0 for the elevated opponent HAUNTER since df4afda75).
usage: sp103Phase.py <probe dir> <check.json>... -- <stem>...   (prints a TSV; stems name <probe dir>/<stem>-r1.json)
"""
import json, sys

args = sys.argv[1:]
cut = args.index("--")
probe_dir, checks, stems = args[0], args[1:cut], args[cut + 1:]
px, lead = {}, {}
for c in checks:
    for r in json.load(open(c))["results"]:
        (lead if "leadPx" in r else px)[(r["stem"], r["activation"])] = r
print("stem\tbody\tside\tpair\tpredecessor\tactivation\tromBodyRows\tlagAges\tphase\tN\tleadPx_r1/r2\tD\tbodyPx_r1/r2\tbadAges")
for stem in stems:
    rows = json.load(open(f"{probe_dir}/{stem}-r1.json"))["frames"]
    assert [r["sha256"] for r in rows] == [r["sha256"] for r in json.load(open(f"{probe_dir}/{stem}-r2.json"))["frames"]], stem
    assert [r["rng2"] for r in rows] == [r["rng2"] for r in json.load(open(f"{probe_dir}/{stem}-r2.json"))["frames"]], stem
    body, prev = 0, "-"
    for i, r in enumerate(rows):
        if r["script"] is not None and (i == 0 or rows[i - 1]["script"] is None) and r["script"] != "Move_SHADOW_PUNCH":
            prev = r["script"]
        if r["script"] != "Move_SHADOW_PUNCH" or (i > 0 and rows[i - 1]["script"] is not None):
            continue
        end = i
        while rows[end]["script"] is not None:
            end += 1
        side = "player" if r["animAttacker"] == 0 else "opponent"
        if r["battlers"][r["animAttacker"]]["behindSubstitute"]:
            continue
        lags = [a for a in range(1, end - i + 1) if rows[i + a]["rng2"] == rows[i + a - 1]["rng2"]]
        chk, ld = px.get((stem, r["frame"])), lead.get((stem, r["frame"]))
        print("\t".join(str(x) for x in [stem, body, side, f"{chk['attacker']}->{chk['target']}" if chk else "?", prev, r["frame"], end - i,
            ",".join(map(str, lags)), "event" if 90 in lags else "no-event",
            ld["lead"] if ld else "-", "/".join(map(str, ld["leadPx"])) if ld else "-", chk["duration"] if chk else "-",
            "/".join(map(str, chk["px"])) if chk else "-", ",".join(chk["badAges"]) or "-" if chk else "-"]))
        prev = r["script"]
        body += 1
