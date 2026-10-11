#!/usr/bin/env python3
"""shadow105 (docs/next-adapters-shadow105.md): fresh direct-mGBA labs for the elevated-opponent enemy shadow on land97's idle lead
rows. audit24Stage.py's lead-lab shape: idle94LeadScan.py's Bulk Up templates (attacker moves [M] * 4, the foe Tackle x4, explicit
lab seed 305419897), attacker / foe species replaced, the last idle segment 700 -> 1100 frames. Internal species ids (Gen 1/2 only:
internal == national); EV totals <= 510 (the templates').
  opp   an ELEVATED opponent attacker (gEnemyMonElevation > 0) on 4 of the 19 elevated-user lead moves (Shadow Punch HAUNTER N 8,
        Bite CROBAT N 10, Sludge Bomb GOLBAT N 4, Twineedle BEEDRILL N 10), each vs a grounded and an elevated-species player TARGET
        (the player side has no shadow sprite either way; Shadow Punch vs LAPRAS: a Normal SNORLAX is immune, no body);
  ply   a grounded player attacker into an ELEVATED opponent TARGET (SpriteCB_EnemyShadow hides the shadow while gAnimScriptActive,
        whoever attacks): Bite RATICATE -> CROBAT, Sludge Bomb MUK -> GOLBAT, Twineedle BEEDRILL -> GOLBAT.
usage: shadow105Stage.py <out-dir>   (writes <name>.json + list.tsv: name, kind, move id, attacker side, attacker, foe, seed)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
load = lambda p: json.loads((ROOT / p).read_text())
SP = {"HAUNTER": 93, "CROBAT": 169, "GOLBAT": 42, "BEEDRILL": 15, "SNORLAX": 143, "LAPRAS": 131, "RATICATE": 20, "MUK": 89}
LEAD_TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
                 "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SEED = 305419897
LABS = [  # move id, move, attacker side, attacker, foe, kind
    (325, "SHADOW_PUNCH", "opponent", "HAUNTER", "LAPRAS", "opp"), (325, "SHADOW_PUNCH", "opponent", "HAUNTER", "GOLBAT", "opp"),
    (44, "BITE", "opponent", "CROBAT", "LAPRAS", "opp"), (44, "BITE", "opponent", "CROBAT", "GOLBAT", "opp"),
    (188, "SLUDGE_BOMB", "opponent", "GOLBAT", "SNORLAX", "opp"), (188, "SLUDGE_BOMB", "opponent", "GOLBAT", "CROBAT", "opp"),
    (41, "TWINEEDLE", "opponent", "BEEDRILL", "SNORLAX", "opp"), (41, "TWINEEDLE", "opponent", "BEEDRILL", "GOLBAT", "opp"),
    (44, "BITE", "player", "RATICATE", "CROBAT", "ply"), (188, "SLUDGE_BOMB", "player", "MUK", "GOLBAT", "ply"),
    (41, "TWINEEDLE", "player", "BEEDRILL", "GOLBAT", "ply"),
]
rows = []
for mid, move, side, att, foe, kind in LABS:
    s = copy.deepcopy(load(LEAD_TEMPLATE[side]))
    other = "opponent" if side == "player" else "player"
    s["seed"] = SEED
    s["overrides"]["parties"][side][0]["species"] = SP[att]
    s["overrides"]["parties"][other][0]["species"] = SP[foe]
    s["overrides"]["parties"][side][0]["moves"] = [mid] * 4
    assert s["trace"]["segments"][-1]["frames"] == 700
    s["trace"]["segments"][-1]["frames"] = 1100
    s["trace"]["captureFrames"] = [0, sum(g["frames"] for g in s["trace"]["segments"])]
    for m in s["overrides"]["parties"]["player"] + s["overrides"]["parties"]["opponent"]:
        assert sum(m["evs"].values()) <= 510
    name = f"shadow105-{move.lower().replace('_', '-')}-{side}-{att.lower()}-{foe.lower()}"
    rows.append((name, kind, mid, side, att, foe, SEED))
    (out / f"{name}.json").write_text(json.dumps(s) + "\n")
(out / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(f"{len(rows)} scenarios -> {out}")
