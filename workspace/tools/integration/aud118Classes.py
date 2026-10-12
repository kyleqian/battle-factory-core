#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): off108Classes.py's per-class rule table, unchanged, run on aud118OffStage.py's classes: the
script's CASES list is replaced by AUD118_CASES below (same tuple shape) and the rest of off108Classes.py executes as committed.
usage: aud118Classes.py <rom.json> <route-dir> <out-dir>"""
import re, sys
from pathlib import Path

AUD118_CASES = '''CASES = [
    ("stat self (Swords Dance)", "aud118-swords-dance-ply-primeape-onix", 0, 0, 14),
    ("stat self (Agility)", "aud118-agility-ply-primeape-onix", 0, 0, 97),
    ("stat target (Leer)", "aud118-leer-ply-primeape-snorlax", 0, 0, 43),
    ("stat target (Screech)", "aud118-screech-ply-primeape-snorlax", 0, 0, 103),
    ("screen (Light Screen)", "aud118-light-screen-ply-primeape-onix", 0, 0, 113),
    ("screen (Reflect)", "aud118-reflect-ply-primeape-onix", 0, 0, 115),
    ("field (Haze)", "aud118-haze-ply-primeape-onix", 0, 0, 114),
    ("field (Mist)", "aud118-mist-ply-primeape-onix", 0, 0, 54),
    ("status (Spore)", "aud118-spore-ply-primeape-snorlax", 0, 0, 147),
    ("doll (Substitute)", "aud118-substitute-ply-primeape-onix", 0, 0, 164),
    ("failed (Light Screen again: But it failed!)", "aud118-light-screen-twice-ply-primeape-onix", 0, 1, 113),
    ("failed (Reflect again: But it failed!)", "aud118-reflect-twice-ply-primeape-onix", 0, 1, 115),
    ("failed (Rain Dance again: But it failed!)", "aud118-rain-dance-twice-ply-primeape-onix", 0, 1, 240),
]
'''
src = Path(__file__).with_name("off108Classes.py").read_text()
new, n = re.subn(r"^CASES = \[\n.*?^\]\n", lambda m: AUD118_CASES, src, count=1, flags=re.M | re.S)
assert n == 1, "off108Classes.py CASES block not found"
sys.argv = [str(Path(__file__).with_name("off108Classes.py"))] + sys.argv[1:]
exec(compile(new, "off108Classes.py(aud118 CASES)", "exec"), {"__name__": "__main__", "__file__": sys.argv[0]})
