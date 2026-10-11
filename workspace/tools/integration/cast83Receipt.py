#!/usr/bin/env python3
"""cast83 (ISSUES #143, docs/cast83-castform-forms.md): the receipt of cast83Check.ts outputs. Per window: the scenario, the body, the
CASTFORM's role ("by" = it is the attacker, "at" = the other battler attacks) and form (the window's last CASTFORM_CHANGE), the opposing
species and orientation, the CHAIN lend's live decision / decline / rows / px and r1 == r2 (two fresh direct-mGBA probe processes), and the
ENTRY lend's px. Per (moveId, role, form) key: windows, Castform sides covered, live windows, total px, all r1 == r2.
usage: cast83Receipt.py <out.json> <check.json> ...
"""
import json, re, sys
from pathlib import Path

MOVE_IDS = {row["move"].removeprefix("MOVE_"): row["id"] for row in json.loads(Path("src/data/gen/moves.json").read_text())["moves"]}
windows, keys = [], {}
for path in sorted(sys.argv[2:], key=lambda p: Path(p).name):
    check = json.loads(Path(path).read_text())
    for row in check["rows"]:
        attacker, target = row["species"].split("/")
        forms = re.findall(r"CASTFORM_CHANGE\((\d+)\)", " ".join(row["history"]))
        role = "by" if attacker == "CASTFORM" else "at"
        castform_side = row["side"] if role == "by" else ("opponent" if row["side"] == "player" else "player")
        move_id = MOVE_IDS[row["move"]]
        form = int(forms[-1]) if forms else 0
        chain, entry = row["chain"], row["entry"]
        w = {"scenario": check["scenario"], "fixture": row["fixture"], "move": row["move"], "moveId": move_id, "role": role, "form": form,
             "castformSide": castform_side, "other": target if role == "by" else attacker, "live": chain["live"], "decline": chain["decline"],
             "rows": chain["rows"], "px": chain["px"], "same": chain["digests"][0] == chain["digests"][1], "entryLive": entry["live"],
             "entryPx": entry["px"]}
        windows.append(w)
        k = keys.setdefault(f"{move_id}:{role}:{form}", {"move": row["move"], "windows": 0, "live": 0, "sides": [], "px": 0, "liveExact": 0,
                                                          "allSame": True})
        k["windows"] += 1
        k["live"] += int(w["live"])
        k["liveExact"] += int(w["live"] and w["px"] == 0)
        k["px"] += w["px"] if w["live"] else 0
        k["allSame"] = k["allSame"] and w["same"]
        if castform_side not in k["sides"]:
            k["sides"].append(castform_side)
for k in keys.values():
    k["sides"].sort()
Path(sys.argv[1]).write_text(json.dumps({"schema": "cast83-receipt/v1", "keys": dict(sorted(keys.items())), "windows": windows}, indent=1) + "\n")
print(f"{len(windows)} windows, {len(keys)} keys, {sum(w['live'] and w['px'] == 0 for w in windows)} live 0 px")
