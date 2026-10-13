#!/usr/bin/env python3
"""aud137 (docs/aud137-live-audit-28.md §2): stage the TIMING routes (ROM gate / controller rows via seg127Probe.py + seg127Rom.py) by
controlled lab staging of sta123's accepted scenarios (tools/integration/fixtures/sar131/scenarios): only the named lead's species /
moves / gender change; parties of three, EV totals <= 510, each template's explicit lab "seed" kept (the crit route's seed is chosen by
aud137's seed sweep and written here explicitly). Factory species only (battle_frontier_mons.h); internal ids.
usage: aud137TimingStage.py <out-dir>   (also writes <out-dir>/../timing-index.json)
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SC = os.path.join(ROOT, "tools/integration/fixtures/sar131/scenarios")
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TOXIC_OPP = "sta123-toxic-opp-primeape-onix.json"     # opponent PRIMEAPE Toxic -> player ONIX (Tackle)
TOXIC_PLY = "sta123-toxic-ply-primeape-onix.json"     # player PRIMEAPE Toxic -> opponent ONIX (Tackle)
TW_PLY = "sta123-thunder-wave-ply-primeape-snorlax.json"  # player PRIMEAPE Thunder Wave -> opponent SNORLAX (Tackle)
TW_OPP = "sta123-thunder-wave-opp-primeape-snorlax.json"  # opponent PRIMEAPE Thunder Wave -> player SNORLAX (Tackle)
ZAP, TACKLE, YAWN, SUB, DIG, FLY, ROCK_SLIDE, TOXIC = 192, 33, 281, 164, 91, 19, 157, 92
# name: (template, {side: {field: value}}, class, expectation)
PLAN = {
    "aud137t-zap-cannon-crit-ply-primeape-snorlax": (TW_PLY, {"player": {"moves": [ZAP] * 4}}, "hit-secondary PRZ with a critical hit", "gate 0 (critmessage closes the SE)"),
    "aud137t-zap-cannon-se-ply-primeape-crobat": (TW_PLY, {"player": {"moves": [ZAP] * 4}, "opponent": {"species": 169}}, "super-effective hit-secondary PRZ", "gate 0 (resultmessage closes the SE)"),
    "aud137t-zap-cannon-se-opp-primeape-crobat": (TW_OPP, {"opponent": {"moves": [ZAP] * 4}, "player": {"species": 169}}, "super-effective hit-secondary PRZ", "gate 0"),
    "aud137t-faint-tick-ply-golem-crobat": (TOXIC_OPP, {"opponent": {"species": 169, "moves": [TOXIC] * 4, "evs": {"hp": 0, "attack": 0, "defense": 0, "speed": 255, "spAttack": 0, "spDefense": 0}},
                                                        "player": {"species": 76, "moves": [ROCK_SLIDE] * 4}}, "end-turn PSN tick right after the opponent's faint", "the rule"),
    # the Yawn targets are CROBAT (Inner Focus): Primeape's Vital Spirit blocks Yawn (first staging, PrintAbilityMadeIneffective)
    "aud137t-yawn-after-hit-opp-snorlax": (TW_PLY, {"player": {"species": 169, "moves": [TACKLE] * 4}, "opponent": {"moves": [YAWN] * 4}}, "Yawn SLP after a hit", "the rule"),
    "aud137t-yawn-after-hit-ply-snorlax": (TW_OPP, {"opponent": {"species": 169, "moves": [TACKLE] * 4}, "player": {"moves": [YAWN] * 4}}, "Yawn SLP after a hit", "the rule"),
    "aud137t-substitute-ply-onix": (TOXIC_OPP, {"player": {"moves": [SUB] * 4}}, "PSN tick behind a Substitute", "no status animation (substituteHP != 0)"),
    "aud137t-substitute-opp-onix": (TOXIC_PLY, {"opponent": {"moves": [SUB] * 4}}, "PSN tick behind a Substitute", "no status animation"),
    "aud137t-dig-ply-onix": (TOXIC_OPP, {"player": {"moves": [DIG] * 4}}, "PSN tick while underground (Dig)", "no status animation (STATUS3_SEMI_INVULNERABLE)"),
    # PELIPPER (speed 65 < Primeape 95: Toxic lands before the first Fly; a FLYGON outsped it and was never poisoned)
    "aud137t-fly-ply-pelipper": (TOXIC_OPP, {"player": {"species": 310, "moves": [FLY] * 4}}, "PSN tick while airborne (Fly)", "no status animation"),
}
SEEDS = {"aud137t-zap-cannon-crit-ply-primeape-snorlax": None}  # filled from the sweep below (None = template seed)
if len(sys.argv) > 2:
    for kv in sys.argv[2:]:
        k, v = kv.split("=")
        SEEDS[k] = int(v)
index = {}
for name, (tpl, changes, cls, expect) in PLAN.items():
    d = json.load(open(os.path.join(SC, tpl)))
    for side, fields in changes.items():
        d["overrides"]["parties"][side][0].update(fields)
    if name == "aud137t-faint-tick-ply-golem-crobat":  # the KO lands at trace frame 2118: 4 x (A, 400 idle) more frames for the tick
        d["trace"]["segments"] += [{"frames": 2, "buttons": ["A"]}, {"frames": 400, "buttons": []}] * 4
        d["trace"]["captureFrames"][-1] = sum(seg["frames"] for seg in d["trace"]["segments"])
    if SEEDS.get(name) is not None:
        d["seed"] = SEEDS[name]
    for s in ("player", "opponent"):
        for p in d["overrides"]["parties"][s]:
            assert sum(p["evs"].values()) <= 510
    open(os.path.join(out, name + ".json"), "w").write(json.dumps(d, indent=1) + "\n")
    index[name + ".json"] = {"class": cls, "expect": expect, "template": f"tools/integration/fixtures/sar131/scenarios/{tpl}", "changes": changes,
                             "seed": d["seed"]}
    print(name)
open(os.path.join(out, "..", "timing-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
