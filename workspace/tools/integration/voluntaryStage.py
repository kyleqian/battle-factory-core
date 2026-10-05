#!/usr/bin/env python3
"""Stage a voluntary-switch BattleLab scenario (docs/voluntary-switch-lend-audit.md s1): drive the stock ROM adaptively (direct mGBA,
Scene ON) and write the button schedule it needed as a FIXED `trace.segments` list, so every later run (postkoStateProbe.py, two fresh
runs) replays plain controller input.  Adapted from playerfaintStage.py; adaptive rules (all read from ROM state, never injected):
  * action prompt (gBattlerControllerFuncs[0] == HandleInputChooseAction rises): the next turn item is popped.  The action cursor is moved
    from its remembered slot (gActionSelectionCursor[0]; layout FIGHT 0 BAG 1 / POKEMON 2 RUN 3) to FIGHT or POKEMON from +24 with
    presses 12 frames apart, then A.  Move item (int slot): +32 the move cursor is moved from gMoveSelectionCursor[0] (layout 0 1 / 2 3),
    then A.  Party items ({"cancel":true} / {"switch":n}): when CB2_InitPartyMenu appears, +80 frames (the menu ignores input during its
    ~60-frame fade; the cursor starts on the current mon, slot 0), then B (cancel; the prompt rises again and pops the next item) or
    DOWN x n (12 apart), +18 A (selection menu), +40 A (SHIFT);
  * forced party menu (player battler fainted): A every 30 frames until CB2_InitPartyMenu, then +80 DOWN x `forcedDown`, +18 A, +40 A;
  * idle fallback: >900 frames without an event while turns remain -> A every 60 frames (logged as idle-A).
usage: voluntaryStage.py <base scenario.json> <out scenario.json> '<json: {"turns":[slot | {"cancel":true} | {"switch":n}, ...],
       "forcedDown":1 | [1,2,...], "frames":N}>'
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


def nav(t, cur, target):
    """Presses (12 frames apart from t) moving a 2x2 cursor from cur to target; returns (presses, next t)."""
    seq = []
    dc, dr = target % 2 - cur % 2, target // 2 - cur // 2
    for btn, n in (("RIGHT" if dc > 0 else "LEFT", abs(dc)), ("DOWN" if dr > 0 else "UP", abs(dr))):
        for _ in range(n):
            seq.append((t, btn))
            t += 12
    return seq, t


def main():
    base, out, plan = Path(sys.argv[1]), Path(sys.argv[2]), json.loads(sys.argv[3])
    scenario = json.loads(base.read_text())
    scenario["trace"] = {"segments": [{"frames": 1, "buttons": []}]}
    request = validate_request(scenario, "battle-scene-on")
    o = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(o, "battle-scene-on")
    lab.prepare(request)
    u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32
    turns, total = list(plan["turns"]), int(plan["frames"])
    forced = plan.get("forcedDown", 1)
    forced = list(forced) if isinstance(forced, list) else [int(forced)]
    pressed: dict[int, list[str]] = {}
    events, prev_ctrl, menu_state, menu_at, party_item = [], "", "idle", None, None

    def press(seq):
        for at, btn in seq:
            pressed[at] = pressed[at + 1] = [btn]

    for frame in range(1, total + 1):
        o.advance(pressed.get(frame, []))
        ctrl, cb2 = sym(u32(N["gBattlerControllerFuncs"])), sym(u32(N["gMain"] + 4))
        hp0 = u16(N["gBattleMons"] + 0x28)
        if ctrl == "HandleInputChooseAction" and prev_ctrl != "HandleInputChooseAction" and turns:
            item, acur = turns.pop(0), u8(N["gActionSelectionCursor"])
            target = 0 if isinstance(item, int) else 2
            seq, t = nav(frame + 24, acur, target)
            seq.append((t, "A"))
            if isinstance(item, int):
                t += 32
                more, t = nav(t, u8(N["gMoveSelectionCursor"]), item)
                seq += more + [(t, "A")]
            else:
                menu_state, party_item = "voluntary", item
            press(seq)
            events.append({"frame": frame, "kind": "prompt", "item": item, "actionCursorWas": acur, "presses": seq})
        if menu_state == "voluntary" and cb2 == "CB2_InitPartyMenu":
            menu_state, t = "menu", frame + 80
            if party_item.get("cancel"):
                seq = [(t, "B")]
            else:
                seq = []
                for _ in range(int(party_item["switch"])):
                    seq.append((t, "DOWN"))
                    t += 12
                seq += [(t + 18, "A"), (t + 58, "A")]
            press(seq)
            events.append({"frame": frame, "kind": "party-menu-open", "voluntary": True, "item": party_item, "presses": seq})
        if hp0 == 0 and menu_state == "idle" and cb2 == "BattleMainCB2" and ctrl != "HandleInputChooseAction":
            menu_state, menu_at = "faint", frame
            events.append({"frame": frame, "kind": "player-hp-zero"})
        if menu_state == "faint" and cb2 != "CB2_InitPartyMenu" and (frame - menu_at) % 30 == 0 and frame - menu_at >= 60:
            pressed[frame + 1] = pressed[frame + 2] = ["A"]
        if menu_state == "faint" and cb2 == "CB2_InitPartyMenu":
            menu_state, t, seq = "menu", frame + 80, []
            for _ in range(forced.pop(0) if len(forced) > 1 else forced[0]):
                seq.append((t, "DOWN"))
                t += 12
            seq += [(t + 18, "A"), (t + 58, "A")]
            press(seq)
            events.append({"frame": frame, "kind": "party-menu-open", "voluntary": False, "presses": seq})
        if menu_state == "menu" and cb2 == "BattleMainCB2" and u16(N["gBattleMons"] + 0x28) > 0:
            menu_state = "idle"
            events.append({"frame": frame, "kind": "battle-returned", "species": u16(N["gBattleMons"])})
        if turns and menu_state not in ("menu", "voluntary") and frame - max([e["frame"] for e in events] + [0]) > 900 \
                and frame % 60 == 0 and ctrl != "HandleInputChooseAction":
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
