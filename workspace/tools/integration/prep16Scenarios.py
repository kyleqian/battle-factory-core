#!/usr/bin/env python3
"""prep16: writes tools/battle-lab/prep16-*.json (new files). Every scenario is an accepted prep14 scenario with (a) a 2-turn trace (turn 1 is frame-identical to the accepted
1-turn prefix; turn 2 gives bodies after the action-menu idle), and (b) variants chosen BEFORE any probing: predecessor-move variants (the non-attacker side's four moves replaced),
first-body variants (non-attacker side = SHUCKLE, the slowest species, so the attacker acts first), shiny variants, alternate species pairs."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import validate_request  # noqa: E402
sp = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define SPECIES_(\w+)\s+(\d+)", (ROOT / "reference/pokeemerald/include/constants/species.h").read_text())}
LAB = ROOT / "tools/battle-lab"
TWO_TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 800, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 800, "buttons": []}]
PRED = {"tackle": 33, "swordsdance": 14, "splash": 150, "growl": 45, "psychic": 94, "hyperbeam": 63}
def load(n): return json.loads((LAB / n).read_text())
def legal(s, side):
    cur = s["overrides"]["parties"][side][0]["gender"]  # keep the accepted gender (validate_request accepts genders prepare rejects; same papercut as prep14)
    for g in (cur, "male", "female", "none"):
        s["overrides"]["parties"][side][0]["gender"] = g
        try: validate_request(json.loads(json.dumps(s)), "battle-scene-on"); return
        except ValueError as e:
            if "gender" not in str(e): raise
    raise SystemExit("no legal gender")
def emit(name, s):
    s = json.loads(json.dumps(s))
    for side in ("player", "opponent"):  # species-swapped alternates must not keep a genderless Solrock/Magcargo-slot gender
        if s["overrides"]["parties"][side][0]["species"] not in (349, 350) and s["overrides"]["parties"][side][0]["gender"] == "genderless": s["overrides"]["parties"][side][0]["gender"] = "male"
    s["trace"] = {"segments": TWO_TURN}
    for side in ("player", "opponent"): legal(s, side)
    (LAB / f"prep16-{name}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n"); print(name)
def variants(tag, src, other, sets):
    base = load(src); emit(f"{tag}-base", base)
    for pn, mv in PRED.items():
        s = json.loads(json.dumps(base)); s["overrides"]["parties"][other][0]["moves"] = [mv] * 4; emit(f"{tag}-after-{pn}", s)
    s = json.loads(json.dumps(base)); s["overrides"]["parties"][other][0]["species"] = sp["SHUCKLE"]; emit(f"{tag}-first-shuckle", s)
# palette-composite scenarios (accepted player / opponent are the prep14 accepted files; alternates new)
for key, pl, op in (("overheat", "mechanic-overheat-player-solrock-opponent-shuckle", "mechanic-overheat-opponent-magcargo-player-shuckle"),
                    ("silverwind", "mechanic-silver-wind-player-butterfree-opponent-onix", "mechanic-silver-wind-opponent-butterfree-player-onix"),
                    ("psychup", "mechanic-psych-up-player-jumpluff-opponent-ninjask", "mechanic-psych-up-opponent-jumpluff-player-ninjask")):
    emit(f"{key}-acc-player", load(pl + ".json")); emit(f"{key}-acc-opponent", load(op + ".json"))
alts = {"overheat": ("CHARIZARD", "GOLEM"), "silverwind": ("BEAUTIFLY", "GOLEM"), "psychup": ("SKIPLOOM", "GOLEM")}
for key, (pl, op) in alts.items():
    base = load({"overheat": "mechanic-overheat-player-solrock-opponent-shuckle", "silverwind": "mechanic-silver-wind-player-butterfree-opponent-onix", "psychup": "mechanic-psych-up-player-jumpluff-opponent-ninjask"}[key] + ".json")
    s = json.loads(json.dumps(base)); s["overrides"]["parties"]["player"][0]["species"] = sp[pl]; s["overrides"]["parties"]["opponent"][0]["species"] = sp[op]; emit(f"{key}-alt-player", s)
    ob = load({"overheat": "mechanic-overheat-opponent-magcargo-player-shuckle", "silverwind": "mechanic-silver-wind-opponent-butterfree-player-onix", "psychup": "mechanic-psych-up-opponent-jumpluff-player-ninjask"}[key] + ".json")
    s = json.loads(json.dumps(ob)); s["overrides"]["parties"]["opponent"][0]["species"] = sp[pl]; s["overrides"]["parties"]["player"][0]["species"] = sp[op]; emit(f"{key}-alt-opponent", s)
    s = json.loads(json.dumps(base)); s["overrides"]["parties"]["player"][0]["shiny"] = True; s["overrides"]["parties"]["opponent"][0]["shiny"] = True; emit(f"{key}-shiny-player", s)
# BG-history studies
variants("hist-silverwind-opp", "mechanic-silver-wind-opponent-butterfree-player-onix.json", "player", None)
variants("hist-psychup-player", "mechanic-psych-up-player-jumpluff-opponent-ninjask.json", "opponent", None)
variants("hist-psychup-opp", "mechanic-psych-up-opponent-jumpluff-player-ninjask.json", "player", None)
variants("hist-overheat-player", "mechanic-overheat-player-solrock-opponent-shuckle.json", "opponent", None)
variants("hist-overheat-opp", "mechanic-overheat-opponent-magcargo-player-shuckle.json", "player", None)
variants("hist-silverwind-player", "mechanic-silver-wind-player-butterfree-opponent-onix.json", "opponent", None)
