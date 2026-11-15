#!/usr/bin/env python3
"""lbw2: instruction-step the ROM through chosen compare-trace frames (battle-lab-staged, Scene OFF) and log every Random() call:
the caller (LR) and a stack-scanned backtrace, each resolved against the pinned ELF (nm, includes statics).
usage (through the probe runner):
  python3 tools/run-mgba-probe.py OUT.json -- python3 tools/probe/lbw2-draw-source.py TRACE.json OUT.json F1,F2,...   (F = frames advanced since the lab checkpoint, i.e. the tick that produces compare frame F)
Dev-time only."""
from __future__ import annotations
import bisect, json, re, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(__doc__)
TRACE, OUT = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
TARGETS = sorted({int(x) for x in sys.argv[3].split(",")})
ROOT = Path(__file__).resolve().parent.parent.parent
def harness_root(start):
    for c in (start, *start.parents):
        if (c / "oracle" / "emerald_core.py").is_file():
            return c
    raise SystemExit("no harness oracle")
ORACLE_DIR = harness_root(ROOT) / "oracle"
sys.path.insert(0, str(ORACLE_DIR))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

G_RNG, S_CNT, G_MAIN, G_BTF = 0x3005D80, 0x20249C0, 0x30022C0, 0x2022FEC
trace = json.loads(TRACE.read_text())
req = validate_request(json.loads((TRACE.parent / trace["oracleBattleLab"]["scenario"]).resolve().read_text()), "battle-scene-off")
ref = (ROOT / "reference" / "pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
BattleLab(oracle, "battle-scene-off").prepare(req)
core = oracle.core
import subprocess
syms = []
for line in subprocess.run(["nm", str(ref / "pokeemerald.elf")], capture_output=True, text=True, check=True).stdout.splitlines():
    m = re.match(r"([0-9a-f]{8}) [tT] (\S+)$", line)
    if m and m.group(1).startswith("08"):
        syms.append((int(m.group(1), 16), m.group(2)))
syms.sort()
addrs = [s[0] for s in syms]
def sym(a: int) -> str:
    a &= ~1
    i = bisect.bisect_right(addrs, a) - 1
    return f"{syms[i][1]}+{a - syms[i][0]:#x}" if i >= 0 else hex(a)
def u32(a): return oracle.read_u32(a)

buttons_by_frame = []
for seg in trace["segments"]:
    buttons_by_frame += [seg.get("buttons", [])] * int(seg["frames"])
cpu = core.cpu
results = []
for fno in range(1, max(TARGETS) + 1):
    b = buttons_by_frame[fno - 1] if fno - 1 < len(buttons_by_frame) else []
    if fno not in TARGETS:
        oracle.advance(b)
        continue
    oracle._set_buttons(b)
    start = core.frame_counter
    calls = []
    cnt = u32(S_CNT)
    steps = 0
    while core.frame_counter == start and steps < 2_000_000:
        core.step()
        steps += 1
        c = u32(S_CNT)
        if c != cnt:
            cnt = c
            lr = cpu.gprs[14]
            sp = cpu.gprs[13]
            bt = []
            for k in range(0, 96):
                w = u32(sp + 4 * k) if 0x2000000 <= sp < 0x4000000 else 0
                if 0x08000000 <= w < 0x0A000000 and w & 1:
                    s = sym(w)
                    if not bt or bt[-1] != s:
                        bt.append(s)
            calls.append({"n": c, "pc": sym(cpu.gprs[15]), "lr": sym(lr), "sp": hex(sp), "stack": bt[:8]})
    oracle.frame += 1
    results.append({"frame": fno, "steps": steps, "rngAfter": u32(G_RNG), "cnt": cnt, "cb2": hex(u32(G_MAIN + 4)),
                    "inBattle": (oracle.read_u8(G_MAIN + 0x439) >> 1) & 1, "btf": hex(u32(G_BTF)), "calls": calls})
OUT.write_text(json.dumps(results, indent=1))
print(len(results), "frames")
