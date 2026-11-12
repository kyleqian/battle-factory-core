#!/usr/bin/env python3
"""Confirm / refute REL-Y-STATIC for the unconfirmed NEEDS-KEYS (move, side) cells of relative-y-candidates.json (docs/sprite-order-rely-confirmation.md).
A NEEDS-KEYS destroy group whose members share the priority word but differ in y by a constant script-defined spread is order-static. A cell is CONFIRMED when
>= 2 distinct absolute-y geometries (old committed/ext scenario + new probes of other species pairs) give the SAME plan signature (window stream with destroy
orders) AND the same relative-y vector in every KEYS group; REFUTED (NEEDS-KEYS) when the plan or a relative-y vector differs; INCONCLUSIVE when no complete body
was produced or all geometries share one absolute fingerprint.
usage (from workspace/; direct mGBA, never the HTTP oracles):
  python3 tools/integration/spriteOrderRelYConfirm.py rank                      # ranked cell list -> fixtures/sprite-order-rely/ranking.json
  python3 tools/integration/spriteOrderRelYConfirm.py gen                       # scenarios for 2 new geometries per cell -> fixtures/sprite-order-rely/scenarios/
  OUT=/tmp/rely python3 tools/integration/spriteOrderRelYConfirm.py probe [--jobs 12] [--limit N]   # runs A and B per scenario (mGBA venv)
  OUT=/tmp/rely python3 tools/integration/spriteOrderRelYConfirm.py analyze [--write]            # verdicts, rows file, evidence"""
import collections, copy, glob, hashlib, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P, spriteOrderPlanCoverageRank as R

ROOT, FIX = P.ROOT, P.FIX
RELY = FIX / "sprite-order-rely"
OUT = Path(os.environ.get("OUT", "/tmp/rely"))
ONLY_Y = "equal priority word, different y (y is species/position dependent)"
TPL = {"player": FIX / "sprite-order-policy-gaps/scenarios/endeavor-player-onix-opponent-pidgeotto.json",
       "opponent": FIX / "sprite-order-policy-gaps/scenarios/endeavor-opponent-onix-player-pidgeotto.json"}
# (name, attacker species, other-side species): internal species ids (Dragonair 148, Diglett 50, Chansey 113, Onix 95, Pidgeotto 17)
GEOMS = [("dragonair-chansey", 148, 113), ("diglett-chansey", 50, 113), ("onix-pidgeotto", 95, 17)]
NEW_GEOMS = GEOMS
SEEDS = (11, 22, 33, 44, 55, 66)  # `retry`: alternate battle seeds for cells whose first scenarios produced no body (accuracy misses)
PY = os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/mgba-venv/bin/python"
SKIP = {0: "unattributed"}


def cells():
    cand = json.loads((FIX / "sprite-order-policy-gaps/relative-y-candidates.json").read_text())["bodies"]
    w = R.weights(); tot = 2 * sum(w.values()); names = {v: k for k, v in R.move_ids().items()}
    rows = []
    for k, r in cand.items():
        if r["verdict"].startswith("REL-Y-STATIC (single"):
            m, s = k.split(":")
            rows.append({"cell": k, "move": int(m), "side": s, "name": names.get(int(m), "?"), "weight": w.get(int(m), 0) / tot, "oldScenarios": r["scenarios"],
                         "oldAbsFingerprints": r["distinctAbsoluteYFingerprints"], "keysGroupsPerBody": r["keysGroupsPerBody"], "relativeY": r["relativeY"]})
    rows.sort(key=lambda r: (-r["weight"], r["move"], r["side"]))
    return rows


def scen_path(move, side, geom):
    return RELY / "scenarios" / f"{move}-{side}-{geom}.json"


def geoms_of(move, side):
    """geometry labels (scenario file suffixes) that exist for this cell"""
    pre = f"{move}-{side}-"
    return sorted(p.stem[len(pre):] for p in (RELY / "scenarios").glob(pre + "*.json"))


