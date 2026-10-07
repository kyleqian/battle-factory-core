#!/usr/bin/env python3
"""lb21: extend the prep16-hist-{overheat,psychup} lab scenarios with extra turns (same lead mons/moves/seed) so Overheat / Psych Up
runs as a LATER body after >= 3 distinct predecessors. Writes tools/battle-lab/lb21-<tag>.json (trace: the turn pair repeated TURNS times)."""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]; L = R / "tools/battle-lab"
TURNS = int(sys.argv[1]) if len(sys.argv) > 1 else 3
CASES = {  # tag: source scenario
  # oh2: Overheat user = the Psych Up lead (Jumpluff) of the psychup lab scenario, acting AFTER the foe's predecessor in turn 1 (no own earlier Overheat:
  # a prior own Overheat has no production sprite-order plan -> the order lend is unknown -> production declines regardless of the first-body gate).
  **{f"oh2-{s}-{p}": f"prep16-hist-psychup-{'player' if s == 'p' else 'opp'}-after-{p}" for s in "po" for p in ("tackle", "splash", "psychic", "growl", "swordsdance")},
  **{f"pu-o-{p}": f"prep16-hist-psychup-opp-after-{p}" for p in ("tackle", "splash", "psychic", "growl", "swordsdance")},
  "pu-o-first": "prep16-hist-psychup-opp-first-shuckle",
}
for tag, src in CASES.items():
    d = json.loads((L / f"{src}.json").read_text()); seg = d["trace"]["segments"]
    d["trace"]["segments"] = seg
    if tag.startswith("oh2-"):  # the Psych Up (244) lead of the attacking side becomes Overheat (315)
        side = "player" if tag[4] == "p" else "opponent"; mv = d["overrides"]["parties"][side][0]["moves"]; assert mv == [244] * 4, mv
        d["overrides"]["parties"][side][0]["moves"] = [315] * 4
    (L / f"lb21-{tag}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
    print(tag, src, len(seg), "->", len(d["trace"]["segments"]))
