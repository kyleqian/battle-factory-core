"""aud243d: closed-loop ROM input driver for the census replay (docs/aud243d-rom-driver.md).

Drives the ROM's player controller by MENU STATE with the engine's DECISION list (soundCensusRomReplay.ts `decisions`) instead of replaying frame-timed engine
inputs. `RomDriver.step(obs)` maps one observation of ROM state to the buttons of the next frame; the lab process (soundEventProbe.py lab --drive) records the
executed run-length segments, which are then frozen as an ordinary open-loop trace. The module needs no emulator: tests feed `obs` dicts.

State detection is by controller-function address (gBattlerControllerFuncs[0], Thumb bit stripped). `HandleInputChooseAction` exists twice in the ELF (player
controller and Pokedude), so the player's copy is the one inside battle_controller_player.o's .text range of the linker map.
"""
import re, subprocess
from pathlib import Path

FUNC_NAMES = ("HandleInputChooseAction", "HandleInputChooseMove", "WaitForMonSelection", "Task_HandleChooseMonInput")
PLAYER_OBJ = "src/battle_controller_player.o"
WATCHDOG_FRAMES = 600
PULSE_PERIOD = 16  # the lab / engine idiom for message waits: A for one frame every 16 frames


def player_text_range(map_text):
    m = re.search(r"^ \.text\s+0x([0-9a-f]+)\s+0x([0-9a-f]+) %s$" % re.escape(PLAYER_OBJ), map_text, re.M)
    if not m:
        raise SystemExit(f"romDecisionDriver: no .text range for {PLAYER_OBJ} in the linker map")
    base, size = int(m.group(1), 16), int(m.group(2), 16)
    return base, base + size


def parse_nm(nm_text):
    """{name: [addresses]} from `nm` output (local symbols may repeat)."""
    out = {}
    for line in nm_text.splitlines():
        parts = line.split()
        if len(parts) == 3 and re.fullmatch(r"[0-9a-fA-F]{8}", parts[0]) and parts[1] in "tTdDbB":
            out.setdefault(parts[2], []).append(int(parts[0], 16))
    return out


def pick_funcs(nm, text_range):
    """name -> address. The player-controller copy wins when a name repeats; a name with several copies and none in range is an error."""
    lo, hi = text_range
    funcs = {}
    for name in FUNC_NAMES:
        addrs = nm.get(name, [])
        inside = [a for a in addrs if lo <= a < hi]
        if len(addrs) == 1:
            funcs[name] = addrs[0]
        elif len(inside) == 1:
            funcs[name] = inside[0]
        else:
            raise SystemExit(f"romDecisionDriver: cannot resolve {name}: {[hex(a) for a in addrs]} (player range {hex(lo)}-{hex(hi)})")
    return funcs


