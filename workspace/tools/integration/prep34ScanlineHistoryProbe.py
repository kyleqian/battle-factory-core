#!/usr/bin/env python3
"""prep34: gScanlineEffect history of a lab scenario from trace frame 0 through the first MOVE_<id> activation.

Run only through tools/run-mgba-probe.py (or the mGBA venv directly).  Records the scanline state at frame 0 and every
frame on which (state, srcBuffer, dmaDest, dmaControl, buffers) changes, plus every animation-script activation edge
(gAnimScriptActive rising, with the script symbol), up to and including the activation row of the selected move.
usage: prep34ScanlineHistoryProbe.py <scenario> <output.json> <move id> <move label> <end label>
"""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 6:
    raise SystemExit("usage: prep34ScanlineHistoryProbe.py <scenario> <output.json> <move id> <move label> <end label>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
MOVE, LABEL, END = int(sys.argv[3]), sys.argv[4], sys.argv[5]
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {n: a for a, n in pairs}
    funcs = sorted((a, n) for a, n in pairs if n.startswith("Move_"))
    sy = oracle.symbols
    u8 = lambda a: oracle.read_u8(a)
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    u32 = lambda a: u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names[LABEL], names[END]
    scanline, buffers = sy["gScanlineEffect"], sy["gScanlineEffectRegBuffers"]

    def label_of(ptr: int) -> str | None:
        best = None
        for a, n in funcs:
            if a <= ptr: best = n
            else: break
        return best

    def scan() -> dict:
        banks = [[s16(buffers + bank * 0x780 + i * 2) for i in range(320)] for bank in range(2)]
        return {"state": u8(scanline + 21), "srcBuffer": u8(scanline + 20), "dmaDest": u32(scanline + 8),
                "dmaControl": u32(scanline + 12), "waveTaskId": u8(scanline + 24),
                "bankSha1": [hashlib.sha1(json.dumps(b).encode()).hexdigest()[:16] for b in banks], "banks": banks}

    changes, edges, last, was_active, frame, done = [], [], None, False, 0, False
    def take() -> bool:
        nonlocal last, was_active
        s = scan(); key = json.dumps({k: s[k] for k in ("state", "srcBuffer", "dmaDest", "dmaControl", "bankSha1")})
        act = bool(u8(active)); ptr = u32(pointer)
        if act and not was_active:
            edges.append({"frame": frame, "script": label_of(ptr), "currentMove": lab.snapshot()["engine"]["currentMove"]})
        was_active = act
        hit = act and start <= ptr < end
        if key != last or hit:
            row = {"frame": frame, **{k: s[k] for k in ("state", "srcBuffer", "dmaDest", "dmaControl", "waveTaskId", "bankSha1")}}
            if hit or frame == 0: row["banks"] = s["banks"]
            if hit: row["activation"] = True
            changes.append(row); last = key
        return hit
    done = take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            if done: break
            oracle.advance(segment.get("buttons", [])); frame += 1; done = take()
    if not done:
        raise RuntimeError(f"{LABEL} activation not observed by frame {frame}; edges {edges}")
    # compact bank summary as runs
    for row in changes:
        if "banks" in row:
            row["bankRuns"] = []
            for bank in row["banks"]:
                runs = []
                for v in bank:
                    if runs and runs[-1][0] == v: runs[-1][1] += 1
                    else: runs.append([v, 1])
                row["bankRuns"].append(runs)
    OUTPUT.write_text(json.dumps({"schema": "prep34-scanline-history/v1", "scenario": SCENARIO.name, "move": MOVE,
                                  "activationFrame": frame, "animationEdges": edges, "changes": changes}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: activation {frame}, {len(changes)} scanline rows, {len(edges)} animation edges")


if __name__ == "__main__":
    main()
