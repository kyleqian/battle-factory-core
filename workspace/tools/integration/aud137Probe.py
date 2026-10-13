#!/usr/bin/env python3
"""aud137 (docs/aud137-live-audit-28.md): stq132Probe.py run VERBATIM except for its window label set, which here is all nine Scene ON
status-condition animations (Status_Poison .. Status_Nightmare, data/battle_anim_scripts.s 10224..10295) plus the three general
scripts that follow them within 0x40 bytes (General_CastformChange / General_StatsChange / General_SubstituteFade, 10305..10326), so
that the nearest-label rule attributes those rises to their own label (aud137Receipt.py drops them; aud137Forms.py reads the Castform
form change). Same window rule (a
gAnimScriptActive rise with sAnimMoveIndex == 0 within 0x40 of a label; rows rel -2 .. E + 3), same per-row fields, same optional
STQ132_DUMP npz dump. One battle-lab scenario in a fresh direct mGBA process, profile battle-scene-on, the scenario's own lab seed.
usage: aud137Probe.py <scenario.json> <output.json>
"""
from pathlib import Path

SRC = Path(__file__).resolve().parent / "stq132Probe.py"
OLD = 'LABELS = ("Status_Sleep", "Status_Burn", "Status_Infatuation")'
NEW = ('LABELS = ("Status_Poison", "Status_Confusion", "Status_Burn", "Status_Infatuation", "Status_Sleep", "Status_Paralysis", '
       '"Status_Freeze", "Status_Curse", "Status_Nightmare", "General_CastformChange", "General_StatsChange", "General_SubstituteFade")')
code = SRC.read_text()
assert code.count(OLD) == 1
exec(compile(code.replace(OLD, NEW), str(SRC), "exec"), {"__name__": "__main__", "__file__": str(SRC)})
