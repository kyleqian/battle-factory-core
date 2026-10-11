#!/usr/bin/env python3
"""ret88: tools/integration/fixtures/ret88-live-receipt.json from the fixtures/ret88 receipts and the census shard dirs (ret88Census.sh).
usage: ret88Receipt.py <census-base-dir> <census-rung1-dir> <census-final-dir> <out.json>"""
import json, re, sys
from pathlib import Path

F = Path("tools/integration/fixtures/ret88")
base, r1, final, out = (Path(a) for a in sys.argv[1:5])
census = lambda d: {"commit": (d / "commit").read_text().strip(), "srcTree": (d / "src").read_text().strip(),
                    **json.loads((d / "merged.json").read_text())["overall"],
                    "battleDigest": json.loads((d / "merged.json").read_text())["battleDigest"],
                    "commandKeyDigest": json.loads((d / "merged.json").read_text())["commandKeyDigest"]}
flips = lambda name: {k: v for k, v in json.loads((F / name).read_text()).items() if not k.endswith("Commands")}
rows = lambda name: [l for l in (F / name).read_text().splitlines() if l.startswith("pb-")]
weak = rows("weak-windows-summary.txt")
live = [l for l in weak if " live=1 order" in l]
check = json.loads((F / "check.json").read_text())
receipt = {
    "schema": "ret88-live-receipt/v1",
    "doc": "docs/ret88-return-weak.md",
    "rung1": {"change": "Return 216 body declines unless returnPowerLevel(request.friendship) == 3 (ReturnStrongest)",
              "census": {"base": census(base), "rung1": census(r1)}, "flips": flips("census-flips-rung1.json")},
    "rung2": {
        "orderPlan": {"key": 40216, "plan": check["plans"]["body 216 weak"], "result": check["results"]["body 216 weak"],
                      "notIdenticalAB": check["notIdenticalAB"], "prediction": json.loads((F / "predictions.json").read_text())["prediction"]},
        "weakBodyWindows": {"windows": len(weak), "live": len(live), "live0px": sum(" px=0 " in l for l in live),
                            "rows88exact88": sum(" rows=88 exact=88 " in l for l in live), "r1EqR2": sum(" r1==r2=1 ages" in l for l in weak),
                            "declined": [re.sub(r"\s+", " ", l)[:200] for l in weak if " live=0 " in l]},
        "consumerLends": {"lines": [re.sub(r"\s+", " ", l) for l in (F / "consumer-lends-pi.txt").read_text().splitlines() if re.match(r"^pb-.*\.json\s+[A-Z_]+\s+live=", l)]},
        "consumerWindows": (F / "consumer-windows-summary.txt").read_text().splitlines()[-1],
        "parity": {s: {k: v for k, v in json.loads((F / f"parity-{s}.json").read_text()).items() if not isinstance(v, (list, dict))} for s in ("22", "171")},
    },
    "final": {"census": census(final), "flips": flips("census-flips.json")},
}
out.write_text(json.dumps(receipt, indent=1) + "\n")
print("receipt:", receipt["final"]["census"]["live"], "live;", receipt["rung2"]["weakBodyWindows"])
