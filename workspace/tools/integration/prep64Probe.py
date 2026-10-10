#!/usr/bin/env python3
"""prep64: per-frame sSpriteOrder + Substitute / battle-script state probe (direct mGBA, never the shared HTTP oracles).

usage: prep64Probe.py <profile> <scenario.json> <output.json>      (profile: battle-scene-on | battle-scene-off)
`rows` is tools/compare/spriteOrderEventProbe.py's sprite-order-event-raw/v2 row format unchanged (same sampling hook, same
"last all-free + identity order frame" cut, same change compaction), so prep43Extract / spriteOrderBodyPlans read it as is.
`state` adds one row per change of: the battle-script cursor (gBattlescriptCurrInstr -> enclosing BattleScript_* label + offset),
gBattleMons[0/1].hp, gDisableStructs[0/1].substituteHP, STATUS2_SUBSTITUTE bits, behindSubstitute bits, gAnimScriptActive,
sAnimMoveIndex, the running anim script label (sBattleAnimScriptPtr -> Move_* / General_* / ...), gBattleControllerExecFlags and
gBattleCommunication[MSG_DISPLAY] and gBattleAnimAttacker
(row: [n, tf, cursor, hp0, hp1, sub0, sub1, s2sub, behind, act, mv, anim, execFlags, msg, animAttacker]).
"""
from __future__ import annotations
import bisect, hashlib, json, os, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: prep64Probe.py <profile> <scenario> <output.json>")
PROFILE = sys.argv[1]
SCENARIO, OUTPUT = map(Path, sys.argv[2:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

IDENT = list(range(64))
BOOTSTRAP = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[PROFILE]
STATUS2_SUBSTITUTE = 0x01000000


def symbols(elf):
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", "-S", str(elf)], check=True, capture_output=True, text=True).stdout
    addr, size = {}, {}
    for p in (l.split() for l in nm.splitlines()):
        if len(p) == 4:
            addr[p[3]] = int(p[0], 16); size[p[3]] = int(p[1], 16)
        elif len(p) == 3:
            addr.setdefault(p[2], int(p[0], 16))
    return addr, size


def main():
    raw = json.loads(SCENARIO.read_text())
    request = validate_request(raw, PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / BOOTSTRAP)
    lab = BattleLab(oracle, PROFILE)
    names, sizes = symbols(ref / "pokeemerald.elf")
    u8, u32 = oracle.read_u8, oracle.read_u32
    spr, oa = names["gSprites"], names["sSpriteOrder"]
    disable, dsize = names["gDisableStructs"], sizes.get("gDisableStructs", 0x1C * 4) // 4
    mons, msize = names["gBattleMons"], sizes.get("gBattleMons", 0x58 * 4) // 4

    def table(prefixes):
        t = sorted((a, n) for n, a in names.items() if n.startswith(prefixes) and 0x08000000 <= a < 0x0A000000)
        return [a for a, _ in t], t
    bs_addrs, bs = table(("BattleScript_",))
    an_addrs, an = table(("Move_", "General_", "Special_", "Status_"))

    def label(addrs, tab, ptr, with_off):
        i = bisect.bisect_right(addrs, ptr) - 1
        if i < 0:
            return hex(ptr)
        return f"{tab[i][1]}+{ptr - tab[i][0]}" if with_off else tab[i][1]

    def u16(a): return u8(a) | u8(a + 1) << 8

    frames, states, state = [], [], {"n": 0, "tf": None}

    def sample():
        mask, keys = 0, {}
        for i in range(64):
            b = spr + 0x44 * i
            if u8(b + 0x3E) & 1:
                mask |= 1 << i
                a0, a1, a2 = u16(b), u16(b + 2), u16(b + 4)
                keys[i] = [(a2 >> 10) & 3, u8(b + 0x43), a0 & 0xFF, (a0 >> 8) & 3, (a1 >> 14) & 3, (a0 >> 14) & 3, (u8(b + 0x3E) >> 2) & 1]
        order = [u8(oa + i) for i in range(64)]
        if mask == 0 and order == IDENT:
            frames.clear()
            states.clear()
        act, mv = u8(names["gAnimScriptActive"]), u16(names["sAnimMoveIndex"])
        frames.append({"n": state["n"], "tf": state["tf"], "order": order, "mask": mask, "keys": keys, "act": act, "mv": mv})
        sdp = u32(names["gBattleSpritesDataPtr"])
        behind = 0
        if 0x02000000 <= sdp < 0x02040000:
            bd = u32(sdp)
            if 0x02000000 <= bd < 0x02040000:
                behind = sum(((u16(bd + b * 4) >> 2) & 1) << b for b in range(2))
        s2 = sum(((u32(mons + b * msize + 0x50) & STATUS2_SUBSTITUTE) != 0) << b for b in range(2))
        st = [label(bs_addrs, bs, u32(names["gBattlescriptCurrInstr"]), True),
              u16(mons + 0x28), u16(mons + msize + 0x28),
              u8(disable + 10), u8(disable + dsize + 10), s2, behind, act, mv,
              label(an_addrs, an, u32(names["sBattleAnimScriptPtr"]), False) if act else None,
              u32(names["gBattleControllerExecFlags"]), u8(names["gBattleCommunication"] + 7), u8(names["gBattleAnimAttacker"])]
        if not states or states[-1][2:] != st:
            states.append([state["n"], state["tf"], *st])

    orig = oracle.advance

    def advance(buttons):
        r = orig(buttons)
        state["n"] += 1
        if state["tf"] is not None:
            state["tf"] += 1
        sample()
        return r
    oracle.advance = advance
    lab.prepare(request)
    state["tf"] = 0
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]):
            advance(seg.get("buttons", []))
    rows, prev = [], None
    for i, f in enumerate(frames):
        sig = (tuple(f["order"]), f["mask"], f["act"], f["mv"])
        before_change = i + 1 < len(frames) and frames[i + 1]["mask"] != f["mask"]
        if sig != prev or before_change:
            row = [f["n"], f["tf"], bytes(f["order"]).hex(), format(f["mask"], "x"), f["act"], f["mv"]]
            if prev is None or prev[1] != f["mask"] or before_change:
                row.append({str(k): v for k, v in f["keys"].items()})
            rows.append(row)
        prev = sig
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": "prep64-substitute-order/v1", "profile": PROFILE, "seed": raw.get("seed"),
        "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "frameCount": len(frames),
        "firstFrame": frames[0]["n"], "lastFrame": frames[-1]["n"], "rows": rows, "state": states}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} frames={len(frames)} rows={len(rows)} state={len(states)}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)
