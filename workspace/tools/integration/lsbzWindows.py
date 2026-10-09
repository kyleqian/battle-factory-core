#!/usr/bin/env python3
"""lsbz: d4aTimingCheck wrapper windows (prep41 / d4tails / fa185 shape: { sourceFixture, move, denseWindow, timingPhases, timingPhase,
timingEvidence }) for every banked Light Screen (113) live window. OPPONENT attacker: the 10 live audit-15 chain windows (the Tackle /
Status_Burn routes decline in production: allocator host unknown, no live claim) + the accepted after-Tackle fixture. PLAYER attacker
(no timing parameter: every window must stay 0 px): the 3 audit-15 player chains, the accepted EXEGGCUTE / SLOWPOKE fixtures and the 3
derived species-audit SLOWPOKE targets (window / HP / gender corrected). The opponent phase label is the audit-15 measurement (receipts/main summary, two fresh runs: the
production hold renders 2,658 px on row 59 only = the write landed at once, "no-event"; 0 px = the buffered write, "event"; cross-checked
with receipts/vblank/table.txt where measured); the accepted fixture is the hold (0 px under it). Every window is the full live body
(activation .. activation + 87, 88 rows; the audit-15 windows were cut at 86). usage: python3 tools/integration/lsbzWindows.py"""
import json, os, re

OUT = "tools/integration/fixtures/lsbz/windows"
A15 = "tools/integration/fixtures/audit-15"
summary = {}
for line in open(f"{A15}/receipts/main/summary.txt"):
    m = re.match(r"(\S+light-screen-\S+)\.json\s+LIGHT_SCREEN\s+(\w+)\s.*live=(\d).*px=(\d+) r1==r2=1 ages=(\S+)", line)
    if m:
        summary[m.group(1)] = {"side": m.group(2), "live": m.group(3) == "1", "px": int(m.group(4)), "ages": m.group(5)}
vblank = {}
for block in open(f"{A15}/receipts/vblank/table.txt").read().split("== ")[1:]:
    name = block.split()[0]
    row59 = [l for l in block.splitlines() if l.strip().startswith("row  59")][0]
    vblank[name + "-c0"] = "event" if "waiting [82," in row59 else "no-event"
os.makedirs(OUT, exist_ok=True)
names = []
def emit(name, source, start, phase, side, evidence):
    # The accepted wrappers (light-screen-live-*.json: { sourceFixture, denseWindow }) nest one level: point at their banked source.
    while "sourceFixture" in json.load(open(source)):
        source = json.load(open(source))["sourceFixture"]
    out = {"sourceFixture": source, "move": "LIGHT_SCREEN", "denseWindow": {"startFrame": start, "endFrame": start + 87, "ageOffset": 0},
           "timingPhase": phase, **({"timingPhases": {"bg-write-row": phase}} if side == "opponent" else {}), "timingEvidence": evidence}
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(out, f, indent=1); f.write("\n")
    names.append(name)
for name, s in sorted(summary.items()):
    if not s["live"]:
        continue  # production decline (allocator host unknown after Tackle / Status_Burn): fallback, no live claim
    src = f"{A15}/fixtures/{name}.json"
    fx = json.load(open(src))
    if s["side"] == "opponent":
        assert (s["px"], s["ages"]) in ((0, "-"), (2658, "59..59")), (name, s)
        phase = "event" if s["px"] == 0 else "no-event"
        if name in vblank:
            assert vblank[name] == phase, (name, vblank[name], phase)
        ev = f"audit-15 receipts/main: production hold {s['px']} px (ages {s['ages']}), r1 == r2" + (f"; vblank row 59 {vblank[name]}" if name in vblank else "")
    else:
        assert s["px"] == 0, (name, s)
        phase = "no-event"
        ev = "player attacker (no timing parameter): audit-15 receipts/main 0 px, r1 == r2" + ("; vblank row 59 direct" if name in vblank else "")
    emit("light-screen-a15-" + name[:-3], src, fx["denseWindow"]["startFrame"], phase, s["side"], ev)
