#!/usr/bin/env python3
"""Direct-mGBA event-probe sweep for the NOT-OBSERVED (move, side) pairs of real Factory Level-50 sets, by weight.
usage (from workspace/, mGBA venv): spriteOrderPlanCoverageProbe.py [outdir=/tmp/ev-ext] [--plans plans.json] [--repeat K=1] [--max-per-pair N=1] [--jobs J=6]
Scenario choice per pair: tools/battle-lab/mechanic-<move>-*.json whose attacker side (spriteOrderBodyPlans.side_of) is the pair's side, plus
tools/integration/fixtures/plan-coverage-scenarios/<move>-*.json (generated minimal scenarios). Raw rows are written to <outdir>/<id>-<stem>-<run>.json
(not committed). Never uses the HTTP oracles."""
import glob, json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P, spriteOrderPlanCoverageRank as R

args = [a for a in sys.argv[1:]]
def opt(n, d): return int(args[args.index(n) + 1]) if n in args else d
OUT = Path(next((a for a in args if not a.startswith("--") and not a.isdigit()), "/tmp/ev-ext")); OUT.mkdir(exist_ok=True)
PLANS = args[args.index("--plans") + 1] if "--plans" in args else None
args = [a for i, a in enumerate(args) if not (a == "--plans" or (i and args[i - 1] == "--plans"))]
REPEAT, PER, JOBS = opt("--repeat", 1), opt("--max-per-pair", 1), opt("--jobs", 6)


def jobs():
    plans = json.loads(Path(PLANS or R.FIX / "sprite-order-body-plans.json").read_text())
    w = R.weights(); names = {v: k for k, v in R.move_ids().items()}
    out, seen = [], set()
    for m in sorted(w, key=lambda m: -w[m]):
        slug = names[m].lower().replace("_", "-")
        for s in ("opponent", "player"):
            if R.verdict(plans, m, s) != "NOT-OBSERVED":
                continue
            fs = sorted(glob.glob(f"tools/battle-lab/mechanic-{slug}-*.json")) + sorted(glob.glob(f"tools/integration/fixtures/plan-coverage-scenarios/{slug}-*.json"))
            ok = [f for f in fs if P.side_of({"move": m, "scenario": f}) == s and f not in seen and json.loads(Path(f).read_text()).get("profile") == "battle-scene-on"][:PER]
            seen.update(ok)
            out += [(m, f) for f in ok]
    return out


def run(j):
    (m, sc), k = j
    subprocess.run([sys.executable, "tools/compare/spriteOrderEventProbe.py", str(m), sc, str(OUT / f"{m}-{Path(sc).stem}-{k}.json")],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    J = [(j, k) for j in jobs() for k in range(REPEAT)]
    with ThreadPoolExecutor(JOBS) as ex: list(ex.map(run, J))
    print(len(J), "runs,", len(list(OUT.glob("*.json"))), "rows written to", OUT)
