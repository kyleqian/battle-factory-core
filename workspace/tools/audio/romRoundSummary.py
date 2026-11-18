"""Round replay (docs/parity-mac/round-replay.md): one table over a batch directory of tools/audio/romRoundReplay.sh.
Usage: python3 tools/audio/romRoundSummary.py OUTDIR [--json FILE]
The coverage lines count, over the matching rounds, how often a between-battle rule was exercised and then checked at the next battle's start
(the ROM's party at the end of battle N against the next battle's party, both read on the ROM; the engine's matched it there).
Per round: the battles driven, how the round ended on the ROM (won / lost / stopped), and the first difference (the battle, and whether it was at the battle
start (a party field, the trainer or the sets), at the trainer roll, or in the turns). Counts are of rounds driven, not a quality figure."""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path

d = Path(sys.argv[1])
rows = []


def end_of(d, rid, dr, bs):
    """How the last round of the run ended on the ROM (the battle number is the round's own, from the last setup)."""
    if dr.get("error"):
        return "error"
    if not bs:
        return "stopped"
    last = json.loads((d / f"{rid}.d" / f"setup-{len(bs) - 1}.json").read_text())["round"]["battleNum"]
    out = bs[-1]["romOutcome"]
    return ("won" if out == 1 and last == 6 else "lost" if out == 2 else "drew (ends the round)" if out == 3 else "stopped")

for line in (d / "done.txt").read_text().splitlines():
    rid, rc = line.split(" rc=")
    row = {"id": rid, "rc": int(rc)}
    cmp_path, drive_path = d / f"{rid}.cmp.json", d / f"{rid}.drive.json"
    if cmp_path.exists():
        c = json.loads(cmp_path.read_text())
        dr = json.loads(drive_path.read_text())
        bs = c["battles"]
        row.update({"match": c["match"], "matchExceptKnown": c.get("matchExceptKnown", c["match"]), "battles": len(bs), "romError": c.get("romError"), "roundError": c.get("roundError"),
                    "knownDifferences": sum(1 for b in bs if b.get("knownDifference")),
                    "end": end_of(d, rid, dr, bs),
                    "swaps": sum(1 for b in bs if (b.get("swapAfter") or {}).get("type") == "accept")})
        first = next((b for b in bs if not b["match"]), None)
        if first is not None:
            kind = ("start" if first["startDiffs"] else "trainer-roll" if first["battleIndex"] > 0 and not (first["selection"] or {}).get("matched")
                    else "engine-error" if first["engineError"] else "turns")
            row["first"] = {"battle": first["battleIndex"], "kind": kind, "startDiffs": first["startDiffs"][:6], "selection": first["selection"],
                            "turns": first["turns"], "engineError": first["engineError"]}
    rows.append(row)
print(f"rounds {len(rows)}; rc {dict(Counter(r['rc'] for r in rows))}")
print(f"ends {dict(Counter(r.get('end') for r in rows))}")
print(f"match {sum(1 for r in rows if r.get('match'))}; battles driven {sum(r.get('battles', 0) for r in rows)}; deepest {Counter(r.get('battles', 0) for r in rows)}")
print(f"rounds with a swap {sum(1 for r in rows if r.get('swaps'))}; swaps {sum(r.get('swaps', 0) for r in rows)}")
print(f"match except the known first-trainer order of a chained round (fix 47, unfixed): {sum(1 for r in rows if r.get('matchExceptKnown'))}; "
      f"battles with it: {sum(r.get('knownDifferences', 0) for r in rows)}")
for r in rows:
    if not r.get("matchExceptKnown"):
        print(json.dumps({k: r.get(k) for k in ("id", "rc", "battles", "end", "romError", "roundError", "first")})[:900])
if "--json" in sys.argv:
    Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(rows, indent=1))

cov = defaultdict(int)
for r in rows:
    if not r.get("matchExceptKnown"):
        continue
    dr = json.loads((d / f"{r['id']}.drive.json").read_text())
    for n, b in enumerate(dr["battles"][:-1]):
        end = b["drive"].get("finalWide")
        nxt = d / f"{r['id']}.d" / f"setup-{n + 1}.json"
        if end is None or not nxt.exists():
            continue
        start = json.loads(nxt.read_text())
        rr = start["round"]
        swap = (b.get("between") or {}).get("swap", {}).get("decision") or {}
        swapped = swap.get("type") == "accept"
        if (b.get("between") or {}).get("newRound"):
            prev = json.loads((d / f"{r['id']}.d" / f"setup-{n}.json").read_text())["round"]
            cov["new rounds played by the ROM (Lobby, draft, first trainer)"] += 1
            cov["new rounds after a " + ("won" if b["drive"]["outcome"] == 1 and prev["battleNum"] == 6 else "lost") + " round"] += 1
            continue
        cov["battle starts after a won battle"] += 1
        cov[f"battle {rr['battleNum'] + 1} starts"] += 1
        if swapped:
            cov["swaps (the beaten trainer's Pokemon comes in fainted, the next start must show it healed)"] += 1
            q = swap["opponentPartyIndex"]
            incoming = end["parties"][1][q]
            if incoming["item"] == 0:
                cov["swapped-in Pokemon that had used its item"] += 1
        for i, m in enumerate(end["parties"][0]):
            if swapped and i == swap["playerPartyIndex"]:
                continue
            nm = start["snapshot"]["parties"]["player"][i]
            if m["species"] is None:
                continue
            if m["hp"] < nm["maxHp"]:
                cov["kept Pokemon healed (HP)"] += 1
            if m["hp"] == 0:
                cov["kept Pokemon revived (had fainted)"] += 1
            if (m["status1"] or 0) != 0:
                cov["kept Pokemon cured of a status"] += 1
            if m["pp"] is not None and any(a < b for a, b in zip(m["pp"], nm["pp"])):
                cov["kept Pokemon with PP restored"] += 1
            if m["item"] == 0 and nm["item"] != 0:
                cov["kept Pokemon with its used item restored"] += 1
        if rr["battleNum"] == 6:
            cov["seventh battles (hard trainer table, higher IV)"] += 1
        if rr["trainerId"] == 1022:
            cov["Frontier Brain battles after a real round"] += 1
print("coverage (matching rounds):")
for k in sorted(cov):
    print(f"  {k}: {cov[k]}")

