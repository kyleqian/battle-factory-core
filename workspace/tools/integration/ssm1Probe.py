#!/usr/bin/env python3
"""ssm1: per-frame ROM battle-ANIMATION-script trace of a battle lab request (extends hcr3mProbe: same prepare / advance loop).

usage: python3 tools/run-mgba-probe.py OUT.json -- python3 tools/integration/ssm1Probe.py OUT.json LAB.json [--profile on|off] [--from N] [--to N]

One row per frame where any of: the battle-script pointer, the animation script pointer (sBattleAnimScriptPtr), sAnimFramesToWait, gAnimScriptActive,
gAnimVisualTaskCount, gAnimSoundTaskCount, the exec flags, the in-use sprite count / their callbacks, the active tasks' funcs changed:
[frame, bsPtr, animPtr, framesToWait, active, visualTasks, soundTasks, exec, [sprite callback names], [task func names]]. Symbols resolved as hcr3mProbe."""
import bisect
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
sys.path.insert(0, str(ROOT / "tools/integration"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402
from hcr3mProbe import PROFILES, REF, symbol_table  # noqa: E402


def main():
    out, req_path, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    start = int(rest[rest.index("--from") + 1]) if "--from" in rest else 0
    stop = int(rest[rest.index("--to") + 1]) if "--to" in rest else 10**9
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    request = json.loads(Path(req_path).read_text())
    request["profile"] = profile
    request.pop("replay", None)
    request = validate_request(request, profile)
    BattleLab(oracle, profile).prepare(request)
    sym = oracle.symbols
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    elf = subprocess.run(["arm-none-eabi-nm", str(REF / "pokeemerald.elf")], capture_output=True, text=True, check=True).stdout
    es = {n: int(a, 16) for a, _t, n in (line.split() for line in elf.splitlines() if len(line.split()) == 3)}
    animptr, wait, vtc, stc, active, cb = (es["sBattleAnimScriptPtr"], es["sAnimFramesToWait"], es["gAnimVisualTaskCount"], es["gAnimSoundTaskCount"], es["gAnimScriptActive"], es["gAnimScriptCallback"])
    sprites, tasks = es["gSprites"], es["gTasks"]

    def read():
        cbs = []
        for i in range(64):
            b = sprites + i * 0x44
            if u8(b + 0x3E) & 1:
                cbs.append(u32(b + 0x1C))
        fns = []
        for i in range(16):
            b = tasks + i * 0x28
            if u8(b + 4):
                fns.append(u32(b))
        return [u32(sym["gBattlescriptCurrInstr"]), u32(animptr), u16(wait), u8(active), u8(vtc), u8(stc), u32(sym["gBattleControllerExecFlags"]), sorted(cbs), sorted(fns)]

    rows, last, frame = [], None, 0
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            oracle.advance(seg.get("buttons", []))
            frame += 1
            if frame < start or frame > stop:
                continue
            cur = read()
            if cur != last:
                rows.append([frame, *cur])
                last = cur
    addrs, names = symbol_table()
    named = {}

    def nm(p):
        if p not in named and 0x08000000 <= p < 0x0A000000:
            i = bisect.bisect_right(addrs, p) - 1
            named[p] = f"{names[i]}+{p - addrs[i]:#x}" if i >= 0 else hex(p)
        return named.get(p, hex(p))

    res = [[r[0], nm(r[1]), nm(r[2]), *r[3:8], [nm(c) for c in r[8]], [nm(c) for c in r[9]]] for r in rows]
    out.write_text(json.dumps(res, separators=(",", ":")))


if __name__ == "__main__":
    main()
