#!/usr/bin/env python3
"""prep18: alternate-species lab scenarios for the Random2 plan check (player attacker AND opponent target species swapped; INTERNAL species ids
from species.h, as prep11AltScenarios.py). The scenario trace/moves are the accepted ones; the alternate is chosen BEFORE any probe, never by
matching live output. Writes tools/battle-lab/prep18-<move>-alt-<attacker>-<target>.json (new files)."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
import sys
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
ALT = {  # chosen before probing: (accepted scenario, new player attacker, new opponent target)
    "dig": ("mechanic-dig-player-vibrava-opponent-chansey.json", "FLYGON", "GOLEM"),
    "megahorn": ("mechanic-megahorn-player-seaking-opponent-onix.json", "HERACROSS", "GOLEM"),
    "will-o-wisp": ("mechanic-will-o-wisp-player-shuppet-opponent-shuckle.json", "BANETTE", "GOLEM"),
    "fury-cutter": ("mechanic-fury-cutter-player-grovyle-opponent-blissey.json", "SCYTHER", "GOLEM"),
    "return": ("mechanic-return-player-dragonair-opponent-onix.json", "SNORLAX", "GOLEM"),
    "pursuit": ("mechanic-pursuit-player-beedrill-opponent-shuckle.json", "UMBREON", "GOLEM"),
}
for move, (src, att, tgt) in ALT.items():
    s = json.loads((LAB / src).read_text())
    if "parties" not in s["overrides"]:
        b = (s["playerSetIds"][0], s["opponentSetIds"][0])
        # first (player, opponent) Factory-set pair, in fixed ascending order, that the lab's team-legality rules accept (never output-chosen)
        for pset in (156,):  # player party [pset,188 BRIGHT_POWDER,184 LAX_INCENSE]; opponent [oset,149 LAX_INCENSE,180 BRIGHT_POWDER]: held items must differ
            for oset in (146,):  # FOCUS_BAND, a different species and item from both lists (ONIX/SITRUS for the player)
                t = json.loads(json.dumps(s))
                t["playerSetIds"][0], t["opponentSetIds"][0] = pset, oset
                try:
                    validate_request(t, "battle-scene-on")
                except ValueError:
                    continue
                s = t
                break
            else:
                continue
            break
        else:
            raise SystemExit(f"{move}: no legal set pair")
        att, tgt = f"set{s['playerSetIds'][0]}", f"set{s['opponentSetIds'][0]}"
        out = LAB / f"prep18-{move}-alt-{att}-{tgt}.json"
        out.write_text(json.dumps(s, separators=(",", ":")) + "\n")
        print(move, src, b, "-> sets", (s["playerSetIds"][0], s["opponentSetIds"][0]), out.name)
        continue
    parties = s["overrides"]["parties"]
    b = (parties["player"][0]["species"], parties["opponent"][0]["species"])
    parties["player"][0]["species"] = sp[att]
    parties["opponent"][0]["species"] = sp[tgt]
    for side in ("player", "opponent"):  # first gender the lab accepts for the new species (male-only / female-only / genderless species)
        for g in ("male", "female", "none"):
            parties[side][0]["gender"] = g
            try:
                validate_request(json.loads(json.dumps(s)), "battle-scene-on")
                break
            except ValueError as e:
                if "gender" not in str(e):
                    raise
        else:
            raise SystemExit(f"{move}: no legal gender for {side}")
    if att == "MILTANK": parties["player"][0]["gender"] = "female"  # species data: MILTANK is female-only; validate_request does not reject male, BattleLab.prepare does
    out = LAB / f"prep18-{move}-alt-{att.lower()}-{tgt.lower()}.json"
    out.write_text(json.dumps(s, separators=(",", ":")) + "\n")
    print(move, src, b, "->", (sp[att], sp[tgt]), out.name)
