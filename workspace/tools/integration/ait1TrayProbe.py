#!/usr/bin/env python3
"""ait1: per-frame ROM state across the AI switch tray hold (EndDrawPartyStatusSummary's partyStatusDelayTimer).

usage: python3 tools/run-mgba-probe.py OUT.json -- python3 tools/integration/ait1TrayProbe.py OUT.json LAB_OR_FROZEN.json --profile on|off --from A --to B [--battler 1] [--all]
Rows: [frame, playTimeVBlanks, delayTimer, vblankCounter1 & 0xFF, summaryShown, exec, instr, textPrinter, anim]; --all records only changes while the tray is shown."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
sys.path.insert(0, str(ROOT / "tools/integration"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402
from hcr3mProbe import PROFILES, REF, text_printer_address  # noqa: E402


def main():
    out, req_path, rest = Path(sys.argv[1]), sys.argv[2], sys.argv[3:]
    profile, bootstrap = PROFILES[rest[rest.index("--profile") + 1]]
    lo, hi = int(rest[rest.index("--from") + 1]), int(rest[rest.index("--to") + 1])
    battler = int(rest[rest.index("--battler") + 1]) if "--battler" in rest else 1
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle/bootstrap" / bootstrap)
    request = json.loads(Path(req_path).read_text())
    request["profile"] = profile
    request.pop("replay", None)
    request = validate_request(request, profile)
    BattleLab(oracle, profile).prepare(request)
    sym = oracle.symbols
    u8, u32 = oracle.read_u8, oracle.read_u32
    printer = text_printer_address()
    main_addr = sym["gMain"]
    rows, frame, last = [], 0, None
    all_frames = "--all" in rest
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            oracle.advance(seg.get("buttons", []))
            frame += 1
            if frame < lo or frame > hi:
                continue
            if all_frames:
                hb = u32(sym["gBattleSpritesDataPtr"])
                if not hb:
                    continue
                h = u32(hb + 4) + 12 * battler
                cur = (u8(h) & 1, u8(h + 5), u32(sym["gBattleControllerExecFlags"]) & 2, u32(sym["gBattlescriptCurrInstr"]), u8(printer + 0x1B))
                if cur[0] == 0 and (last is None or last[0] == 0):
                    last = cur
                    continue
                if cur != last:
                    rows.append([frame, 0, cur[1], 0, cur[0], cur[2], cur[3], cur[4], 0])
                last = cur
                continue
            hb = u32(sym["gBattleSpritesDataPtr"])
            h = u32(hb + 4) + 12 * battler
            rows.append([frame, u8(u32(sym["gSaveBlock2Ptr"]) + 0x11), u8(h + 5), u32(main_addr + 0x20) & 0xFF, u8(h) & 1, u32(sym["gBattleControllerExecFlags"]),
                         u32(sym["gBattlescriptCurrInstr"]), u8(printer + 0x1B) | u8(printer + 0x1C) << 8, u8(sym["gAnimScriptActive"])])
    names = {}
    if all_frames:
        import subprocess
        import bisect
        nm = subprocess.run(["arm-none-eabi-nm", "-n", str(REF / "pokeemerald.elf")], capture_output=True, text=True, check=True).stdout
        pairs = sorted((int(a, 16), n) for a, t, n in (l.split() for l in nm.splitlines() if len(l.split()) == 3) if t.lower() in "tdr")
        addrs = [a for a, _ in pairs]
        for r in rows:
            i = bisect.bisect_right(addrs, r[6]) - 1
            names[r[6]] = f"{pairs[i][1]}+{r[6] - pairs[i][0]:#x}"
    out.write_text(json.dumps({"names": names, "cols": ["frame", "playTimeVBlanks", "delayTimer", "vblankCounter1", "summaryShown", "exec", "instr", "tp", "anim"], "rows": rows}, separators=(",", ":")))


if __name__ == "__main__":
    main()
