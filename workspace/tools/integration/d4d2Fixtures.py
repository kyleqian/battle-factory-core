#!/usr/bin/env python3
"""ISSUES #151 D4 accounting: wrapper fixtures (sourceFixture + the measured CPU phase) so tools/integration/d4aTimingCheck.ts checks the banked
windows of a reclassified move against its faithful-timing policy. Phases are the banked measurements (no re-scouting):
- SHEER_COLD: the age-171 lag per window, tools/integration/fixtures/issue151/sheer-cold-counters.txt ("event" = lag present).
- HYPER_VOICE: the age-59 palette-upload band depth per window (docs/issue151-diagnosis.md s1: 16 = "event"; 15 / 0 = "no-event").
Shiny-battler windows are excluded (the adapters decline them: fallback, not a live window).
usage: d4d2Fixtures.py   -> tools/integration/fixtures/d4d2-live/<move>-*.json"""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parents[2]
OUT = R / "tools/integration/fixtures/d4d2-live"
OUT.mkdir(exist_ok=True)
DERIVED = "tools/integration/fixtures/species-audit-7/derived"
def wrap(move, tag, source, phase, extra=None):
    src = json.loads((R / source).read_text())
    fx = {"schema": "d4d2-timing-window/v1", "sourceFixture": source, "move": move, "timingPhase": phase,
          "attacker": src["attacker"], **(extra or {})}
    (OUT / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    return tag, phase
made = []
for line in (R / "tools/integration/fixtures/issue151/sheer-cold-counters.txt").read_text().splitlines():
    m = re.match(r"(\S+): window .* lag ages \[([\d, ]*)\]", line)
    if not m or m.group(1).startswith("shiny"): continue
    name, lag = m.group(1), "171" in m.group(2).split(", ")
    source = f"tools/integration/fixtures/sheer-cold-live/{name}.json" if name.startswith("sheer-cold-") else f"{DERIVED}/{name}.json"
    made.append(wrap("SHEER_COLD", name if name.startswith("sheer-cold-") else f"sheer-cold-a7-{name}", source, "event" if lag else "no-event"))
# Hyper Voice band depth (docs/issue151-diagnosis.md s1): 16 ("event") except PICHU / RATTATA attackers (0) and FLYGON / GOLBAT player-side attackers (15).
for f in sorted((R / "tools/integration/fixtures/q2-live").glob("hyper-voice-*.json")):
    made.append(wrap("HYPER_VOICE", f.stem, f"tools/integration/fixtures/q2-live/{f.name}", "event", {"bandDepth": 16, "timingPhases": {"palette-upload-scanline": "event"}}))
for f in sorted((R / DERIVED).glob("*-hyper-voice-*.json")):
    m = re.match(r"([a-z]+?)(A?)-hyper-voice-(player|opponent)-", f.name)
    sp, swapped_attacker, side = m.group(1), m.group(2) == "A", m.group(3)
    if sp.startswith("shiny"): continue
    depth = 0 if swapped_attacker and sp in ("pichu", "rattata") else 15 if swapped_attacker and sp in ("flygon", "golbat") and side == "player" else 16
    made.append(wrap("HYPER_VOICE", f"hyper-voice-a7-{f.stem}", f"{DERIVED}/{f.name}", "event" if depth == 16 else "no-event", {"bandDepth": depth, "timingPhases": {"palette-upload-scanline": "event" if depth == 16 else "no-event"}}))
for t in made: print(*t)
