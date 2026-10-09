#!/usr/bin/env python3
"""fa185: d4aTimingCheck wrapper windows (prep41 / d4tails shape: { sourceFixture, move, denseWindow, timingPhase, timingEvidence }) for every
banked Faint Attack live window: the S10A sides opponent fixtures, altspecies3 player, the prep11 / species-audit prep6-alt-base player bodies (the
derived-shuckle fixture is the staged SHUCKLE scenario again: not repeated)
and the accepted prep6 player body. The phase comes from the committed d4tails counters (the optional lag at 205 present in the body or not;
r0 == r1); the accepted prep6 body (a staged probe, not counter-instrumentable) is labelled by pixels (0 px under the long body, d4tails
receipt faintAttack.perSide.player). The live window starts 4 rows after activation; a long body (226 rows activation .. first inactive)
keeps the 221-row live window, a short body (225) ends one row earlier (its last active row). usage: python3 tools/integration/fa185Windows.py"""
import json, os

COUNTERS = "tools/integration/fixtures/d4tails/counters.json"
OUT = "tools/integration/fixtures/fa185/windows"
LAG = 205
counters = {e["scenario"]: e for e in json.load(open(COUNTERS))}
jobs = [
    "tools/integration/fixtures/s10a-live/faint-attack-alt-opponent-delcatty-player-golem.json",
    "tools/integration/fixtures/s10a-live/faint-attack-alt-opponent-golbat-player-golem.json",
    "tools/integration/fixtures/s10a-live/faint-attack-opponent-grovyle-player-onix.json",
    "tools/compare/fixtures/altspecies3-faint-attack-player-murkrow-opponent-onix.json",
    "tools/compare/fixtures/altspecies3-faint-attack-player-onix-opponent-grovyle.json",
    "tools/integration/fixtures/prep11/audit/audit-golem-prep6-faint-attack-alt-base.json",
    "tools/integration/fixtures/species-audit/staged/golbat-prep6-faint-attack-alt-base.json",
    "tools/integration/fixtures/species-audit/staged/golem-prep6-faint-attack-alt-base.json",
    "tools/integration/fixtures/species-audit/staged/shuckle-prep6-faint-attack-alt-base.json",
]
os.makedirs(OUT, exist_ok=True)
names = []
def emit(name, source, w, lag, evidence):
    end = w["startFrame"] + (220 if lag else 219)
    assert w["endFrame"] == w["startFrame"] + 220, (source, w)
    out = {"sourceFixture": source, "move": "FAINT_ATTACK", "denseWindow": {"startFrame": w["startFrame"], "endFrame": end, "ageOffset": 0},
           "timingPhase": "event" if lag else "no-event", "timingEvidence": evidence}
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(out, f, indent=1); f.write("\n")
    names.append(name)
for source in jobs:
    fx = json.load(open(source))
    c = counters[fx["scenario"]]
    body = [b for b in c["bodies"] if b["move"] == "FAINT_ATTACK"]
    assert len(body) == 1 and c["r0EqualsR1"], source
    body = body[0]
    lag = LAG in body["lagAges"]
    assert body["bodyRows"] == (225 if lag else 224), (source, body)
    w = fx["denseWindow"]
    # The prep6-alt-base fixtures keep the staged prep6 frame base (2344..2564), but their probe (run-battle-lab-rgb.py) runs the battle-lab
    # scenario on the counters' frame base (activation 76, the s10a sides convention): rebase the window from the counted activation.
    if "prep6-faint-attack-alt-base" in source:
        w = {"startFrame": body["activation"] + 4, "endFrame": body["activation"] + 224}
    else:
        assert w["startFrame"] == body["activation"] + 4 and body["lastActive"] == w["startFrame"] + (220 if lag else 219), (source, w, body)
    tag = source.split("/")
    name = ("species-audit-" + tag[-2] + "-" if "species-audit" in source else "") + tag[-1][:-5]
    emit(name, source, w, lag, f"d4tails counters {fx['scenario']}: body {body['bodyRows'] + 1} rows, lag ages {body['lagAges']}, r0 == r1")
fx = json.load(open("tools/integration/fixtures/prep6-faint-attack-player.json"))
emit("prep6-faint-attack-player", "tools/integration/fixtures/prep6-faint-attack-player.json", fx["denseWindow"], True,
     "accepted staged prep6 body (not counter-instrumentable): 0 px under the long body on all 221 rows (d4tails-live-receipt.json faintAttack.perSide.player)")
print("\n".join(f"{OUT}/{n}.json" for n in sorted(names)))
