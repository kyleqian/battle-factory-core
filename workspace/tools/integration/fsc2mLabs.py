#!/usr/bin/env python3
"""fsc2m: write faint -> send-in measurement labs (Scene OFF / ON) for the per-frame probes.

usage: fsc2mLabs.py <outdir> [frames]
The Lv50 player's single-target move (Tackle, 33) KOs the Lv5 foe slot 0; the foe's other two slots are Lv50 mons the AI can send in. Cases vary the fainted foe's species (name
length: the TARGETFAINTED box prints "Foe NAME\\nfainted!") and the replacement candidates (AI FaintedMonTryChoose cost). Writes <outdir>/fsc2m-<case>-<scene>.json.
"""
import copy, json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/fsc1-eqko-off.json")))
OUT = sys.argv[1]
FRAMES = int(sys.argv[2]) if len(sys.argv) > 2 else 620
RATTATA, MOVE_TACKLE, MOVE_STOP = 19, 33, 69
CASES = {  # name -> (species of fainted foe, replacement species [slot1, slot2], replacement moves [slot1, slot2])
    "n3-mew": (151, (19, 19), (69, 69)), "n4-abra": (63, (19, 19), (69, 69)), "n7-rattata": (19, (19, 19), (69, 69)),
    "n9-blastoise": (9, (19, 19), (69, 69)), "n10-feraligatr": (160, (19, 19), (69, 69)),
    # AI replacement choice cost: the fainted foe is Rattata; moves may be a list of 4
    "ai-nose-normal": (19, (19, 19), (33, 33)),  # no super-effective move: the candidate loop runs to its damage fallback
    "ai-nose-mixed": (19, (130, 65), (33, 33)),  # Gyarados / Alakazam, Normal move only
    "ai-four-moves": (19, (130, 65), ([33, 52, 55, 85], [33, 94, 105, 247])),
    "ai-se-first": (19, (130, 65), ([85, 33, 33, 33], [69, 33, 33, 33])),
    "ai-same-se": (19, (19, 19), ([69, 33, 33, 33], [69, 33, 33, 33])),
}
if len(sys.argv) > 3:
    CASES = {k: v for k, v in CASES.items() if k in sys.argv[3].split(",")}
def build(case, scene):
    fainted, repl, rmoves = CASES[case]
    lab = copy.deepcopy(tpl)
    lab["profile"] = f"battle-scene-{scene}"
    plr, foes = lab["overrides"]["parties"]["player"][0], lab["overrides"]["parties"]["opponent"]
    plr["level"], plr["moves"] = 50, [MOVE_TACKLE] * 4
    foes[0].update(species=fainted, level=5, moves=[MOVE_STOP] * 4)
    for i in (1, 2):
        foes[i].update(species=repl[i - 1], level=50, moves=(rmoves[i - 1] if isinstance(rmoves[i - 1], list) else [rmoves[i - 1]] * 4))
    lab["trace"]["segments"][3]["frames"] = FRAMES
    json.dump(lab, open(os.path.join(OUT, f"fsc2m-{case}-{scene}.json"), "w"))
os.makedirs(OUT, exist_ok=True)
for scene in ("off", "on"):
    for case in CASES:
        build(case, scene)
print(len(CASES) * 2, "labs ->", OUT)
