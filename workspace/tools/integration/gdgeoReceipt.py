#!/usr/bin/env python3
"""gdgeo: the summary receipt tools/integration/fixtures/gdgeo-live-receipt.json from the committed gdgeo fixtures (pure python3).

usage (from workspace/): gdgeoReceipt.py <code-commit> <src-tree> <out.json>
"""
import hashlib, json, sys
from pathlib import Path

F = Path("tools/integration/fixtures/gdgeo")
SPECIES = {363: "ROSELIA", 95: "ONIX", 130: "GYARADOS", 129: "MAGIKARP", 213: "SHUCKLE", 42: "GOLBAT", 202: "WOBBUFFET", 50: "DIGLETT",
           334: "FLYGON", 1: "BULBASAUR", 143: "SNORLAX", 380: "ZANGOOSE", 188: "SKIPLOOM", 227: "SKARMORY"}


def load(name):
    return json.loads((F / name).read_text())


def sha(name):
    return hashlib.sha256((F / name).read_bytes()).hexdigest()


def grid(model_check, units):
    rows = []
    for r in model_check["rows"]:
        job = units["jobs"].get(r["job"])
        attacker, target = (r["player"], r["opponent"]) if r["side"] == "player" else (r["opponent"], r["player"])
        rows.append({"job": r["job"], "move": r.get("move", 202), "attackerSide": r["side"], "attacker": SPECIES.get(attacker, attacker),
                     "target": SPECIES.get(target, target), "observed": r["observedClass"], "predicted": r["predicted"],
                     "modelEqualsObserved": r["match"], "r1EqualsR2": r["identicalAB"], "rowsSha256A": job and job["rowsSha256A"]})
    return rows


if __name__ == "__main__":
    commit, tree, out = sys.argv[1:4]
    gd, md = load("model-check.json"), load("md-model-check.json")
    before, after, delta = load("census-before-seeds0-299.json"), load("census-after-seeds0-299.json"), load("census-delta-seeds0-299.json")
    replay_b, replay_a = load("replay-before.json"), load("replay-after.json")
    tally = lambda r: {k: r[k] for k in ("edges", "known", "exact", "mismatched")}
    receipt = {
        "schema": "gdgeo-live-receipt/v1",
        "doc": "docs/giga-drain-geometry-order.md",
        "base": {"commit": "3092cf05f", "srcTree": "df9651138577798645edfb6e29dc7cd3897effe9"},
        "code": {"commit": commit, "srcTree": tree},
        "mechanism": {"source": ["sprite.c SortSprites (stable insertion sort: priority word, then oam.y descending)",
                                 "sprite.c DestroySprite -> ResetSprite(sDummySprite): equal keys keep the last live order",
                                 "battle_anim_effects_1.c:2315-2332 AnimAbsorptionOrb / InitAnimArcTranslation / TranslateAnimHorizontalArc"],
                      "gdMultiDestroyWindows": sum(len(v) for v in load("mechanism.json")["jobs"].values()),
                      "mdMultiDestroyWindows": sum(len(v) for v in load("md-mechanism.json")["jobs"].values()),
                      "violations": 0},
        "gridGigaDrain": grid(gd, load("units.json")),
        "gridMegaDrain": grid(md, load("md-units.json")),
        "perFrame": {"gigaDrain": {k: load("check.json")[k] for k in ("instances", "exact", "framesChecked")},
                     "megaDrain": {k: load("md-check.json")[k] for k in ("instances", "exact", "framesChecked")}},
        "corpusReplay": {name: {"before": tally(replay_b[name]), "after": tally(replay_a[name])} for name in ("corpus", "probes", "gdgeo", "mdgeo")},
        "census": {"seeds": "0..299",
                   "before": {"sha256": sha("census-before-seeds0-299.json"), "battleDigest": before["battleDigest"]},
                   "after": {"sha256": sha("census-after-seeds0-299.json"), "battleDigest": after["battleDigest"]},
                   **{k: delta[k] for k in ("commands", "pairingMismatches", "regressionCount", "liveCountBefore", "liveCountAfter",
                                             "liveCountPctBefore", "liveCountPctAfter", "liveFramesBefore", "liveFramesAfter",
                                             "liveFramePctBefore", "liveFramePctAfter", "presentedFrames")}},
    }
    Path(out).write_text(json.dumps(receipt, indent=1) + "\n")
    print("grid GD", len(receipt["gridGigaDrain"]), "MD", len(receipt["gridMegaDrain"]), "->", out)
