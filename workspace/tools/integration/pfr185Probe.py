#!/usr/bin/env python3
"""pfr185: fresh direct-mGBA probe of the PLAYER faint-replacement send-in (either scene). Adaptive input driven from ROM state (the
playerfaintStage.py recipe: action prompt -> FIGHT -> move slot; "<mon> fainted!" waits for A; forced party menu -> DOWN -> A -> A), then
per-frame rows from the player-faint frame H until the next action prompt (+ a tail).  No input is pressed after the party menu's SHIFT.
usage (workspace root, mgba venv, via tools/run-mgba-probe.py):
  FS_PROFILE=battle-scene-on|battle-scene-off pfr185Probe.py <scenario.json> <out.json>
out: {"H": frame of hp0 == 0, "frames": N, "rows": {frame-H: {...}}, "spawns": [...], "inputs": [...]}"""
import bisect, json, os, subprocess, sys
from pathlib import Path

SCEN, OUT = map(Path, sys.argv[1:3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = os.environ.get("FS_PROFILE", "battle-scene-off")
TAIL = int(os.environ.get("PFR_TAIL", "60"))
BUDGET = int(os.environ.get("PFR_BUDGET", "6000"))
ref = ROOT / "reference" / "pokeemerald"
d = json.loads(SCEN.read_text())
d["profile"] = PROFILE
d["trace"] = {"segments": [{"frames": 1, "buttons": []}]}
req = validate_request(d, PROFILE)
BOOT = {"battle-scene-on": "factory.json", "battle-scene-off": "factory-battle-scene-off.json"}[PROFILE]
o = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / BOOT)
lab = BattleLab(o, PROFILE)
lab.prepare(req)
nm = subprocess.run(["arm-none-eabi-nm", "-n", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
lines = [p for p in (l.split() for l in nm.splitlines()) if len(p) == 3]
sym = {p[2]: int(p[0], 16) for p in lines}
addr = sorted((int(p[0], 16) & ~1, p[2]) for p in lines)  # static functions share names across files: name by the full list
keys = [a for a, _ in addr]


def name(p):
    p &= ~1
    i = bisect.bisect_right(keys, p) - 1
    return addr[i][1] if i >= 0 and p - keys[i] < 0x2000 else hex(p)


u8, u16, u32 = o.read_u8, o.read_u16, o.read_u32


def sg(a):
    v = u16(a)
    return v - 0x10000 if v >= 0x8000 else v


SP = sym["gSprites"]


def inuse():
    return [i for i in range(64) if u8(SP + i * 0x44 + 0x3e) & 1]


def battler(b):
    i = u8(sym["gBattlerSpriteIds"] + b)
    a = SP + i * 0x44
    return [i, sg(a + 0x20), sg(a + 0x22), sg(a + 0x24), sg(a + 0x26), u8(a + 0x3e) >> 2 & 1, u8(a + 0x3e) & 1, u16(a + 2) >> 9 & 31]


def hbox(b):
    i = u8(sym["gHealthboxSpriteIds"] + b)
    a = SP + i * 0x44
    return [i, sg(a + 0x20), sg(a + 0x22), sg(a + 0x24), sg(a + 0x26), u8(a + 0x3e) >> 2 & 1, u8(a + 0x3e) & 1]


def row():
    return {"ctrl": [name(u32(sym["gBattlerControllerFuncs"] + 4 * b)) for b in (0, 1)], "cb2": name(u32(sym["gMain"] + 4)),
            "main": name(u32(sym["gBattleMainFunc"])), "bs": u32(sym["gBattlescriptCurrInstr"]),
            "pidx": [u8(sym["gBattlerPartyIndexes"] + 2 * b) for b in (0, 1)],
            "species": [u16(sym["gBattleMons"] + 0x58 * b) for b in (0, 1)], "hp": [u16(sym["gBattleMons"] + 0x58 * b + 0x28) for b in (0, 1)],
            "b": [battler(0), battler(1)], "h": [hbox(0), hbox(1)], "anim": u8(sym["gAnimScriptActive"]),
            "txt": "".join("%02x" % u8(sym["sTextPrinters"] + k) for k in range(0x24)),
            "tasks": {i: name(u32(sym["gTasks"] + i * 0x28)) for i in range(16) if u8(sym["gTasks"] + i * 0x28 + 4)}}


turns = [0]
pressed, inputs = {}, []
for at in (25, 26, 57, 58):  # the lab scenarios' own opening presses (24 idle, A, 30 idle, A)
    pressed[at] = ["A"]
prev_ctrl, state, menu_at, H, done_at = "", "idle", None, None, None
rows, spawns, prev_sp = {}, [], set()
for frame in range(1, BUDGET + 1):
    o.advance(pressed.get(frame, []))
    ctrl = name(u32(sym["gBattlerControllerFuncs"]))
    cb2 = name(u32(sym["gMain"] + 4))
    hp0 = u16(sym["gBattleMons"] + 0x28)
    if ctrl == "HandleInputChooseAction" and prev_ctrl != "HandleInputChooseAction":
        if turns:
            slot, cur = turns.pop(0), u8(sym["gMoveSelectionCursor"])
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
            inputs.append({"frame": frame, "kind": "prompt", "presses": seq})
        elif state == "back":
            done_at = frame
    if hp0 == 0 and state == "idle" and cb2 == "BattleMainCB2" and ctrl != "HandleInputChooseAction":
        state, menu_at, H = "faint", frame, frame
        inputs.append({"frame": frame, "kind": "player-hp-zero"})
    if state == "faint" and cb2 != "CB2_InitPartyMenu" and (frame - menu_at) % 30 == 0 and frame - menu_at >= 60:
        pressed[frame + 1] = pressed[frame + 2] = ["A"]
    if state == "faint" and cb2 == "CB2_InitPartyMenu":
        state = "menu"
        t = frame + 80
        seq = [(t, "DOWN"), (t + 12 + 18, "A"), (t + 12 + 58, "A")]
        for at, btn in seq:
            pressed[at] = pressed[at + 1] = [btn]
        inputs.append({"frame": frame, "kind": "party-menu-open", "presses": seq})
    if state == "menu" and cb2 == "BattleMainCB2":
        state = "back"
        inputs.append({"frame": frame, "kind": "menu-closed"})
    sp = set(inuse())
    if H is not None:
        for i in sorted(sp - prev_sp):
            spawns.append({"f": frame - H, "slot": i, "ev": "+", "cb": name(u32(SP + i * 0x44 + 0x1c)), "tmpl": hex(u32(SP + i * 0x44 + 0x14)),
                           "x": sg(SP + i * 0x44 + 0x20), "y": sg(SP + i * 0x44 + 0x22)})
        for i in sorted(prev_sp - sp):
            spawns.append({"f": frame - H, "slot": i, "ev": "-"})
        rows[frame - H] = row()
    prev_sp = sp
    prev_ctrl = ctrl
    if done_at is not None and frame >= done_at + TAIL:
        break
else:
    sys.stderr.write("budget exhausted\n")
OUT.write_text(json.dumps({"scenario": SCEN.name, "profile": PROFILE, "H": H, "frames": frame, "doneAt": None if done_at is None else done_at - H,
                           "inputs": inputs, "rows": rows, "spawns": spawns}, separators=(",", ":")))
sys.stdout.flush()
os._exit(0)
