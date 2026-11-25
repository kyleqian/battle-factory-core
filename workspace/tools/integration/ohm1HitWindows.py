#!/usr/bin/env python3
"""ohm1: list every hse1mTable.py hit-SE window class by class with its stepping row decomposed (pre / P / R terms of hse1mSplit.py) and ROM / engine context.

usage: ohm1HitWindows.py ATTR_OFF.json SPLIT.json [--min-step N]    (runs hse1mTable.py's windowing and classing on the same files; prints stepping windows only, step != 0, largest mass first per class)"""
import collections
import importlib.util
import io
import contextlib
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
argv_keep = list(sys.argv)
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
spec = importlib.util.spec_from_file_location("hse1mTable", here / "hse1mTable.py")
mod = importlib.util.module_from_spec(spec)
with contextlib.redirect_stdout(io.StringIO()):
    spec.loader.exec_module(mod)
cls = collections.defaultdict(list)
clean = collections.Counter()
for w in mod.windows:
    k = mod.classify(w)
    if k is None:
        continue
    if w["step"] == 0 and w["mass"] == 0:
        clean[k] += 1
        if "--clean" in argv_keep and k.startswith(argv_keep[argv_keep.index("--clean") + 1]):
            d = mod.split.get((w["seed"], w["si"], w["first"]["rf"]), {})
            print(f"clean {k[:20]}: s{w['seed']} si{w['si']} rf{w['first']['rf']} sid {w['first']['sid']} mv {w['first']['mv']} pre {d.get('pre')} | ROM {' > '.join((d.get('ctxRom') or [])[-5:])} | ENG {' '.join((d.get('ctxEng') or [])[-6:])}")
        continue
    d = mod.split.get((w["seed"], w["si"], w["first"]["rf"]), {})
    cls[k].append((w, d))
tot_w = sum(len(v) for v in cls.values())
print(f"stepping or non-clean windows {tot_w}; clean windows {sum(clean.values())}")
for k, lst in sorted(cls.items(), key=lambda kv: -sum(w["mass"] for w, _ in kv[1])):
    print(f"\n== {k}: {len(lst)} windows, mass {sum(w['mass'] for w, _ in lst)}, clean {clean[k]}")
    for w, d in sorted(lst, key=lambda x: -x[0]["mass"]):
        print(f"  s{w['seed']} si{w['si']} rf{w['rf']} step {w['step']:+d} rows {w['rows']} mass {w['mass']} sid {w['first']['sid']} mv {w['first']['mv']} ecmd {w['first']['ecmd']} "
              f"pre {d.get('pre')} P {d.get('P')} R {d.get('R')} prev {d.get('prev')} | ROM {' > '.join((d.get('ctxRom') or [])[-5:])} | ENG {' '.join((d.get('ctxEng') or [])[-6:])}")
