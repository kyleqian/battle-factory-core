#!/usr/bin/env python3
"""Live audit 24 (docs/live-audit-24.md): fresh direct-mGBA labs for the two timing folds land97 (idle lead rows) and fp100 (Focus
Punch age-131 lag), on species pairs the folds did not measure. Internal species ids; EV totals <= 510; explicit lab seed in every lab.
  lead labs   idle94LeadScan.py's Bulk Up templates (attacker moves [M] * 4, seed 305419897), attacker / foe species replaced, the last
              idle segment 700 -> 1100 frames (a long body + its tail fit);
  swap labs   prep40-bite-{player,opponent}.json (Substitute then Bite: the attacker-doll composite), attacker PERSIAN -> RATICATE;
  fp labs     fp100Scenarios.py's lab (doll90-ctl-recover-opponent.json, Focus Punch x4 vs Light Screen), new pairs, seeds A / B.
usage: audit24Stage.py <out-dir>   (writes <name>.json + list.tsv: name, kind, move id, attacker side, attacker, foe, seed)
"""
import copy, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
load = lambda p: json.loads((ROOT / p).read_text())
SP = {"GENGAR": 94, "LAPRAS": 131, "RATICATE": 20, "SKARMORY": 227, "VENUSAUR": 3, "QUAGSIRE": 195, "KANGASKHAN": 115,
      "STEELIX": 208, "KINGLER": 99, "SNORLAX": 143, "NINETALES": 38, "HITMONLEE": 106, "POLIWRATH": 62, "PERSIAN": 53, "HAUNTER": 93, "CROBAT": 169, "GOLBAT": 42}
FEMALE_ONLY = {"KANGASKHAN"}
LEAD_TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
                 "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
# move id, move, attacker, foe (land97 LIVE_MOVE_IDLE_LEAD_ROWS ids not in idle94's 4 routes)
LEAD = [(325, "SHADOW_PUNCH", "GENGAR", "LAPRAS"), (44, "BITE", "RATICATE", "SKARMORY"), (75, "RAZOR_LEAF", "VENUSAUR", "QUAGSIRE"),
        (146, "DIZZY_PUNCH", "KANGASKHAN", "STEELIX"), (106, "HARDEN", "KINGLER", "SNORLAX"), (52, "EMBER", "NINETALES", "SNORLAX"),
        # HAUNTER is the only Factory frontier mon with Shadow Punch (GENGAR above is an off-Factory pair)
        (325, "SHADOW_PUNCH", "HAUNTER", "LAPRAS"), (325, "SHADOW_PUNCH", "HAUNTER", "SKARMORY")]
# elevated opponent attackers (gEnemyMonElevation CROBAT 6, GOLBAT 8): opponent side only (no player-side shadow)
ELEVATED = [(44, "BITE", "CROBAT", "LAPRAS"), (188, "SLUDGE_BOMB", "GOLBAT", "SNORLAX")]
SEED_A, SEED_B = 305419897, 38177486
rows = []

def mon(m, name):
    m["species"] = SP[name]
    m["gender"] = "female" if name in FEMALE_ONLY else m["gender"]

for mid, move, att, foe, sides in [(*x, ("player", "opponent")) for x in LEAD] + [(*x, ("opponent",)) for x in ELEVATED]:
    for side in sides:
        s = copy.deepcopy(load(LEAD_TEMPLATE[side]))
        other = "opponent" if side == "player" else "player"
        s["seed"] = SEED_A
        mon(s["overrides"]["parties"][side][0], att); mon(s["overrides"]["parties"][other][0], foe)
        s["overrides"]["parties"][side][0]["moves"] = [mid] * 4
        assert s["trace"]["segments"][-1]["frames"] == 700
        s["trace"]["segments"][-1]["frames"] = 1100
        s["trace"]["captureFrames"] = [0, sum(g["frames"] for g in s["trace"]["segments"])]
        name = f"audit24-lead-{move.lower().replace('_', '-')}-{side}-{att.lower()}-{foe.lower()}"
        s["_audit24"] = name
        rows.append((name, "lead", mid, side, att, foe, SEED_A, s))

for side in ("player", "opponent"):
    s = copy.deepcopy(load(f"tools/integration/fixtures/prep40/scenarios/prep40-bite-{side}.json"))
    u = s["overrides"]["parties"][side][0]
    assert u["species"] == SP["PERSIAN"] and 44 in u["moves"] and 164 in u["moves"]
    mon(u, "RATICATE")
    foe = [k for k, v in SP.items() if v == s["overrides"]["parties"]["opponent" if side == "player" else "player"][0]["species"]]
    name = f"audit24-swap-bite-{side}-raticate"
    rows.append((name, "swap", 44, side, "RATICATE", foe[0] if foe else "SLOWBRO", s["seed"], s))

FP_BASE = load("tools/integration/fixtures/doll90/scenarios/doll90-ctl-recover-opponent.json")
FAST = {"hp": 252, "attack": 0, "defense": 0, "speed": 252, "spAttack": 0, "spDefense": 0}
SLOW = {"hp": 252, "attack": 0, "defense": 128, "speed": 0, "spAttack": 0, "spDefense": 128}
IV_FAST = {"hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 0, "spDefense": 31}
IV_SLOW = {"hp": 31, "attack": 0, "defense": 31, "speed": 0, "spAttack": 0, "spDefense": 31}
FP = [("opponent", "HITMONLEE", "SKARMORY", SEED_A), ("opponent", "POLIWRATH", "QUAGSIRE", SEED_B),
      ("player", "HITMONLEE", "STEELIX", SEED_B), ("player", "POLIWRATH", "LAPRAS", SEED_A)]
for side, user, foe, seed in FP:
    s = copy.deepcopy(FP_BASE)
    s["seed"] = seed
    other = "player" if side == "opponent" else "opponent"
    u, f = s["overrides"]["parties"][side][0], s["overrides"]["parties"][other][0]
    u.update(species=SP[user], moves=[264] * 4, evs=dict(FAST), ivs=dict(IV_FAST))
    f.update(species=SP[foe], moves=[113] * 4, evs=dict(SLOW), ivs=dict(IV_SLOW))
    name = f"audit24-fp-{side}-{user.lower()}-{foe.lower()}"
    rows.append((name, "fp", 264, side, user, foe, seed, s))

for name, kind, mid, side, att, foe, seed, s in rows:
    s.pop("_audit24", None)
    for m in s["overrides"]["parties"]["player"] + s["overrides"]["parties"]["opponent"]:
        assert sum(m["evs"].values()) <= 510, name
    assert isinstance(s["seed"], int)
    (out / f"{name}.json").write_text(json.dumps(s) + "\n")
(out / "list.tsv").write_text("".join(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]}\t{r[4]}\t{r[5]}\t{r[6]}\n" for r in rows))
print(f"{len(rows)} scenarios -> {out}")
