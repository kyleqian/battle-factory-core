#!/usr/bin/env python3
"""d4tails: d4aTimingCheck wrapper windows (prep41 windows shape: { sourceFixture, move, denseWindow, timingPhase, timingEvidence }) for every
banked Icy Wind / Blizzard live window (geoice grid + controls in the live scope, prep2 accepted, altspecies3) and the accepted Confuse Ray
fixtures. The phase comes from the committed counters (d4tailsCounters.py: the optional lag present in the body or not), cross-checked
against the uninstrumented geoice ROM interval (body rows + 1 = romInterval rows). A long body keeps the live window; a short body's
window is its ROM body (activation .. first inactive). usage: python3 tools/integration/d4tailsWindows.py (from workspace/)"""
import json, os

COUNTERS = "tools/integration/fixtures/d4tails/counters.json"
OUT = "tools/integration/fixtures/d4tails/windows"
LAG = {"ICY_WIND": {"player": 261, "opponent": 261}, "BLIZZARD": {"player": 347, "opponent": 336}}
counters = {os.path.basename(e["scenario"])[:-5]: e for e in json.load(open(COUNTERS))}
geoice = json.load(open("tools/integration/fixtures/geoice-live-receipt.json"))
rom = {e["fixture"]: e["romInterval"] for e in geoice["grid"] + geoice["controls"]}
jobs = [(e["fixture"], e["fixture"]) for e in geoice["grid"] + geoice["controls"]
        if e["case"] not in ("blizzard-opponent-arbok-caterpie", "blizzard-opponent-weezing-blastoise")]  # impact start != 197: declined
for m in ("icy-wind", "blizzard"):
    for s in ("player", "opponent"):
        jobs.append((f"tools/integration/fixtures/prep2-{m}-{s}.json", f"tools/integration/fixtures/prep2-{m}-{s}.json"))
jobs.append(("tools/compare/fixtures/altspecies3-icy-wind-opponent-poliwhirl-player-onix.json",
             "tools/integration/fixtures/altspecies3-icy-wind-opponent-poliwhirl-player-onix.json"))
os.makedirs(OUT, exist_ok=True)
names = []
for source, label in jobs:
    fx = json.load(open(source))
    stem = os.path.basename(fx["scenario"])[:-5]
    body = [b for b in counters[stem]["bodies"] if b["move"] == fx["move"]]
    assert len(body) == 1 and counters[stem]["r0EqualsR1"], stem
    body = body[0]
    side = fx["attacker"]["geometry"]["side"]
    lag = LAG[fx["move"]][side] in body["lagAges"]
    w = fx["denseWindow"]
    assert w["startFrame"] == body["activation"], (stem, w, body)
    if source in rom:
        assert rom[source]["end"] - rom[source]["start"] == body["bodyRows"], (stem, rom[source], body)
    end = w["endFrame"] if lag else body["activation"] + body["bodyRows"]  # the short body's first inactive row
    name = os.path.basename(label)[:-5]
    out = {"sourceFixture": source, "move": fx["move"], "denseWindow": {"startFrame": w["startFrame"], "endFrame": end, "ageOffset": 0},
           "timingPhase": "event" if lag else "no-event",
           "timingEvidence": f"d4tails counters {stem}: body {body['bodyRows'] + 1} rows, lag ages {body['lagAges']}, r0 == r1"}
    json.dump(out, open(f"{OUT}/{name}.json", "w"), indent=1); open(f"{OUT}/{name}.json", "a").write("\n")
    names.append(name)
for side, opp in (("player", "opponent"), ("opponent", "player")):
    name = f"confuse-ray-{side}-chinchou-{opp}-onix"
    stem = f"mechanic-confuse-ray-{side}-chinchou-{opp}-onix"
    body = [b for b in counters[stem]["bodies"] if b["move"] == "CONFUSE_RAY"][0]
    out = {"sourceFixture": f"tools/compare/fixtures/{name}.json", "move": "CONFUSE_RAY",
           "timingPhase": "event" if body["bodyRows"] == 269 else "no-event",
           "timingEvidence": f"d4tails counters {stem}: body {body['bodyRows'] + 1} rows, lag ages {body['lagAges']}, r0 == r1 (accepted exact fixture, whole probe window)"}
    json.dump(out, open(f"{OUT}/{name}.json", "w"), indent=1); open(f"{OUT}/{name}.json", "a").write("\n")
    names.append(name)
print("\n".join(f"{OUT}/{n}.json" for n in sorted(names)))
