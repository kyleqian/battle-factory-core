#!/usr/bin/env python3
"""Stage a player-faint BattleLab scenario (docs/playerfaint-lend-audit.md s1): drive the stock ROM adaptively (direct mGBA, Scene ON) and
write the button schedule it needed as a FIXED `trace.segments` list, so every later run (postkoStateProbe.py, two fresh runs) replays plain
controller input.  Adaptive rules (all read from ROM state, never injected):
  * action prompt (gBattlerControllerFuncs[0] == HandleInputChooseAction rises): +24 A (FIGHT), then the move cursor is moved from its
    remembered slot (gMoveSelectionCursor[0]; layout 0 1 / 2 3) to the planned slot with RIGHT/LEFT/DOWN/UP presses 12 frames apart, then A;
  * forced party menu (player battler fainted): A every 30 frames until CB2_InitPartyMenu (the "<mon> fainted!" message waits for A), then
    80 frames (the menu ignores input while its fade runs, ~60 frames), DOWN x `menuDown` (12 apart), +30 A (selection menu), +40 A (SHIFT);
  * idle fallback: >900 frames without an event while turns remain -> A every 60 frames (logged as idle-A);
  * otherwise no input.  Battle ends early only if `frames` runs out.
usage: playerfaintStage.py <base scenario.json> <out scenario.json> '<json: {"turns":[slot,...], "menuDown":1, "frames":N}>'
"""
from __future__ import annotations
import bisect, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REF = ROOT / "reference" / "pokeemerald"
text = subprocess.run(["arm-none-eabi-nm", "--defined-only", "-n", str(REF / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
N, F = {}, []
for line in text.splitlines():
    f = line.split()
    if len(f) == 3:
        N[f[2]] = int(f[0], 16) & ~1 if f[1] in "tT" else int(f[0], 16)
        if f[1] in "tT":
            F.append((int(f[0], 16) & ~1, f[2]))
F.sort()
FA = [a for a, _ in F]


def sym(a):
    a &= ~1
    i = bisect.bisect_right(FA, a) - 1
    return F[i][1] if i >= 0 and F[i][0] == a else hex(a)


def main():
    base, out, plan = Path(sys.argv[1]), Path(sys.argv[2]), json.loads(sys.argv[3])
    scenario = json.loads(base.read_text())
    scenario["trace"] = {"segments": [{"frames": 1, "buttons": []}]}
    request = validate_request(scenario, "battle-scene-on")
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(o, "battle-scene-on")
    lab.prepare(request)
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    turns, menu_down, total = list(plan["turns"]), int(plan.get("menuDown", 1)), int(plan["frames"])
    pressed: dict[int, list[str]] = {}
    events, prev_ctrl, menu_state, menu_at = [], "", "idle", None
    for frame in range(1, total + 1):
        buttons = pressed.get(frame, [])
        o.advance(buttons)
        ctrl, cb2 = sym(u32(N["gBattlerControllerFuncs"])), sym(u32(N["gMain"] + 4))
        hp0 = u16(N["gBattleMons"] + 0x28)
        if ctrl == "HandleInputChooseAction" and prev_ctrl != "HandleInputChooseAction" and turns:
            slot, cur = turns.pop(0), u8(N["gMoveSelectionCursor"])
            t = frame + 24
            seq = [(t, "A")]
            t += 32
            dc, dr = slot % 2 - cur % 2, slot // 2 - cur // 2
            for btn, n in (("RIGHT" if dc > 0 else "LEFT", abs(dc)), ("DOWN" if dr > 0 else "UP", abs(dr))):
                for _ in range(n):
                    seq.append((t, btn))
                    t += 12
            seq.append((t, "A"))
            for at, btn in seq:
                pressed[at] = pressed[at + 1] = [btn]
            events.append({"frame": frame, "kind": "prompt", "moveSlot": slot, "cursorWas": cur, "presses": seq})
        if hp0 == 0 and menu_state == "idle" and cb2 == "BattleMainCB2" and ctrl not in ("HandleInputChooseAction",):
            menu_state, menu_at = "faint", frame
            events.append({"frame": frame, "kind": "player-hp-zero"})
        if menu_state == "faint" and cb2 != "CB2_InitPartyMenu" and (frame - menu_at) % 30 == 0 and frame - menu_at >= 60:
            pressed[frame + 1] = pressed[frame + 2] = ["A"]
        if menu_state == "faint" and cb2 == "CB2_InitPartyMenu":
            menu_state = "menu"
            t = frame + 80
            seq = []
            for _ in range(menu_down):
                seq.append((t, "DOWN"))
                t += 12
            seq += [(t + 18, "A"), (t + 58, "A")]
            for at, btn in seq:
                pressed[at] = pressed[at + 1] = [btn]
            events.append({"frame": frame, "kind": "party-menu-open", "presses": seq})
        if menu_state == "menu" and cb2 == "BattleMainCB2" and u16(N["gBattleMons"] + 0x28) > 0:
            menu_state = "done"
            events.append({"frame": frame, "kind": "player-switched-in", "species": u16(N["gBattleMons"])})
        # idle fallback: a message that waits for A (none needed in the committed scenarios; kept for other geometries)
        if turns and menu_state != "menu" and frame - max([e["frame"] for e in events] + [0]) > 900 and frame % 60 == 0 \
                and ctrl != "HandleInputChooseAction":
            pressed[frame + 1] = pressed[frame + 2] = ["A"]
            events.append({"frame": frame, "kind": "idle-A"})
        prev_ctrl = ctrl
    segments, cur, run = [], None, 0
    for frame in range(1, total + 1):
        b = pressed.get(frame, [])
        if b == cur:
            run += 1
        else:
            if run:
                segments.append({"frames": run, "buttons": cur})
            cur, run = b, 1
    segments.append({"frames": run, "buttons": cur})
    scenario["trace"] = {"segments": segments}
    out.write_text(json.dumps(scenario, separators=(",", ":")) + "\n")
    print(json.dumps({"out": str(out), "events": events, "leftTurns": turns}))


if __name__ == "__main__":
    try:
        main()
    except BaseException:
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        os._exit(1)
    sys.stdout.flush()
    os._exit(0)
