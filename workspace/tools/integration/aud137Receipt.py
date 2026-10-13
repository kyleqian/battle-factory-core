#!/usr/bin/env python3
"""aud137: stq132Receipt.py run VERBATIM except for its label -> animation map, which covers all nine status animations, and its
window loop, which skips the general-animation windows aud137Probe.py also attributes (General_CastformChange / StatsChange /
SubstituteFade: not status animations; window index k counts status windows only).
usage: aud137Receipt.py <probe-dir> <scenario-index.json> <out.json>
"""
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent / "stq132Receipt.py"
OLD = 'LABEL = {"Status_Sleep": "SLP", "Status_Burn": "BRN", "Status_Infatuation": "INFATUATION"}'
NEW = ('LABEL = {"Status_Poison": "PSN", "Status_Confusion": "CONFUSION", "Status_Burn": "BRN", "Status_Infatuation": "INFATUATION", '
       '"Status_Sleep": "SLP", "Status_Paralysis": "PRZ", "Status_Freeze": "FRZ", "Status_Curse": "CURSED", "Status_Nightmare": "NIGHTMARE"}')
code = SRC.read_text()
assert code.count(OLD) == 1
LOOP = 'for k, w in enumerate(probe["windows"]):'
assert code.count(LOOP) == 1
code = code.replace(LOOP, 'for k, w in enumerate([x for x in probe["windows"] if x["label"] in LABEL]):')
code = code.replace(OLD, NEW).replace('"schema": "stq132-rom-windows/v1"', '"schema": "aud137-rom-windows/v1"')
exec(compile(code, str(SRC), "exec"), {"__name__": "__main__", "__file__": str(SRC)})
