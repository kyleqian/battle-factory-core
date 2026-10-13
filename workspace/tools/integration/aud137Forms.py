#!/usr/bin/env python3
"""aud137: the displayed CASTFORM form of every aud137 window, from the ROM itself: a status window whose battler is a CASTFORM and
that rises after a General_CastformChange window on that battler (aud137Probe.py attributes it; gBattleAnimAttacker = the Castform)
shows the weather form the change set. Rain Dance (the only weather in aud137's Castform routes) -> CASTFORM_WATER (2; castform-forms.json
is indexed CASTFORM_NORMAL .. _ICE). Production's live field carries it as the battler's `castformForm` (withLiveCastformForms).
usage: aud137Forms.py <probe-dir> <rom-windows.json> <out.json>
"""
import json, os, sys

probe_dir, rom, out = sys.argv[1:4]
CASTFORM, WATER = 385, 2
forms = {}
for key, w in json.load(open(rom))["windows"].items():
    probe = json.load(open(os.path.join(probe_dir, w["scenario"])))
    changes = [g for g in probe["windows"] if g["label"] == "General_CastformChange" and g["battler"] == w["battler"] and g["rise"] < w["rise"]]
    if changes:
        forms[key] = WATER
json.dump(forms, open(out, "w"), indent=1, sort_keys=True)
open(out, "a").write("\n")
print(len(forms), "windows in a Castform weather form")
