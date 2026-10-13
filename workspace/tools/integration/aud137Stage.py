#!/usr/bin/env python3
"""aud137 (docs/aud137-live-audit-28.md): stage the live-audit-28 status-animation scenarios by controlled lab staging of the landing
proofs' accepted scenarios (sta123 / sar131 / stq132 / stp128 fixtures): only the named lead's species (+ gender / moves where stated)
changes; parties of three, EV totals <= 510, every template's explicit lab "seed" kept. Every species is a Battle Factory species
(reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h); internal ids. Genders: the template's, except Attract targets
(female, opposite the male attacker) and the male-only TAUROS (male).
usage: aud137Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
FX = os.path.join(ROOT, "tools/integration/fixtures")
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
SP = {"ONIX": 95, "CROBAT": 169, "NINJASK": 302, "FLYGON": 334, "SKARMORY": 227, "SNORLAX": 143, "CASTFORM": 385, "TAUROS": 128,
      "PARASECT": 47, "HAUNTER": 93}
TEMPLATES = {  # animation slug -> (template per attacker side, animation, the template's attacker species)
    "psn": ("sar131/scenarios/sta123-toxic-{tag}-primeape-onix.json", "PSN"),
    "prz": ("sar131/scenarios/sta123-thunder-wave-{tag}-primeape-snorlax.json", "PRZ"),
    "slp": ("stq132/scenarios/stq132-spore-{tag}-primeape-onix.json", "SLP"),
    "brn": ("stq132/scenarios/stq132-will-o-wisp-{tag}-primeape-onix.json", "BRN"),
    "inf": ("stq132/scenarios/stq132-attract-{tag}-primeape-onix.json", "INFATUATION"),
    "conf": ("stp128/scenarios/stp128-confuse-ray-{tag}-primeape-onix.json", "CONFUSION"),
    "curse": ("stp128/scenarios/stp128-curse-{tag}-gengar-onix.json", "CURSED"),
    "nightmare": ("stp128/scenarios/stp128-nightmare-{tag}-gengar-golbat.json", "NIGHTMARE"),
    "frz": ("stp128/scenarios/stp128-ice-beam-{tag}-delcatty-shuckle.json", "FRZ"),
}
# (slug, attacker side tag, new name, role whose species changes, species, extra) — role "target" = the non-attacker lead.
PLAN = []
NEW_TARGETS = {"psn": ("NINJASK", "FLYGON"), "prz": ("CROBAT", "NINJASK"), "slp": ("CROBAT", "FLYGON"), "brn": ("NINJASK", "CROBAT"),
               "inf": ("FLYGON", "CROBAT"), "conf": ("FLYGON", "NINJASK"), "curse": ("CROBAT", "NINJASK"),
               "nightmare": ("FLYGON", "NINJASK"), "frz": ("SKARMORY", "SNORLAX")}
for slug, targets in NEW_TARGETS.items():
    for sp in targets:
        for tag in ("ply", "opp"):
            PLAN.append((slug, tag, f"aud137-{slug}-{tag}-{sp.lower()}", "target", sp, {}))
# the ONIX rest (frontIdleRest x2 +1, the only species with a non-zero ported rest) with NEW attackers, opponent ONIX
PLAN += [("psn", "ply", "aud137-psn-ply-crobat-onix", "attacker", "CROBAT", {}),
         ("slp", "ply", "aud137-slp-ply-parasect-onix", "attacker", "PARASECT", {}),
         ("conf", "ply", "aud137-conf-ply-haunter-onix", "attacker", "HAUNTER", {}),
         ("brn", "ply", "aud137-brn-ply-haunter-onix", "attacker", "HAUNTER", {})]
# Castform in rain (Forecast): the poisoned CASTFORM uses Rain Dance (240) every turn, both sides
PLAN += [("psn", "opp", "aud137-psn-opp-castform-rain", "target", "CASTFORM", {"moves": [240, 240, 240, 240]}),
         ("psn", "ply", "aud137-psn-ply-castform-rain", "target", "CASTFORM", {"moves": [240, 240, 240, 240]})]
# two status animations in one turn: (a) the faster opponent CROBAT Toxics (92) the player Primeape, who Spores it: SLP (opp) after the
# end-turn PSN tick (ply); (b) the player Primeape Thunder Waves the opponent TAUROS, whose Thrash (37) fatigue confuses it:
# CONFUSION self-check then PRZ can't-move on one battler
PLAN += [("slp", "ply", "aud137-slp-psn-ply-primeape-crobat", "target", "CROBAT", {"moves": [92, 92, 92, 92]}),
         ("prz", "ply", "aud137-prz-conf-ply-primeape-tauros", "target", "TAUROS", {"moves": [37, 37, 37, 37], "gender": "male"})]
index = {}
for slug, tag, name, role, sp, extra in PLAN:
    rel, anim = TEMPLATES[slug]
    src = rel.format(tag=tag)
    d = json.load(open(os.path.join(FX, src)))
    attacker = "player" if tag == "ply" else "opponent"
    side = attacker if role == "attacker" else ("opponent" if attacker == "player" else "player")
    mon = d["overrides"]["parties"][side][0]
    mon["species"] = SP[sp]
    if slug == "inf" and role == "target":
        assert d["overrides"]["parties"][attacker][0]["gender"] == "male"
        mon["gender"] = "female"
    for k, v in extra.items():
        mon[k] = v
    for s in ("player", "opponent"):
        for p in d["overrides"]["parties"][s]:
            assert sum(p["evs"].values()) <= 510
    open(os.path.join(out, name + ".json"), "w").write(json.dumps(d, indent=1) + "\n")
    index[name + ".json"] = {"animation": anim, "attackerSide": attacker, "source": f"tools/integration/fixtures/{src}",
                             "changed": {"side": side, "role": role, "species": sp, **extra}, "seed": d["seed"]}
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