emit("light-screen-accepted-opponent", "tools/integration/fixtures/light-screen-live-opponent.json", 213, "event", "opponent",
     "accepted EXEGGCUTE / ONIX after Tackle: 0 px under the hold (88 rows); audit-15 patch-ls-nohold 0 -> 2,658 px on row 59; vblank acc-tackle row 59 buffered [0x52]")
for src in ["tools/integration/fixtures/light-screen-live-player.json", "tools/integration/fixtures/light-screen-live-slowpoke-player.json",
            "tools/integration/fixtures/species-audit/derived/light-screen-live-slowpoke-player.json",
            "tools/integration/fixtures/species-audit/derived-golbat/light-screen-live-slowpoke-player.json",
            "tools/integration/fixtures/species-audit/derived-shuckle/light-screen-live-slowpoke-player.json"]:
    w = json.load(open(src))["denseWindow"]
    assert w["endFrame"] == w["startFrame"] + 87, (src, w)
    tag = src.split("/")
    emit("light-screen-" + (tag[-2] + "-" if "species-audit" in src else "") + tag[-1][:-5].replace("light-screen-", ""), src, w["startFrame"], "no-event", "player",
         "player attacker (no timing parameter): accepted / species-audit window, 0 px")
# (B) Blizzard opponent at impact start != 197: the lsbz grid pairs (lsbzBlizzardStage.py; predictions committed before the probes) + the
# geoice impact-196 / 198 controls. Phase = the fresh counters (r0 == r1): the optional restore lag at impact + 139 present ("event", the
# policy phase: impact + 164 rows) or absent ("no-event": the ROM body ends one row earlier, impact + 163 rows).
counters = {e["scenario"]: e for e in json.load(open("tools/integration/fixtures/lsbz/blizzard-counters.json"))}
counters.update({e["scenario"]: e for e in json.load(open("tools/integration/fixtures/d4tails/counters.json"))})
grid = {(g["attacker"], g["target"]): g for g in json.load(open("tools/integration/fixtures/lsbz/blizzard-grid-predictions.json"))["grid"]}
# ARBOK -> CATERPIE (impact 198, the geoice ROM length control) is NOT a window here: every row of it differs by the same static 133 px
# (bbox x 98..221 y 33..103, a battler palette region; identical at every age), outside the Blizzard program (lsbz-live-receipt.json
# blizzard.excluded); its 362-row body matches the rule.
CONTROLS = {"tools/integration/fixtures/geoice/controls/blizzard-opponent-weezing-blastoise.json": 196}
blizzard = [(f"tools/integration/fixtures/lsbz/blizzard/{n}", None) for n in sorted(os.listdir("tools/integration/fixtures/lsbz/blizzard"))
            if n.startswith("blizzard-opponent-")] + [(p, i) for p, i in CONTROLS.items()]
for src, impact in blizzard:
    fx = json.load(open(src))
    impact = impact if impact is not None else fx["lsbz"]["impactStartAge"]
    c = counters[fx["scenario"]]
    body = [b for b in c["bodies"] if b["move"] == "BLIZZARD"]
    assert len(body) == 1 and c["r0EqualsR1"], src
    body = body[0]
    lag = impact + 139 in body["lagAges"]
    assert body["lagAges"] == ([impact + 139, impact + 160, impact + 161] if lag else [impact + 159, impact + 160]), (src, body)
    assert body["bodyRows"] == impact + (163 if lag else 162) and body["activation"] == fx["denseWindow"]["startFrame"], (src, body)
    start = fx["denseWindow"]["startFrame"]
    name = src.split("/")[-1][:-5]
    out = {"sourceFixture": src, "move": "BLIZZARD", "denseWindow": {"startFrame": start, "endFrame": start + impact + (163 if lag else 162), "ageOffset": 0},
           "timingPhase": "event" if lag else "no-event", "impactStartAge": impact,
           "timingEvidence": f"lsbz counters {c['scenario']}: body {body['bodyRows'] + 1} rows, lag ages {body['lagAges']}, r0 == r1; impact {impact}"}
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(out, f, indent=1); f.write("\n")
    names.append(name)
print("\n".join(f"{OUT}/{n}.json" for n in sorted(names)))