def gen(rows, seed=None, only=None):
    n = 0
    for r in rows:
        if r["move"] in SKIP or r["side"] not in ("player", "opponent") or (only is not None and r["cell"] not in only):
            continue
        for g0, a, o in NEW_GEOMS:
            g = g0 if seed is None else f"{g0}-s{seed}"
            d = json.loads(TPL[r["side"]].read_text())
            oth = "opponent" if r["side"] == "player" else "player"
            if seed is not None:
                d["seed"] = seed
            d["overrides"]["parties"][r["side"]][0].update(species=a, moves=[r["move"]] * 4)
            d["overrides"]["parties"][oth][0]["species"] = o
            for who, sp in ((r["side"], a), (oth, o)):
                d["overrides"]["parties"][who][0]["gender"] = "female" if sp == 113 else "male"  # Chansey is female-only
            scen_path(r["move"], r["side"], g).write_text(json.dumps(d, separators=(",", ":")) + "\n"); n += 1
    print("generated", n, "scenarios")


def probe(rows, jobs, limit):
    env = dict(os.environ, PYTHONPATH=os.environ.get("POKEBENCH_VENDOR_DIR", "../../vendor") + "/libmgba-py")
    OUT.mkdir(parents=True, exist_ok=True)
    work = []
    for r in rows[:limit]:
        for g in geoms_of(r["move"], r["side"]):
            for run in "AB":
                work.append((r["move"], r["side"], g, run))
    # run A of everything first (rank order), then B
    work.sort(key=lambda t: t[3])

    def one(t):
        m, s, g, run = t
        out = OUT / f"{m}-{s}-{g}-{run}.json"
        if out.exists():
            return
        sp = scen_path(m, s, g).relative_to(ROOT)
        subprocess.run([PY, "tools/compare/spriteOrderEventProbe.py", str(m), str(sp), str(out)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600)
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(one, work))
    print(len(work), "runs;", len(list(OUT.glob("*.json"))), "files in", OUT)


def body_facts(sc, m, side):
    """-> list of per-body dicts for the (m, side) bodies of a scenario: sig, rel vectors, abs fingerprint, why-set"""
    out = []
    T = P.tokenize_scenario(sc)
    for u, tw in zip(sc["units"], T):
        if u["kind"] != "body" or u["truncated"] or u.get("mv", 0) != m or P.ukey(sc, u) != f"{m}:{side}":
            continue
        rel, absy, why = [], [], set()
        for w, t in zip(u["windows"], tw):
            if t.get("cls") == "KEYS" and "G" in w and all(g[2] is not None for g in w["G"]):
                ys = [g[2] for g in w["G"]]
                rel.append([y - min(ys) for y in ys]); absy.append(min(ys)); why.add(t.get("why", ""))
            elif t.get("cls") == "KEYS":
                why.add(t.get("why", "keys missing"))
        out.append({"sig": P.sig(tw), "rel": rel, "abs": absy, "why": sorted(why)})
    return out


def sig_diff(facts):
    """first window where the most common plan and a deviating one differ"""
    by = collections.defaultdict(list)
    for f in facts:
        by[f[2]["sig"]].append(f[0])
    (a, la), (b, lb) = sorted(by.items(), key=lambda kv: -len(kv[1]))[:2]
    wa, wb = json.loads(a), json.loads(b)
    i = next((i for i, (x, y) in enumerate(zip(wa, wb)) if x != y), min(len(wa), len(wb)))
    enc = lambda w: json.dumps(w, separators=(",", ":"))
    return {"majority": la[:3], "other": lb[:3], "windows": [len(wa), len(wb)], "firstDifferingWindow": i, "majorityWindow": enc(wa[i]) if i < len(wa) else None, "otherWindow": enc(wb[i]) if i < len(wb) else None}


