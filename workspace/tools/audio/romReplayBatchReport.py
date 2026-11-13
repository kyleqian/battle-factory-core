"""parity-mac fourth pass: the report of a batch of romReplayWide.sh battles.

  python3 tools/audio/romReplayBatchReport.py DIR [DIR ...] [--json OUT.json] [--list LISTFILE]

Reads every `*.summary.json` under the DIRs and `done.txt` (battles whose chain failed before a summary: rc 12 = the lab did not stage the battle,
rc 13 = the engine replay refused the staging, ...). A later DIR overrides an earlier one for the same battle id, so a re-drive directory (long caps,
second drive) can be given after the first run. `--list` (lines `SEED POLICY SYMBOLS [CHALLENGE]`) restricts the report to those battles and names the ones missing.
Prints one table by test player: driven, match, and what the others are. `--json` writes one row per battle (the per-seed record kept under
docs/replay-batches/).
"""
import collections, glob, json, re, sys
from pathlib import Path


def battle_id(seed, policy, symbols="0", challenge=None):
    return f"{seed}-{policy}" + ("-gold" if str(symbols) == "1" else "") + (f"-c{challenge}" if challenge not in (None, "") else "")


def load(dirs):
    rows = {}
    for d in dirs:
        done = Path(d) / "done.txt"
        if done.exists():
            for line in done.read_text().splitlines():
                m = re.match(r"^(\S+) rc=(\d+)$", line)
                if m and m.group(2) != "0":
                    rows[m.group(1)] = {"id": m.group(1), "result": "not-staged" if m.group(2) in ("12", "13") else "chain-failed", "rc": int(m.group(2))}
        for path in sorted(glob.glob(str(Path(d) / "*.summary.json"))):
            try:
                s = json.loads(Path(path).read_text())
            except ValueError:
                continue
            stop = s["drive"]["stop"]
            # A battle that hit a frame cap with every state so far matching is unfinished, not different.
            unfinished = (not s["match"]) and (stop == "frame-cap" or (s["engineError"] or "").endswith("frame budget")) and s["drive"]["errorReason"] is None \
                and (s["wide"] is None or s["wide"]["diffPoints"] == 0)
            rows[s["id"]] = {
                "id": s["id"], "seed": s["seed"], "policy": s["policy"], "symbols": s["symbols"], "scene": s["scene"],
                **({"challengeNum": s["challengeNum"]} if s.get("challengeNum") is not None else {}),
                "result": "match" if s["match"] else "unfinished" if unfinished else s["class"],
                "statesMatched": s["matched"], "engineStates": s["engineStates"], "decisions": s["drive"]["decisionsTotal"], "romFrames": s["drive"]["frames"],
                "voluntarySwitches": s["voluntarySwitches"], "probes": s["probes"], "outcome": s.get("outcome"),
                **({"stage": s["stage"]["name"], "stageOk": s["stage"]["ok"]} if "stage" in s else {}),
            }
    return rows


def main(argv):
    dirs = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] not in ("--json", "--list"))]
    opt = lambda name: argv[argv.index(name) + 1] if name in argv else None
    rows = load(dirs)
    if opt("--list"):
        wanted = [battle_id(*line.split()) for line in Path(opt("--list")).read_text().splitlines() if line.strip()]
        missing = [w for w in wanted if w not in rows]
        rows = {w: rows[w] for w in wanted if w in rows}
        if missing:
            print(f"missing {len(missing)}: {' '.join(missing[:20])}")
    by = collections.defaultdict(collections.Counter)
    for r in rows.values():
        policy = r.get("policy") or r["id"].split("-", 1)[1].replace("-gold", "")
        by[policy][r["result"]] += 1
        by[policy]["driven"] += 1
        by[policy]["voluntarySwitches"] += r.get("voluntarySwitches", 0)
        by[policy]["probes"] += r.get("probes", 0)
    results = sorted({k for c in by.values() for k in c} - {"driven", "match", "voluntarySwitches", "probes"})
    cells = lambda values: "".join(f" {v} |" for v in values)
    print("| player | driven | match |" + cells(results) + " voluntary switches | refusal probes |")
    print("|---|---|---|" + "---|" * len(results) + "---|---|")
    for policy in sorted(by):
        c = by[policy]
        print(f"| {policy} | {c['driven']} | {c['match']} |" + cells(c[k] for k in results) + f" {c['voluntarySwitches']} | {c['probes']} |")
    for r in sorted(rows.values(), key=lambda r: r["id"]):
        if r["result"] != "match":
            print("  ", r["id"], r["result"], f"{r.get('statesMatched')}/{r.get('engineStates')}" if "seed" in r else f"rc {r.get('rc')}")
    if opt("--json"):
        Path(opt("--json")).write_text(json.dumps(sorted(rows.values(), key=lambda r: (r.get("seed", 0), r["id"])), separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:])
