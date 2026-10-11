#!/usr/bin/env python3
"""idle94: is every positive-lead adapter's lead static? (ROM only; direct mGBA via idle94Probe.py, Scene ON.)

  stage <table.tsv> <out-dir>            one scenario per (move with lead N > 0 on both sides, side) from the Bulk Up templates
                                         (PRIMEAPE vs ONIX, attacker moves [M] * 4, explicit seed 305419897) + index.json
  check <scenario-dir> <probe-dir> <out.json>
For each scenario: the move's body (gCurrentMove == M, gBattlerAttacker == side), A = its activation, and whether the screens of
A-1, A .. A+N-1 (the lead rows) and A+N (production age 0: live row 0 of the accepted window, 0 px in its dense proof) are all the same
raw-RGB sha. A move without a body in the scenario (the move fails / needs a precondition) is `noBody`, not a pass.
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}

if sys.argv[1] == "stage":
    rows = [l.rstrip("\n").split("\t") for l in open(sys.argv[2])][1:]
    lead = {}
    for r in rows:
        mid, move, bucket, side, leads = int(r[0]), r[1], r[2], r[3], r[4]
        lead.setdefault(mid, {})[side] = (move, bucket, leads)
    out = sys.argv[3]
    os.makedirs(out, exist_ok=True)
    index = {}
    for mid, sides in sorted(lead.items()):
        vals = {s: v[2] for s, v in sides.items()}
        if any("," in v or v == "n/a" for v in vals.values()) or len(set(vals.values())) != 1 or int(vals["player"]) <= 0:
            continue
        n = int(vals["player"])
        for side in ("player", "opponent"):
            d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
            d["overrides"]["parties"][side][0]["moves"] = [mid] * 4
            d["seed"] = 305419897
            name = f"idle94-lead-{mid}-{'ply' if side == 'player' else 'opp'}.json"
            open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
            index[name] = {"move": mid, "name": sides[side][0], "bucket": sides[side][1], "side": side, "N": n}
    open(os.path.join(out, "index.json"), "w").write(json.dumps(index, indent=1) + "\n")
    print(len(index), "scenarios", len({v["move"] for v in index.values()}), "moves")
elif sys.argv[1] == "check":
    sdir, pdir, out = sys.argv[2:5]
    index = json.load(open(os.path.join(sdir, "index.json")))
    res = {}
    for name, m in sorted(index.items()):
        p = os.path.join(pdir, name[:-5] + "-on.json")
        if not os.path.exists(p):
            res[name] = {**m, "status": "noProbe"}
            continue
        rows = json.load(open(p))["rows"]
        b = 0 if m["side"] == "player" else 1
        starts = [r["f"] for i, r in enumerate(rows) if i and r["act"] and not rows[i - 1]["act"] and r["mv"] == m["move"] and r["atk"] == b]
        if not starts:
            res[name] = {**m, "status": "noBody"}
            continue
        A, N = starts[0], m["N"]
        shas = [rows[f]["scr"] for f in range(A - 1, A + N + 1)]
        first_change = next((r["f"] for r in rows[A:] if r["scr"] != rows[A - 1]["scr"]), None)
        res[name] = {**m, "A": A, "status": "static" if len(set(shas)) == 1 else "notStatic", "firstScreenChangeAtOrAfterA": first_change,
                     "distinctScreensAminus1toAplusN": len(set(shas))}
    summ = {}
    for v in res.values():
        summ[v["status"]] = summ.get(v["status"], 0) + 1
    by_move = {}
    for v in res.values():
        by_move.setdefault(v["move"], []).append(v["status"])
    static_moves = sorted(k for k, s in by_move.items() if all(x == "static" for x in s))
    json.dump({"summary": summ, "staticBothSides": static_moves, "scenarios": res}, open(out, "w"), indent=1)
    print(json.dumps(summ), "static both sides:", len(static_moves), static_moves)
    for k, v in sorted(res.items()):
        if v["status"] != "static":
            print(" ", k, v["name"], v["status"], v.get("A"), v.get("firstScreenChangeAtOrAfterA"), "N", v["N"])
