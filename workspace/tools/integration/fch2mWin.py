#!/usr/bin/env python3
"""fch2m: the faint-print window of one T2 decision, ROM printer state next to the engine's message command and the A presses.

usage: fch2mWin.py BASEDIR ACCDIR SEED DECISION
BASEDIR / ACCDIR hold SEED-on.{eng-cmd,rom,snd,drive}.json as hcr3mCmp.py reads them (eng-cmd from soundCensusRomReplay replay --cmdtrace=1 --romdrive=...;
ACCDIR's with --dismiss-accept=1; rom = hcr3mProbe.py with the printer field). Frames are from each side's own commit. Prints: ROM SE 16, printer start (tp rising
edge after SE 16), state 2 (typing done), the A the ROM driver pressed (SE 5), SE 114; the engine's SE 16, `message` command start, the same A / SE 114 in the baseline
(A only in awaiting-message-dismiss) and in the accept run (A also while the press is already acceptable)."""
import json
import sys
from pathlib import Path

base, acc, seed, dec = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], int(sys.argv[4])
rom = json.load(open(base / f"{seed}-on.rom.json"))
snd = json.load(open(base / f"{seed}-on.snd.json"))
drv = json.load(open(base / f"{seed}-on.drive.json"))["drive"]
rc = drv["anchors"][dec]["commitFrame"]
nxt = drv["anchors"][dec + 1]["menuOpenFrame"] - rc if dec + 1 < len(drv["anchors"]) else 10**9


def rom_rows():
    se = [(e["frame"] - rc, e["id"]) for e in snd["events"] if e["kind"] == "se" and 0 <= e["frame"] - rc < nxt]
    se16 = next(f for f, i in se if i == 16)
    tp = [(r[0] - rc, r[9]) for r in rom["rows"]]
    start = next(f for f, t in tp if f > se16 and (t & 0xFF) == 1)
    st2 = next(f for f, t in tp if f > start and (t >> 8) == 2)
    a = next(f for f, i in se if i == 5 and f >= st2 - 1)
    se114 = next(f for f, i in se if i == 114 and f > se16)
    se15 = next((f for f, i in se if i == 15 and f > se114), None)
    pulses = [f for f, i in se if i == 5 and st2 - 20 <= f <= st2 + 40]
    return dict(se16=se16, start=start, state2=st2, A=a, se114=se114, se15=se15, pulses=pulses)


def eng_rows(d):
    e = json.load(open(d / f"{seed}-on.eng-cmd.json"))
    ec = [x for x in e["decisions"] if x.get("commitFrame") is not None][dec]["commitFrame"]
    se = [(r[0] - ec, r[2]) for r in e["sound"] if r[1] == "se"]
    cmds = [(r[0] - ec, r[1], r[2], r[3], r[10]) for r in e["cmds"]]
    se16 = next((f for f, i in se if i == 16 and f > 100), None)
    # the faint's `message`: the first `message` command after the `faint` command that follows the last hp drop before SE 16
    fi = max(k for k, c in enumerate(cmds) if c[3] == "faint" and c[0] <= se16)
    msg = next(c for c in cmds[fi:] if c[3] == "message")
    a = next(f for f, i in se if i == 5 and f > msg[0])
    se114 = next(f for f, i in se if i == 114 and f > se16)
    se15 = next((f for f, i in se if i == 15 and f > se114), None)
    return dict(se16=se16, faint_cmd=cmds[fi][0], msg=msg[0], msgmin=msg[4], A=a, se114=se114, se15=se15)


r, b, a = rom_rows(), eng_rows(base), eng_rows(acc)
print(f"seed {seed} decision {dec}")
print(f"  ROM  SE16 {r['se16']}  printer start {r['start']} (+{r['start'] - r['se16']})  state2 {r['state2']} (T {r['state2'] - r['start']})  pulses near {r['pulses']}  A {r['A']}  SE114 {r['se114']}  SE15 {r['se15']}")
for name, x in (("base", b), ("acc ", a)):
    print(f"  ENG {name} SE16 {x['se16']}  faint cmd {x['faint_cmd']}  message cmd {x['msg']} (min {x['msgmin']})  A {x['A']}  SE114 {x['se114']}  SE15 {x['se15']}  | vs ROM: SE16 {x['se16'] - r['se16']:+d} msg {x['msg'] - r['start']:+d} A {x['A'] - r['A']:+d} SE114 {x['se114'] - r['se114']:+d} SE15 {(x['se15'] - r['se15']) if x['se15'] and r['se15'] else None}")