def old_facts():
    base = json.loads(P.TABLE.read_text())["scenarios"]
    ext = json.loads((FIX / "sprite-order-body-events-ext.json").read_text())["scenarios"]
    byc = collections.defaultdict(list)
    for sc in base + ext:
        T = P.tokenize_scenario(sc)
        for u in sc["units"]:
            if u["kind"] == "body" and not u["truncated"] and u.get("mv", 0):
                k = P.ukey(sc, u)
                if k not in byc or True:
                    byc[k].append(sc)
    return byc


def analyze(rows, write):
    old = old_facts()
    res, confirmed = [], {}
    for r in rows:
        m, s = r["move"], r["side"]
        facts = []  # (geometry label, run-identical?, body facts)
        for sc in old.get(r["cell"], []):
            for b in body_facts(sc, m, s):
                facts.append(("old:" + sc["file"], True, b))
        seen_old = len(facts)
        new_runs = {}
        for g in geoms_of(m, s):
            a, b_ = OUT / f"{m}-{s}-{g}-A.json", OUT / f"{m}-{s}-{g}-B.json"
            if not a.exists() or not b_.exists():
                new_runs[g] = {"status": "not probed"}; continue
            ident = a.read_bytes() == b_.read_bytes()
            new_runs[g] = {"status": "ok", "identical": ident, "sha256": hashlib.sha256(a.read_bytes()).hexdigest()[:16]}
            sc = P.extract_scenario("rely", str(a))
            if sc is None:
                new_runs[g]["bodies"] = 0; continue
            sc["side"], sc["file"] = s, a.name
            bs = body_facts(sc, m, s)
            new_runs[g]["bodies"] = len(bs)
            if ident:
                for b in bs:
                    facts.append(("new:" + g, True, b))
        newf = [f for f in facts[seen_old:]]
        row = {k: r[k] for k in ("cell", "move", "name", "side", "weight", "oldScenarios", "oldAbsFingerprints", "relativeY")}
        row["probes"] = new_runs
        if not newf:
            row.update(verdict="INCONCLUSIVE", why="no complete identical new body (" + json.dumps({g: v.get("bodies", v["status"]) for g, v in new_runs.items()}) + ")")
        else:
            sigs = {f[2]["sig"] for f in facts}; rels = {json.dumps(f[2]["rel"]) for f in facts}
            absf = {json.dumps(f[2]["abs"]) for f in facts}
            whys = {w for f in facts for w in f[2]["why"]}
            row["planByGeometry"] = {f[0]: hashlib.sha1(f[2]["sig"].encode()).hexdigest()[:6] + "/" + hashlib.sha1(json.dumps(f[2]["rel"]).encode()).hexdigest()[:4] for f in facts}
            row["newOnlyDistinctPlans"] = len({f[2]["sig"] for f in facts[seen_old:]})
            row.update(distinctPlans=len(sigs), distinctRelativeYVectors=len(rels), distinctAbsoluteYFingerprints=len(absf), newBodies=len(newf))
            if whys - {ONLY_Y}:
                row.update(verdict="NEEDS-KEYS", why="KEYS group not of the equal-word/different-y kind: " + ";".join(sorted(whys - {ONLY_Y})))
            elif len(sigs) > 1:
                row.update(verdict="NEEDS-KEYS", why="plan differs across geometries (%d distinct plans)" % len(sigs), difference=sig_diff(facts))
            elif len(rels) > 1:
                row.update(verdict="NEEDS-KEYS", why="relative-y vectors differ across geometries: " + " vs ".join(sorted(rels)))
            elif len(absf) < 2:
                labels = {f[0] for f in facts}
                if len(labels) >= 3:  # same plan and the same absolute y in every KEYS group over >= 3 species pairs: y does not depend on the picture geometry at all
                    row.update(verdict="CONFIRMED-ABS-INVARIANT", why="same plan, same relative-y and same absolute-y vectors over %d scenarios on different species pairs (y not species dependent)" % len(labels))
                    confirmed[r["cell"]] = {"plan": json.loads(next(iter(sigs))), "relativeY": json.loads(next(iter(rels))), "geometries": sorted(labels), "absFingerprints": sorted(absf), "tier": "abs-invariant"}
                else:
                    row.update(verdict="INCONCLUSIVE", why="all geometries share one absolute-y fingerprint (<3 scenarios)")
            else:
                row.update(verdict="CONFIRMED", why="same plan + same relative-y vectors over %d absolute geometries" % len(absf))
                plan = json.loads(next(iter(sigs)))
                confirmed[r["cell"]] = {"plan": plan, "relativeY": json.loads(next(iter(rels))), "geometries": sorted({f[0] for f in facts}), "absFingerprints": sorted(absf)}
        res.append(row)
    cnt = collections.Counter(x["verdict"] for x in res)
    print(dict(cnt), "confirmed weight", sum(x["weight"] for x in res if x["verdict"] == "CONFIRMED"))
    if write:
        (RELY / "verdicts.json").write_text(json.dumps({"schema": "sprite-order-rely-verdicts/v1", "counts": dict(cnt), "cells": res}, indent=1) + "\n")
        (RELY / "confirmed-plans.json").write_text(json.dumps(confirmed, indent=1) + "\n")
    return res, confirmed


