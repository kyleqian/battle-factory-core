#!/usr/bin/env python3
"""lb26: later-body lab scenarios for CURSE 174 (non-Ghost), WILL_O_WISP 261, PURSUIT 228 (normal body), both attacker sides.
Source = prep16-hist-psychup-{player,opp}-after-<pred> (the foe's predecessor acts first in turn 1; the Psych Up lead, Jumpluff, acts after it);
the lead's moves 244 -> the move under test, so the move runs once as body k after a single known predecessor (no own earlier body).
Writes tools/battle-lab/lb26-<move>-<s>-<pred>.json (s = attacker side p/o). Surf (57) = the BG-scrolling predecessor (Hyper Beam 63 has no production order plan: "Sprite order unknown", measured then dropped; (Earthquake 89 and Magnitude are no-ops: the Jumpluff lead is Flying, so no body runs; surf = prep16 hyperbeam template, moves swapped))."""
import json
from pathlib import Path
R = Path(__file__).resolve().parents[2]; L = R / "tools/battle-lab"
MOVES = {"curse": 174, "wisp": 261, "pursuit": 228}
PREDS = {"tackle": 33, "splash": 150, "psychic": 94, "growl": 45, "swordsdance": 14, "surf": 57}
for mv, mid in MOVES.items():
    for s in "po":
        for p, pid in PREDS.items():
            src = f"prep16-hist-psychup-{'player' if s == 'p' else 'opp'}-after-{'hyperbeam' if p == 'surf' else p}"
            d = json.loads((L / f"{src}.json").read_text()); P = d["overrides"]["parties"]
            side, foe = ("player", "opponent") if s == "p" else ("opponent", "player")
            assert P[side][0]["moves"] == [244] * 4; P[side][0]["moves"] = [mid] * 4
            if p == "surf": P[foe][0]["moves"] = [pid] * 4
            (L / f"lb26-{mv}-{s}-{p}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
