#!/usr/bin/env python3
"""hcr3m: per-frame ROM battle-script trace of a frozen T2 drive request (the *.frozen.json of tools/audio/romDriveSeed.sh).

usage: python3 tools/run-mgba-probe.py OUT.json -- python3 tools/integration/hcr3mProbe.py OUT.json FROZEN.json [--profile on|off] [--from N]

One row per frame (from frame N on) where gBattlescriptCurrInstr / gBattleControllerExecFlags / gAnimScriptActive / gBattleMainFunc /
gBattleCommunication[0] / the two active HPs / gCurrentMove / the message printer changed: [frame, ptr, exec, anim, main, comm0, hp0, hp1, move, tp].
tp = sTextPrinters[0] (the battle message window's printer; a static, so its address comes from the ELF symbol table) `active | state << 8`; its rising edge is the frame the print starts (labCompare.py print rows).
Frame k = the k-th advance of the frozen trace = the sound probe's frame k (soundEventProbe lab --drive). Symbols: `names` maps each ROM script
address that occurs to the nearest preceding ELF symbol + offset (arm-none-eabi-nm), so rows read as BattleScript_X+0x2c."""
import bisect
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = (ROOT / "reference/pokeemerald").resolve()
PROFILES = {"on": ("battle-scene-on", "factory.json"), "off": ("battle-scene-off", "factory-battle-scene-off.json")}


def symbol_table():
    out = subprocess.run(["arm-none-eabi-nm", "-n", str(REF / "pokeemerald.elf")], capture_output=True, text=True, check=True).stdout
    pairs = sorted((int(a, 16), n) for a, t, n in (line.split() for line in out.splitlines() if len(line.split()) == 3) if t.lower() in "tdr")
    return [a for a, _ in pairs], [n for _, n in pairs]


def text_printer_address():
    out = subprocess.run(["arm-none-eabi-nm", str(REF / "pokeemerald.elf")], capture_output=True, text=True, check=True).stdout
    return next(int(a, 16) for a, _t, n in (line.split() for line in out.splitlines() if len(line.split()) == 3) if n == "sTextPrinters")


def main():
    out, req_path, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1] if "--profile" in rest else "on"]
    start = int(rest[rest.index("--from") + 1]) if "--from" in rest else 0
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    request = json.loads(Path(req_path).read_text())
    request["profile"] = profile
    request.pop("replay", None)
    request = validate_request(request, profile)
    BattleLab(oracle, profile).prepare(request)
    sym = oracle.symbols
    mons = sym["gBattleMons"]
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    printer = text_printer_address()  # struct TextPrinter: active at 0x1B, state at 0x1C (include/text.h)

    def read():
        return (u32(sym["gBattlescriptCurrInstr"]), u32(sym["gBattleControllerExecFlags"]), u8(sym["gAnimScriptActive"]), u32(sym["gBattleMainFunc"]),
                u8(sym["gBattleCommunication"]), u16(mons + 0x28), u16(mons + 0x58 + 0x28), u16(sym["gCurrentMove"]), u8(printer + 0x1B) | u8(printer + 0x1C) << 8)

    rows, last, frame = [], None, 0
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            oracle.advance(seg.get("buttons", []))
            frame += 1
            if frame < start:
                continue
            cur = read()
            if cur != last:
                rows.append([frame, *cur])
                last = cur
    addrs, names = symbol_table()
    named = {}
    for r in rows:
        p = r[1]
        if p not in named and 0x08000000 <= p < 0x0A000000:
            i = bisect.bisect_right(addrs, p) - 1
            named[p] = f"{names[i]}+{p - addrs[i]:#x}" if i >= 0 else hex(p)
    out.write_text(json.dumps({"rows": rows, "names": {hex(k): v for k, v in named.items()}}, separators=(",", ":")))


if __name__ == "__main__":
    main()