def main(argv):
    rows = cells()
    cmd = argv[1] if len(argv) > 1 else "rank"
    opt = lambda n, d: int(argv[argv.index(n) + 1]) if n in argv else d
    if cmd == "rank":
        RELY.mkdir(exist_ok=True)
        (RELY / "ranking.json").write_text(json.dumps({"schema": "sprite-order-rely-ranking/v1", "cells": rows}, indent=1) + "\n")
        print(len(rows), "cells; total weight", sum(r["weight"] for r in rows))
        for r in rows[:25]:
            print(r["cell"], r["name"], round(r["weight"] * 100, 3), r["oldScenarios"], r["oldAbsFingerprints"])
    elif cmd == "gen":
        gen(rows)
    elif cmd == "retry":  # alternate seeds for the cells that produced no complete body so far
        v = json.loads((RELY / "verdicts.json").read_text())["cells"]
        need = {x["cell"] for x in v if x["verdict"] == "INCONCLUSIVE" and x["why"].startswith("no complete")}
        for sd in SEEDS:
            gen(rows, sd, need)
    elif cmd == "probe":
        probe(rows, opt("--jobs", 12), opt("--limit", len(rows)))
    elif cmd == "report":  # markdown tables from verdicts.json (docs/sprite-order-rely-confirmation.md)
        v = json.loads((RELY / "verdicts.json").read_text())["cells"]
        pct = lambda x: f"{x['weight'] * 100:.3f}%"
        print("| rank | cell | move | weight | tier | geometries | abs-y fingerprints |\n|---|---|---|---|---|---|---|")
        for i, x in enumerate([x for x in v if x["verdict"].startswith("CONFIRMED")][:int(argv[2]) if len(argv) > 2 else 20], 1):
            print(f"| {i} | {x['cell']} | {x['name']} | {pct(x)} | {'confirmed' if x['verdict'] == 'CONFIRMED' else 'abs-invariant'} | {len(x['planByGeometry'])} | {x['distinctAbsoluteYFingerprints']} |")
        print("\n| cell | move | weight | observed difference |\n|---|---|---|---|")
        for x in [x for x in v if x["verdict"] == "NEEDS-KEYS"]:
            d = x.get("difference")
            print(f"| {x['cell']} | {x['name']} | {pct(x)} | {x['why'][:110].replace('|', '/')}{' (first differing window ' + str(d['firstDifferingWindow']) + ' of ' + str(d['windows'][0]) + ')' if d else ''} |")
        print("\n| cell | move | weight | why inconclusive |\n|---|---|---|---|")
        for x in [x for x in v if x["verdict"] == "INCONCLUSIVE"]:
            print(f"| {x['cell']} | {x['name']} | {pct(x)} | {x['why'][:70]} |")
    elif cmd == "analyze":
        analyze(rows, "--write" in argv)


if __name__ == "__main__":
    main(sys.argv)