def resolve_funcs(ref):
    ref = Path(ref)
    for tool in ("arm-none-eabi-nm", "nm"):
        try:
            text = subprocess.run([tool, str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
            break
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    else:
        raise SystemExit("romDecisionDriver: no nm available to read the ELF")
    return pick_funcs(parse_nm(text), player_text_range((ref / "pokeemerald.map").read_text()))


def load_decisions(path_or_obj):
    """`decisions` of a soundCensusRomReplay engine JSON (or a bare list), validated."""
    import json
    raw = path_or_obj if isinstance(path_or_obj, (list, dict)) else json.loads(Path(path_or_obj).read_text())
    decisions = raw["decisions"] if isinstance(raw, dict) else raw
    for i, d in enumerate(decisions):
        if d.get("kind") == "move" and d.get("slot") in (0, 1, 2, 3):
            continue
        if d.get("kind") == "switch" and isinstance(d.get("partyIndex"), int) and 0 <= d["partyIndex"] < 6:
            continue
        raise SystemExit(f"romDecisionDriver: decision {i} is malformed: {d}")
    return decisions


def menu_slot_for_party_id(order, party_index):
    """Party-menu slot showing battle party id `party_index` (party_menu.c GetPartyIdFromBattlePartyId): `order` is gBattlePartyCurrentOrder, three bytes of two
    nibbles (high = even slot). Roar / forced switches permute it (SwitchPartyOrder, battle_main.c:4086) while gameplay stays in party-id space. No order -> identity."""
    if not order:
        return party_index
    nibbles = [n for b in order for n in (b >> 4, b & 0xF)]
    return nibbles.index(party_index) if party_index in nibbles else party_index


class DriverError(Exception):
    def __init__(self, reason, dump):
        super().__init__(reason)
        self.reason, self.dump = reason, dump


class RomDriver:
    """obs: {func, actionCursor, moveCursor, slotId, [partyOrder: gBattlePartyCurrentOrder bytes], partyTasks: [task func addresses of live tasks], outcome, sig}; `frame` = advances done so far."""

    def __init__(self, decisions, funcs, watchdog=WATCHDOG_FRAMES):
        self.decisions, self.funcs, self.watchdog = list(decisions), dict(funcs), watchdog
        self.index = 0
        self.frame = 0
        self.anchors = []  # one per consumed decision: {index, kind, menuOpenFrame, [moveMenuFrame,] commitFrame}
        self.current = None  # anchor under construction
        self.hold = False  # the previous frame pressed a button: release for one frame
        self.block = None  # menu kind whose exit must be seen before it can be entered again (the commit frame still shows the old handler)
        self.last_sig, self.last_progress = None, 0
        self.last_state = "other"
        self.trace = []  # (frame, state) transitions, for the dump
        self.pulse_phase = 0

    def classify(self, obs):
        f = obs["func"] & ~1
        if f == self.funcs["HandleInputChooseAction"]:
            return "action"
        if f == self.funcs["HandleInputChooseMove"]:
            return "move"
        if f == self.funcs["WaitForMonSelection"]:
            return "party-choose" if self.funcs["Task_HandleChooseMonInput"] in obs["partyTasks"] else "party-other"
        return "other"

    def dump(self, obs, reason):
        return {"reason": reason, "frame": self.frame, "decisionIndex": self.index, "nextDecision": self.decisions[self.index] if self.index < len(self.decisions) else None,
                "state": self.last_state, "obs": obs, "transitions": self.trace[-24:], "anchors": self.anchors[-4:]}

    def press(self, *buttons):
        self.hold = True
        return list(buttons)

    def done(self):
        return self.index >= len(self.decisions)

    def step(self, obs):
        """Buttons for the next frame, or None when the battle outcome is set. Raises DriverError on a no-progress stall or an unplanned menu."""
        if obs["outcome"]:
            return None
        state = self.classify(obs)
        kind = state.split("-")[0]
        if self.block and kind != self.block:
            self.block = None
        if state != self.last_state:
            self.trace.append((self.frame, state))
            self.last_state = state
        if obs["sig"] != self.last_sig:
            self.last_sig, self.last_progress = obs["sig"], self.frame
        elif self.frame - self.last_progress > self.watchdog:
            raise DriverError(f"no progress for {self.watchdog} frames", self.dump(obs, "watchdog"))
        if self.hold:
            self.hold = False
            return []
        want = None if self.done() else self.decisions[self.index]
        if self.block and kind == self.block and kind != "party":
            return self.pulse()
        if state == "action":
            if want is None or want["kind"] != "move":
                raise DriverError("action menu without a move decision", self.dump(obs, "unplanned-action-menu"))
            self.open_anchor(want, "menuOpenFrame")
            cursor = obs["actionCursor"]
            if cursor & 1:
                return self.press("LEFT")
            if cursor & 2:
                return self.press("UP")
            self.block = "action"
            return self.press("A")
        if state == "move":
            if want is None or want["kind"] != "move":
                raise DriverError("move menu without a move decision", self.dump(obs, "unplanned-move-menu"))
            self.open_anchor(want, "menuOpenFrame")
            self.current.setdefault("moveMenuFrame", self.frame)
            cursor, slot = obs["moveCursor"], want["slot"]
            if cursor != slot:
                if (cursor & 1) != (slot & 1):
                    return self.press("RIGHT" if slot & 1 else "LEFT")
                return self.press("DOWN" if slot & 2 else "UP")
            self.close_anchor()
            self.block = "move"
            return self.press("A")
        if state == "party-choose":
            if self.block == "party":
                return self.pulse()
            if want is None or want["kind"] != "switch":
                raise DriverError("party menu without a switch decision", self.dump(obs, "unplanned-party-menu"))
            self.open_anchor(want, "menuOpenFrame")
            slot, target = obs["slotId"], menu_slot_for_party_id(obs.get("partyOrder"), want["partyIndex"])
            if slot != target:
                return self.press("DOWN" if slot < target else "UP")
            self.close_anchor()
            self.block = "party"
            return self.press("A")
        if state == "party-other":
            return self.pulse()
        return self.pulse()

    def pulse(self):
        self.pulse_phase = (self.pulse_phase + 1) % PULSE_PERIOD
        return self.press("A") if self.pulse_phase == 0 else []

    def open_anchor(self, want, key):
        if self.current is None:
            self.current = {"index": self.index, "kind": want["kind"], key: self.frame}

    def close_anchor(self):
        self.current["commitFrame"] = self.frame + 1  # the advance that carries the press
        self.anchors.append(self.current)
        self.current = None
        self.index += 1

    def advanced(self):
        self.frame += 1


def rle(frames):
    """[(buttons list), ...] per frame -> trace segments {frames, buttons}."""
    segments = []
    for buttons in frames:
        if segments and segments[-1]["buttons"] == buttons:
            segments[-1]["frames"] += 1
        else:
            segments.append({"frames": 1, "buttons": list(buttons)})
    return segments
