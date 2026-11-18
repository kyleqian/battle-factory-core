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
END_FUNC_NAMES = ("HandleEndTurn_BattleWon", "HandleEndTurn_BattleLost")
# bal1: CursorCb_SendMon (the SEND OUT / SHIFT confirm) accepts the switch and starts the party menu's close fade as this task; the engine commits a real switch at that confirm.
PARTY_CLOSE_TASK_NAME = "Task_ClosePartyMenuAndSetCB2"
# parity-mac fourth pass: gBattleMainFunc is this function while the ROM collects the turn's actions (battle_main.c HandleTurnActionSelectionState) and another one
# while a turn runs. A decision the ROM took makes gBattleMainFunc leave it before the next menu; a decision the ROM REFUSED shows a menu again without leaving
# it: a move that cannot be selected (TrySetCantSelectMoveBattleScript) plays its message and re-opens the MOVE menu (stateIdAfterSelScript =
# STATE_WAIT_ACTION_CHOSEN with B_ACTION_USE_MOVE, battle_main.c:4380-4389); a switch under a trap (party_menu.c TrySwitchInPokemon) keeps the party menu open.
SELECTION_FUNC_NAME = "HandleTurnActionSelectionState"
# Frames a committed switch may keep the party menu open (the close fade is about 70 frames); longer means the ROM refused it and the menu waits for input.
PARTY_COMMIT_FRAME_CAP = 600
# A refusal probe in the party menu: A is pulsed this long (SHIFT, then the refusal message), then B backs out to the action menu.
PARTY_PROBE_A_FRAMES = 150
DECISION_KINDS = ("move", "switch", "switch-refused", "move-refused")
# parity-mac: gBattleOutcome is set inside the script that decides the battle (checkteamslost), but the turn is not over: the rest of
# that script and BattleTurnPassed's HandleFaintedMonActions / HandleWishPerishSongOnTurnEnd still run (a pending Future Sight still
# rolls accuracy, ROM seed 1181) before gBattleMainFunc becomes sEndTurnFuncsTable[outcome]. The drive goes on until then.
POST_OUTCOME_FRAME_CAP = 3000
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
    for name in (*END_FUNC_NAMES, SELECTION_FUNC_NAME, PARTY_CLOSE_TASK_NAME):  # optional: without them the drive stops at the outcome / cannot tell a refused decision, as before
        addrs = nm.get(name, [])
        if len(addrs) == 1:
            funcs[name] = addrs[0]
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
        if d.get("kind") in ("move", "move-refused") and d.get("slot") in (0, 1, 2, 3):
            continue
        if d.get("kind") in ("switch", "switch-refused") and isinstance(d.get("partyIndex"), int) and 0 <= d["partyIndex"] < 6:
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
        self.outcome_frame = None  # first frame gBattleOutcome was seen non-zero
        # parity-mac fourth pass (voluntary switches, refusal probes, legality):
        self.opened = 0  # anchors opened so far (the lab captures the wide state when this grows)
        self.pending = None  # "real" / "probe": the last decision closed at a menu the player chose at; checked when the next action menu opens
        self.left_selection = False  # gBattleMainFunc left HandleTurnActionSelectionState since that decision closed
        self.party_commit = None  # (frame, "real" | "probe") of the A that picked a party slot
        self.party_pick = None
        self.switch_open = False  # a real switch's anchor stays open from the first party A until the SEND OUT / SHIFT confirm is seen (bal1)

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
            if self.outcome_frame is None:
                self.outcome_frame = self.frame
            end_funcs = {self.funcs[n] for n in END_FUNC_NAMES if n in self.funcs}
            main = obs.get("mainFunc")
            if (main is None or not end_funcs or (main & ~1) in end_funcs
                    or self.frame - self.outcome_frame > POST_OUTCOME_FRAME_CAP):
                return None
            if self.hold:
                self.hold = False
                return []
            return self.pulse()  # the deciding turn is still running: its messages need A
        state = self.classify(obs)
        kind = state.split("-")[0]
        selection = self.funcs.get(SELECTION_FUNC_NAME)
        if selection is not None and obs.get("mainFunc") is not None and (obs["mainFunc"] & ~1) != selection:
            self.left_selection = True
        if self.block and kind != self.block:
            self.block = None
        if kind != "party":
            self.party_commit = None
        if self.switch_open:
            # bal1: the ROM's commit of a real switch is the SEND OUT / SHIFT confirm (the close task appears the frame after that A), not the first A that only
            # opens the submenu; the engine commits at the same event. A menu that closed without the task being seen closes the anchor here too.
            close_task = self.funcs.get(PARTY_CLOSE_TASK_NAME)
            if (close_task is not None and close_task in obs["partyTasks"]) or kind != "party":
                self.switch_open = False
                self.current["pickFrame"] = self.party_pick  # the first A (the pre-bal1 commit), kept for before / after scoring
                self.close_anchor(self.frame)
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
        if state in ("action", "move") and self.current is None and self.pending is not None:
            # A menu the player chooses at is back. A decision the ROM took has run a turn in between; a probe must not have.
            if selection is not None:
                if self.pending == "real" and not self.left_selection:
                    raise DriverError("the ROM refused the decision before this menu (no turn ran)", self.dump(obs, "rom-refused-decision"))
                if self.pending == "probe" and self.left_selection:
                    raise DriverError("the ROM took a decision the engine says is not allowed (a turn ran)", self.dump(obs, "rom-accepted-refused-decision"))
            self.pending = None
        voluntary = want is not None and (want["kind"] == "switch-refused" or (want["kind"] == "switch" and want.get("voluntary")))
        if state == "action":
            if want is None or not (want["kind"] in ("move", "move-refused") or voluntary):
                raise DriverError("action menu without a move decision", self.dump(obs, "unplanned-action-menu"))
            self.open_anchor(want, "menuOpenFrame")
            cursor = obs["actionCursor"]
            if cursor & 1:
                return self.press("LEFT")
            if voluntary:
                # POKEMON is the lower left entry (cursor 2).
                if not cursor & 2:
                    return self.press("DOWN")
                self.block = "action"
                return self.press("A")
            if cursor & 2:
                return self.press("UP")
            self.block = "action"
            if want.get("forced"):
                # Forced Struggle / Encore (battle_main.c:4184-4197): FIGHT commits the turn, no move menu follows.
                self.close_anchor()
            return self.press("A")
        if state == "move":
            if voluntary and self.current is None:
                # The move menu re-opened after a refused move probe and the next decision is made at the action menu: B goes back there.
                return self.press("B")
            if want is None or want["kind"] not in ("move", "move-refused"):
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
        if kind == "party" and self.block == "party":
            since, what = self.party_commit if self.party_commit else (self.frame, "real")
            if what == "probe":
                # A for a while (SHIFT, then the refusal message), then B out of the party menu; the next action menu checks that no turn ran.
                if self.frame - since < PARTY_PROBE_A_FRAMES:
                    return self.pulse()
                self.pulse_phase = (self.pulse_phase + 1) % PULSE_PERIOD
                return self.press("B") if self.pulse_phase == 0 else []
            if self.frame - since > PARTY_COMMIT_FRAME_CAP:
                raise DriverError("the ROM refused the switch (the party menu stays open)", self.dump(obs, "rom-refused-switch"))
            return self.pulse()
        if state == "party-choose":
            if want is None or want["kind"] not in ("switch", "switch-refused"):
                raise DriverError("party menu without a switch decision", self.dump(obs, "unplanned-party-menu"))
            self.open_anchor(want, "menuOpenFrame")
            slot, target = obs["slotId"], menu_slot_for_party_id(obs.get("partyOrder"), want["partyIndex"])
            if slot != target:
                return self.press("DOWN" if slot < target else "UP")
            probe = want["kind"] == "switch-refused"
            self.party_commit = (self.frame, "probe" if probe else "real")
            if probe:
                self.close_anchor()
            else:
                self.switch_open, self.party_pick = True, self.frame + 1
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
            self.opened += 1

    def close_anchor(self, commit_frame=None):
        want = self.decisions[self.index]
        self.current["commitFrame"] = self.frame + 1 if commit_frame is None else commit_frame  # default: the advance that carries the press
        self.anchors.append(self.current)
        self.current = None
        self.index += 1
        # A forced replacement is answered inside a running turn: nothing to check at the next action menu.
        if want["kind"] in ("switch-refused", "move-refused"):
            self.pending = "probe"
        elif want["kind"] == "move" or want.get("voluntary"):
            self.pending = "real"
        else:
            self.pending = None
        self.left_selection = False

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
