#!/usr/bin/env python3
"""scan93: scanline-history scenarios (Extrasensory 326 / Memento 262 later bodies after each predecessor class).

The later58 recipe: the accepted mechanic lab scenarios, only the FOE lead's move list replaced, a 3-turn trace; the ROM computes every
outcome. Predecessor classes (the foe lead's moves x4):
  qa      Quick Attack 98 (priority +1): a non-scanline body first, so the move's turn-1 body is a later body on the intro residue.
  splash  Splash 150: a non-scanline body.
  psywave Psywave 149: a non-scanline body (psychic BG, no scanline write).
  xs      Extrasensory 326: an Extrasensory of the OTHER side (other window) before / after the move's own body.
  dd      Dragon Dance 349: an unmodelled scanline writer (invalidates the history).
  memento Memento 262 (Extrasensory bases only): the foe faints; MAGIKARP is sent in; the next body follows a Memento.
Memento bases: the Memento user's speed IV 0 (WEEZING 65 < ONIX 75), so the foe's body precedes the (single) Memento body.
Extrasensory elevated target: the prep30 ESPEON -> CROBAT player alternate (CROBAT elevation 6: window lines 2..66).
Every scenario carries an EXPLICIT lab "seed" (the base scenario's own; ISSUES #154). Writes tools/integration/fixtures/scan93/scenarios/.
"""
import json
from pathlib import Path

XS_VARIANTS = (("qa", 98), ("splash", 150), ("psywave", 149), ("xs", 326), ("dd", 349), ("memento", 262))
MEM_VARIANTS = (("qa", 98), ("psywave", 149), ("xs", 326), ("dd", 349))
BASES = [
    ("xs-pla-nuzleaf-shuckle", "tools/battle-lab/mechanic-extrasensory-player-nuzleaf-opponent-shuckle.json", "opponent", XS_VARIANTS, None),
    ("xs-opp-nuzleaf-shuckle", "tools/battle-lab/mechanic-extrasensory-opponent-nuzleaf-player-shuckle.json", "player", XS_VARIANTS, None),
    ("xs-pla-espeon-crobat", "tools/battle-lab/prep30-extrasensory-alt-player-espeon-crobat.json", "opponent", (("qa", 98), ("xs", 326)), None),
    ("mem-pla-weezing-onix", "tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json", "opponent", MEM_VARIANTS, "player"),
    ("mem-opp-weezing-onix", "tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json", "player", MEM_VARIANTS, "opponent"),
]
OUT = Path("tools/integration/fixtures/scan93/scenarios")
OUT.mkdir(parents=True, exist_ok=True)
for tag, path, foe, variants, slow in BASES:
    base = json.loads(Path(path).read_text())
    assert "seed" in base, path
    for variant, move in variants:
        s = json.loads(json.dumps(base))
        s["seed"] = base["seed"]  # explicit lab seed (ISSUES #154)
        s["overrides"]["parties"][foe][0]["moves"] = [move] * 4
        if slow is not None:
            s["overrides"]["parties"][slow][0]["ivs"]["speed"] = 0
        seg = []
        for turn in range(3):
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                    {"frames": 1300 if turn == 2 else 1100, "buttons": []}]
        s["trace"] = {"segments": seg}
        (OUT / f"{tag}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(list(OUT.glob("*.json"))))
