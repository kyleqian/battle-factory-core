#!/usr/bin/env python3
"""apx210: per-scene playback totals of lsd194 census arms (field [21], src/engine/liveMovePlayback.ts).

    python3 tools/integration/apx210CensusSummary.py <arm-dir>... [--json]

Reads every <arm>/r<i>.jsonl (the concatenated shards) and prints, per scene, the move-animation commands that are live,
approximate by reason, static by reason and pause (no body request), plus the unnamed statics ("other" without a name or an
unattributed presentation gate) and rows without the field (a tree without the classifier). Exit 1 when any static is unnamed.
"""
import collections
import glob
import json
import os
import re
import sys


def unnamed(reason):
    return reason in ("other", "other:") or reason.startswith("other:unattributed-gate")


def main(argv):
    as_json = "--json" in argv
    arms = [a for a in argv if a != "--json"]
    if not arms:
        print(__doc__.strip())
        return 2
    totals = collections.defaultdict(lambda: collections.Counter())
    seeds = collections.Counter()
    errors = collections.Counter()
    for arm in arms:
        files = sorted(f for f in glob.glob(os.path.join(arm, "r*.jsonl")) if re.fullmatch(r"r\d+\.jsonl", os.path.basename(f)))
        for path in files:
            with open(path) as handle:
                for line in handle:
                    if not line.strip():
                        continue
                    row = json.loads(line)
                    scene = row["scene"]
                    seeds[scene] += 1
                    if row.get("error"):
                        errors[scene] += 1
                    for command in row["commands"]:
                        if command[0] != "move-animation":
                            continue
                        code = command[21] if len(command) > 21 else None
                        totals[scene][code if code is not None else "missing"] += 1
    bad = 0
    report = {}
    for scene in sorted(totals):
        counts = totals[scene]
        approx = {k[len("approx:"):]: v for k, v in counts.items() if k.startswith("approx:")}
        static = {k[len("static:"):]: v for k, v in counts.items() if k.startswith("static:")}
        unnamed_static = sum(v for k, v in static.items() if unnamed(k))
        bad += unnamed_static
        report[scene] = {
            "seeds": seeds[scene], "errors": errors[scene], "moveAnimations": sum(counts.values()), "live": counts["live"],
            "approximate": sum(approx.values()), "approximateByReason": dict(sorted(approx.items(), key=lambda kv: -kv[1])),
            "static": sum(static.values()), "staticByReason": dict(sorted(static.items(), key=lambda kv: -kv[1])),
            "pause": counts["pause"], "missing": counts["missing"], "unnamedStatic": unnamed_static,
        }
    if as_json:
        print(json.dumps(report, indent=1))
    else:
        for scene, r in report.items():
            print(f"scene {scene}: {r['seeds']} seeds ({r['errors']} errors), {r['moveAnimations']} move-animation commands")
            print(f"  live         {r['live']}")
            print(f"  approximate  {r['approximate']}")
            for reason, n in r["approximateByReason"].items():
                print(f"    {reason:40s} {n}")
            print(f"  static       {r['static']}")
            for reason, n in r["staticByReason"].items():
                print(f"    {reason:40s} {n}")
            print(f"  pause        {r['pause']}  (no body request: action-transition / no-hit pauses)")
            if r["missing"]:
                print(f"  missing      {r['missing']}  (rows without field [21])")
            print(f"  unnamed static: {r['unnamedStatic']}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
