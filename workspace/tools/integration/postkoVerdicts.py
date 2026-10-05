#!/usr/bin/env python3
"""Merge the post-KO consumer table, model checks and what-if receipts into fixtures/postko/verdicts.json (pure python3; docs/postko-consumer-audit.md s3).

Verdict per probed (move, side): GENERALIZES = the current adapter code with the raw post-unit lend (tracker F) or with no lend (ungated) is exact
over the full accepted window; NEEDS-PARAM = exact only with the entry-label lend pi(F) (postkoWhatIf.ts "relabel") / entry-label allocator input.
Unprobed members get "class-inferred" verdicts from the relabel-isomorphism argument (doc s3.2), never a measured claim.
usage: postkoVerdicts.py [--write]
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures"
PROBED = [  # draft fixture, side, lends whose receipts decide the verdict
    ("flamethrower-player", ["rung2", "none"]), ("rock-tomb-player", ["none"]), ("thunderbolt-opponent", ["rung2", "relabel"]),
    ("giga-drain-opponent", ["rung2", "relabel"]), ("double-team-player", ["rung2", "relabel"]), ("swift-player", ["rung2", "relabel"]),
    ("swift-opponent", ["rung2", "relabel"]), ("light-screen-player", ["relabel"]), ("protect-player", ["relabel"]),
    ("rock-slide-opponent", ["none", "relabel"]), ("sunny-day-player", ["rung2", "relabel"]), ("dragon-dance-player", ["rung2", "relabel"]),
    ("fire-blast-player", ["rung2", "relabel"]),
]


def main():
    table = json.loads((FX / "postko/consumer-table.json").read_text())
    rows = []
    for name, lends in PROBED:
        draft = json.loads((FX / f"postko-{name}.json").read_text())
        check = json.loads((ROOT / draft["modelCheck"]).read_text())
        edge = next(e for e in check["edges"] if e.get("riseFrame") == draft["edgeRiseFrame"])
        receipts = {}
        for lend in lends:
            w = json.loads((FX / f"postko/whatif-{name}.whatif-{lend}.json").read_text())
            receipts[lend] = {"rows": w["rows"], "exactRows": w["exactRows"], "residualPixels": w["residualPixels"], "digest": w["digest"]}
        exact = {k: v["rows"] == v["exactRows"] and v["residualPixels"] == 0 for k, v in receipts.items()}
        if exact.get("rung2") or exact.get("none"):
            verdict = "GENERALIZES"
        elif exact.get("relabel"):
            verdict = "NEEDS-PARAM (entry-label lend pi(F))" if draft["move"] not in ("LIGHT_SCREEN", "PROTECT") else "NEEDS-PARAM (allocator host: post-unit view or entry-label input)"
        else:
            verdict = "NEEDS-NEW"
        rows.append({"move": draft["move"], "side": draft["attacker"]["geometry"]["side"], "scenario": draft["scenario"], "edge": draft["edgeRiseFrame"],
                     "window": draft["denseWindow"], "modelMismatches": edge.get("mismatches"), "trackerKnown": edge.get("known"),
                     "edgeChecks": edge.get("checks"), "whatIf": receipts, "verdict": verdict})
    probed_names = {r["move"] for r in rows}
    inferred = []
    for r in table["rows"]:
        if r["name"] in probed_names:
            continue
        cls = r["classes"]
        if r["gate"] == "allocator":
            v = "class-inferred NEEDS-PARAM (allocator host post-unit view / entry-label input; Light Screen + Protect measured)"
        elif r["gate"] == "none":
            v = "class-inferred GENERALIZES (ungated; renders today; Rock Tomb, Rock Slide, Flamethrower measured exact)"
        elif r["postKo"]["currentCodeUnderPostKoLend"].startswith("self-declines"):
            v = "class-inferred NEEDS-PARAM (entry-label lend pi(F); self-declines on raw F like Thunderbolt/Giga Drain/Sunny Day/Dragon Dance)"
        else:
            v = "class-inferred GENERALIZES under pi(F) (raw-F behaviour unmeasured)"
        inferred.append({"move": r["name"], "id": r["move"], "classes": cls, "gate": r["gate"], "usageSharePct": r["usageSharePct"], "verdict": v})
    doc = {"schema": "postko-verdicts/v1", "probed": rows, "classInferred": inferred,
           "summary": {"probed": len(rows), "generalizes": sum(r["verdict"] == "GENERALIZES" for r in rows),
                       "needsParam": sum(r["verdict"].startswith("NEEDS-PARAM") for r in rows), "needsNew": sum(r["verdict"] == "NEEDS-NEW" for r in rows),
                       "allExactUnderRelabelOrToday": all(any(v["rows"] == v["exactRows"] for k, v in r["whatIf"].items() if k in ("relabel", "none")) for r in rows),
                       "modelMismatchesAtRelyEdges": sum((r["modelMismatches"] or 0) for r in rows if r["trackerKnown"])}}
    if "--write" in sys.argv:
        (FX / "postko/verdicts.json").write_text(json.dumps(doc, indent=1) + "\n")
    for r in rows:
        print(r["move"], r["side"], r["edge"], "model", r["modelMismatches"], "known", r["trackerKnown"],
              {k: f'{v["exactRows"]}/{v["rows"]}' for k, v in r["whatIf"].items()}, r["verdict"])
    print(json.dumps(doc["summary"]))


if __name__ == "__main__":
    main()
