#!/usr/bin/env python3
"""Extended per-body plans: committed event table + new (move, side) scenarios, written to NEW files only (spriteOrderBodyPlans.py is reused, not edited).
  tools/integration/fixtures/sprite-order-body-events-ext.json  compact event table of the NEW scenarios only
  tools/integration/fixtures/sprite-order-body-plans-ext.json   plans/verdicts/replay over committed table + ext table (same schema, + per-body `provenance`)
usage (from workspace/, pure python3 for the default form):
  python3 tools/integration/spriteOrderBodyPlansExt.py                    # ext table + committed table -> plans-ext, prints summary (no write)
  python3 tools/integration/spriteOrderBodyPlansExt.py --write            # also writes plans-ext
  python3 tools/integration/spriteOrderBodyPlansExt.py --extra /tmp/ev-ext [--extra DIR] --write   # re-extract ext table from raw probe rows first
"""
import json, sys, hashlib, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import spriteOrderBodyPlans as P

EXT_TABLE = P.FIX / "sprite-order-body-events-ext.json"
EXT_PLANS = P.FIX / "sprite-order-body-plans-ext.json"


def main(argv):
    extras = [argv[i + 1] for i, a in enumerate(argv) if a == "--extra"]
    if extras:
        sc = []
        for d in extras:
            for f in sorted(Path(d).glob("*-0.json")):
                r = P.extract_scenario("ext", str(f))
                if r:
                    sc.append(r)
        ext = {"schema": "sprite-order-body-events/v1", "note": "NEW scenarios only (see docs/sprite-order-plan-coverage.md); regenerate: spriteOrderBodyPlansExt.py --extra DIR --write", "scenarios": sc}
        EXT_TABLE.write_text(json.dumps(ext, separators=(",", ":")) + "\n")
        print("wrote", EXT_TABLE, EXT_TABLE.stat().st_size, "bytes", len(sc), "scenarios")
    base = json.loads(P.TABLE.read_text())
    ext = json.loads(EXT_TABLE.read_text())
    union = dict(base, scenarios=base["scenarios"] + ext["scenarios"])
    tmp = Path(tempfile.mkdtemp()) / "sprite-order-body-events-union.json"
    tmp.write_text(json.dumps(union, separators=(",", ":")) + "\n")
    P.TABLE, P.PLANS = tmp, tmp.with_name("plans-union.json")  # reuse the extractor/classifier/replay unchanged, redirected
    P.main(["x", "--write"])
    out = json.loads(P.PLANS.read_text())
    out["schema"] = "sprite-order-body-plans/v1"
    out["table"] = {"scenarios": len(union["scenarios"]), "committedScenarios": len(base["scenarios"]), "extScenarios": len(ext["scenarios"]),
                    "committedTableSha256": hashlib.sha256(Path(__file__).with_name("fixtures").joinpath("sprite-order-body-events.json").read_bytes()).hexdigest(),
                    "extTableSha256": hashlib.sha256(EXT_TABLE.read_bytes()).hexdigest()}
    prov = {}
    for origin, scs in (("committed", base["scenarios"]), ("ext", ext["scenarios"])):
        for sc in scs:
            for u in sc["units"]:
                if u["kind"] == "body" and not u["truncated"]:
                    p = prov.setdefault(P.ukey(sc, u), {"committed": [], "ext": []})
                    p[origin].append(sc["file"])
    for k, b in out["bodies"].items():
        p = prov.get(k, {"committed": [], "ext": []})
        b["provenance"] = {"source": "committed+ext" if p["committed"] and p["ext"] else "ext" if p["ext"] else "committed",
                           "committedScenarios": len(p["committed"]), "extScenarios": sorted(p["ext"])}
    out["note"] = "committed table + ext table; produced by tools/integration/spriteOrderBodyPlansExt.py"
    if "--write" in argv:
        EXT_PLANS.write_text(json.dumps(out, indent=1) + "\n")
        print("wrote", EXT_PLANS, EXT_PLANS.stat().st_size, "bytes")


if __name__ == "__main__":
    main(sys.argv)
