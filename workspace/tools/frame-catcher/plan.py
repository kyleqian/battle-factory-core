"""Frame catcher: the engine run as anchors and presses (Plan) and the ROM driver's per-frame decisions (Driver), with no emulator
(tools/frame-catcher/README.md; romRun.py runs them on mGBA, tools/test_frame_catcher.py tests them)."""


# Kinds whose cursor value means the same on both sides (checked before each replayed press; a mismatch is logged, never fixed).
SIG_CHECKED = {"battle.action", "battle.fight", "draft.cursor", "draft.menu", "draft.yesno", "swap.menu", "swap.yesno", "swap.pick", "battle.partySub", "battle.party"}
ENGINE_SIG_TO_ROM = {("battle.party", "cancel"): "7"}  # the party menu's CANCEL is slot PARTY_SIZE + 1 (party_menu.c)
PARTY_ORDER = ["0", "1", "2", "7"]
STEER_MAX = 10  # cursor presses at most to bring the ROM's cursor to the engine's before one replayed press
MENU_PRESS_SES = {5, 32}  # SE_SELECT, SE_FAILURE (include/constants/songs.h)


def rom_sig(kind, engine_sig):
    return ENGINE_SIG_TO_ROM.get((kind, engine_sig), engine_sig)


def steer_button(kind, cur, target):
    """The direction that moves the ROM's cursor of menu `kind` from `cur` toward `target`, or None when there is no model for it."""
    try:
        c, t = int(cur), int(target)
    except (TypeError, ValueError):
        return None
    if kind in ("battle.action", "battle.fight"):  # 2x2: bit 0 the column, bit 1 the row
        if (c & 1) != (t & 1):
            return "RIGHT" if t & 1 else "LEFT"
        return ("DOWN" if t & 2 else "UP") if (c & 2) != (t & 2) else None
    if kind == "draft.cursor":  # six balls in a ring
        return None if c == t else ("RIGHT" if (t - c) % 6 <= 3 else "LEFT")
    if kind == "battle.party":
        if str(c) not in PARTY_ORDER or str(t) not in PARTY_ORDER:
            return None
        ci, ti = PARTY_ORDER.index(str(c)), PARTY_ORDER.index(str(t))
        return None if ci == ti else ("DOWN" if ti > ci else "UP")
    if kind in ("draft.menu", "draft.yesno", "field.multichoice", "field.yesno", "swap.menu", "swap.yesno", "battle.partySub"):
        return None if c == t else ("DOWN" if t > c else "UP")
    return None


def lcg(x):
    return (x * 0x41C64E6D + 0x6073) & 0xFFFFFFFF


def lcg_back(x):
    return ((x - 0x6073) * 0xEEB9EB65) & 0xFFFFFFFF  # 0xEEB9EB65 = inverse of 0x41C64E6D mod 2^32


def m4a_restarted(pre, post, players, info_size=0x40, track_size=0x50):
    """True when a song was started again on this frame though the m4a RAM looks unchanged: a sound restarted on every frame
    (AnimTask_Rollout_Step's PlaySE12WithPanning(SE_M_HEADBUTT) on 10 frames in a row, battle_anim_rock.c:638-651) ends each frame in
    the same just-started state, which the hybrid stepping's signature cannot tell from a frame without sound calls, so the ROM side
    logged one SE_M_HEADBUTT where the ROM plays ten. A live track of an unpaused player always moves something in a frame (the clock
    and the track's wait / cmdPtr on a tick, tempoC between ticks); a player whose clock, tempo counters and tracks did not change at
    all while a track still EXISTs was restarted. `pre` / `post`: (address, length) -> bytes readers of the frame's start and end
    (soundEventProbe.py restarted_every_frame is the same test)."""
    for addr in players:
        info0, info1 = pre(addr, info_size), post(addr, info_size)
        # clock (0x0C), tempoD / tempoU / tempoI / tempoC (0x1C-0x23); MUSICPLAYER_STATUS_PAUSE in status (0x04)
        if info0[0xC:0x10] != info1[0xC:0x10] or info0[0x1C:0x24] != info1[0x1C:0x24] or int.from_bytes(info1[4:8], "little") & 0x80000000:
            continue
        tracks = int.from_bytes(info1[0x2C:0x30], "little")
        if not 0x3000000 <= tracks < 0x3008000 - track_size * 16:
            continue
        n = min(info1[8], 16) * track_size
        t0, t1 = pre(tracks, n), post(tracks, n)
        if t0 == t1 and any(t1[i] & 0x80 for i in range(0, n, track_size)):  # MPT_FLG_EXIST
            return True
    return False


def new_buttons(before, now):
    """The buttons that start being pressed at `now` (the game reads JOY_NEW): a chord like LEFT+DOWN after LEFT is a DOWN press."""
    b = set(before.split("+")) if before else set()
    fresh = [x for x in now.split("+") if x and x not in b] if now else []
    return "+".join(fresh) if fresh else now


class Plan:
    """The engine run as menus ("anchors") and the presses between them.

    anchor: a run of frames in which the engine waits at one menu kind. Its `effects` are the frames whose (kind, cursor) differ from the
    frame before, with the buttons held then (the press that moved the cursor or left the menu); `offset` counts from the anchor's first frame.
    An effect with `still` is a press that changed nothing but played a sound on its frame (B in the forced party menu: SE_FAILURE,
    party_menu.c:1382-1384): the ROM gets it once, with no effect to wait for.
    free presses: the press starts outside every menu, with `offset` counted from the end of the anchor before them (or from frame 0)."""

    def __init__(self, eng):
        n = eng["frames"]
        kind, sig, held = [None] * (n + 2), [None] * (n + 2), [""] * (n + 2)
        changes = eng["menus"]
        for j, (f, k, g) in enumerate(changes):
            end = changes[j + 1][0] if j + 1 < len(changes) else n + 1
            for x in range(f, min(end, n + 1)):
                kind[x], sig[x] = k, g
        bch = eng["buttons"]
        for j, (f, b) in enumerate(bch):
            end = bch[j + 1][0] if j + 1 < len(bch) else n + 1
            for x in range(f, min(end, n + 1)):
                held[x] = b
        self.n = n
        # menu sounds of a press (SE_SELECT, SE_FAILURE): another sound that happens to start on a press frame is no reason to press
        sound_frames = {f for f, ev in eng.get("sounds", []) if ev.get("kind") in ("se", "direct") and ev.get("id") in MENU_PRESS_SES}
        self.anchors, self.free = [], {}  # free[k] = presses after anchor k-1 (k = 0: from frame 0)
        # from frame 0, the mount's picture: a draft cursor there whose A is on frame 1 (the test player can press at once) is the
        # round's first anchor; started at frame 1, the plan dropped it, the ROM never rented that Pokemon and stopped in the draft
        # (seed 15, Scene OFF: "anchors-skipped draft.menu", then stuck at the third rental)
        f = 0
        gap_start, gap_index, frees = 0, 0, []
        while f <= n:
            if kind[f] is None:
                if held[f] and (f == 0 or held[f] != held[f - 1]):
                    length = 1
                    while f + length <= n and held[f + length] == held[f]:
                        length += 1
                    frees.append({"offset": f - gap_start, "buttons": new_buttons(held[f - 1], held[f]), "frames": min(length, 30), "engineFrame": f})
                f += 1
                continue
            self.free[gap_index] = frees
            start, k = f, kind[f]
            effects = []
            while f <= n and kind[f] == k:
                f += 1
            end = f - 1
            for x in range(start + 1, min(end + 2, n + 1)):
                if (kind[x], sig[x]) != (kind[x - 1], sig[x - 1]):
                    b = held[x]
                    back = x
                    while not b and back > start and x - back < 4:
                        back -= 1
                        b = held[back]
                    # the onset of that press: the first frame of the run of `b` that ends at or after back
                    onset = back
                    while onset > start and held[onset - 1] == b:
                        onset -= 1
                    effects.append({"offset": onset - start, "engineFrame": x, "buttons": new_buttons(held[onset - 1], b), "from": sig[x - 1], "to": [kind[x], sig[x]], "leaves": kind[x] != k})
                elif x <= end and x in sound_frames and set(held[x].split("+")) - set(held[x - 1].split("+")) - {""}:
                    effects.append({"offset": x - start, "engineFrame": x, "buttons": new_buttons(held[x - 1], held[x]), "from": sig[x], "to": [kind[x], sig[x]], "leaves": False, "still": True})
            # a press whose effect shows a frame or more after its sound is that effect, not a sound-only press as well
            onsets = {e["offset"] for e in effects if not e.get("still")}
            effects = sorted((e for e in effects if not (e.get("still") and e["offset"] in onsets)), key=lambda e: e["offset"])
            self.anchors.append({"kind": k, "start": start, "end": end, "sig": sig[start], "effects": effects})
            gap_index = len(self.anchors)
            gap_start, frees = end + 1, []
        self.free[gap_index] = frees
        self.tail = n - (self.anchors[-1]["end"] if self.anchors else 0)


class Driver:
    TAP = 3          # frames a replayed menu press is held
    RETRY = 8        # frames to wait for a replayed menu press to show its effect before pressing again
    RETRIES = 6
    RESCUE_AFTER = 240  # frames past the engine's own gap length before an unplanned A at a ROM text wait

    def __init__(self, plan, note):
        self.p, self.note = plan, note
        self.ai = 0                 # next engine anchor to bind
        self.bound = None           # {anchor, start, next effect index, pressed frame, tries}
        self.gap_start = 0          # ROM frame the current gap started (end of the last ROM menu)
        self.gap_index = 0
        self.free_i = 0
        self.hold = []              # (buttons, frames left)
        self.prev_menu = None
        self.binds = []
        self.stop_reason = None
        self.just_answered = None
        self.rescues = 0
        self.last_press = 0
        self.done_frame = None
        self._unplanned = None
        self.steer_frames = []
        self.hold_free = False

    def press(self, buttons, frames, f, free=False):
        self.hold = [buttons.split("+") if buttons else [], frames]
        self.hold_free = free
        self.last_press = f

    def step(self, f, menu, rom):
        kind = None if menu is None else menu[0]
        prev_kind = None if self.prev_menu is None else self.prev_menu[0]
        if kind != prev_kind:
            if self.bound is not None:
                left = self.bound["anchor"]["effects"][self.bound["i"]:]
                if left and not (len(left) == 1 and left[0]["leaves"] and self.bound.get("pressed") is not None):
                    self.note("anchor-left-early", anchor=self.bound["index"], kind=self.bound["anchor"]["kind"], unplayed=len(left))
                self.bound = None
                self.gap_start, self.gap_index, self.free_i = f, self.ai, 0
            if kind is not None:
                # a press still held from between the menus must not reach the menu that just opened (the ROM got here sooner)
                if self.hold and self.hold_free:
                    self.hold = [[], 1]  # release now, one empty frame
                self.bind(f, kind, menu[1])
        self.prev_menu = menu
        if self.hold and self.hold[1] > 0:
            self.hold[1] -= 1
            return self.hold[0]
        if self.hold:
            self.hold = []
            return []  # one released frame between presses
        if self.ai >= len(self.p.anchors) and self.bound is None:
            if self.done_frame is None:
                self.done_frame = f
            if f - self.done_frame >= self.p.tail:
                self.stop_reason = "engine-trace-end"
                return None
        if kind is not None and self.bound is not None:
            return self.menu_step(f, menu, rom)
        if kind is not None:
            # an unplanned ROM menu waits (logged at bind); the rescue below never presses at a menu
            if f - self.last_press > 1500 and f - self.unplanned_since(f) > 1500:
                self.stop_reason = "stuck-at-unplanned-menu"
                return None
            return []
        return self.free_step(f)

    def unplanned_since(self, f):
        if self._unplanned is None:
            self._unplanned = f
        return self._unplanned

    def bind(self, f, kind, sig):
        self._unplanned = None
        for j in range(self.ai, min(self.ai + 4, len(self.p.anchors))):
            if self.p.anchors[j]["kind"] == kind:
                if j > self.ai:
                    self.note("anchors-skipped", skipped=[a["kind"] for a in self.p.anchors[self.ai:j]], engineStart=self.p.anchors[self.ai]["start"])
                a = self.p.anchors[j]
                self.bound = {"anchor": a, "index": j, "start": f, "i": 0, "pressed": None, "tries": 0}
                self.binds.append([j, f, a["start"]])
                self.ai = j + 1
                return
        self.note("unplanned-rom-menu", kind=kind, sig=sig, nextEngine=None if self.ai >= len(self.p.anchors) else [self.p.anchors[self.ai]["kind"], self.p.anchors[self.ai]["start"]])

    def menu_step(self, f, menu, rom):
        b = self.bound
        a = b["anchor"]
        if b["i"] >= len(a["effects"]):
            if b["index"] == len(self.p.anchors) - 1 and f - b["start"] >= self.p.n - a["start"]:
                self.stop_reason = "engine-trace-end"  # the trace ends at this menu
                return None
            if f - max(b["start"], self.last_press) > 900:
                self.note("stuck-at-menu", anchor=b["index"], kind=a["kind"])
                self.stop_reason = "stuck-at-menu"
                return None
            return []
        e = a["effects"][b["i"]]
        if b["pressed"] is not None:
            # did the last press show its effect?
            if (menu[0], menu[1]) != (a["kind"], b["sigBefore"]):
                if a["kind"] in SIG_CHECKED and menu[0] == a["kind"] and e["to"][0] == a["kind"] and menu[1] != rom_sig(a["kind"], e["to"][1]):
                    self.note("cursor-differs-after-press", anchor=b["index"], kind=a["kind"], rom=menu[1], engine=e["to"][1])
                b["i"] += 1
                b["pressed"], b["tries"] = None, 0
                return []
            if f - b["pressed"] < self.RETRY:
                return []
            if b["tries"] >= self.RETRIES:
                self.note("press-without-effect", anchor=b["index"], kind=a["kind"], buttons=e["buttons"], engineFrame=e["engineFrame"])
                b["i"] += 1
                b["pressed"], b["tries"] = None, 0
                return []
        elif f - b["start"] < e["offset"]:
            return []
        want_sig = rom_sig(a["kind"], e["from"])
        if a["kind"] in SIG_CHECKED and b["tries"] == 0 and menu[1] != want_sig:
            # the ROM's cursor is elsewhere (a press the ROM took differently): move it to the engine's entry first, one press at a time
            if b.get("steerFor") != b["i"]:
                b["steerFor"], b["steers"] = b["i"], 0
                self.note("cursor-differs-before-press", anchor=b["index"], kind=a["kind"], rom=menu[1], engine=e["from"], engineFrame=e["engineFrame"])
            d = steer_button(a["kind"], menu[1], want_sig)
            if d is not None and b["steers"] < STEER_MAX:
                if f - self.last_press < 6:
                    return []
                b["steers"] += 1
                self.steer_frames.append(f)
                self.press(d, self.TAP, f)
                return self.hold[0]
            if d is not None:
                self.note("steer-failed", anchor=b["index"], kind=a["kind"], rom=menu[1], engine=e["from"])
        if e.get("still") or (not e["leaves"] and menu[1] == "?"):
            # a press that only plays a sound on the engine, or one whose effect the ROM side cannot read (the summary's move-select
            # cursor: the ROM sig is "?", so opening move select looked like nothing and was pressed six times): made once
            b["i"] += 1
            b["pressed"], b["tries"] = None, 0
            self.press(e["buttons"], self.TAP, f)
            return self.hold[0]
        b["sigBefore"] = menu[1]
        b["pressed"] = f
        b["tries"] += 1
        if e["leaves"] and a["kind"] == "field.multichoice" and b["tries"] == 1:
            self.just_answered = "field.multichoice"
        self.press(e["buttons"], self.TAP, f)
        return self.hold[0]

    def free_step(self, f):
        frees = self.p.free.get(self.gap_index, [])
        while self.free_i < len(frees) and frees[self.free_i]["offset"] < f - self.gap_start - 60:
            self.free_i += 1  # too late for this one (the ROM was slower to get here): drop it
        if self.free_i < len(frees) and f - self.gap_start >= frees[self.free_i]["offset"]:
            e = frees[self.free_i]
            self.free_i += 1
            self.press(e["buttons"], max(1, e["frames"] - 1), f, free=True)
            return self.hold[0]
        # rescue: the ROM waits somewhere the engine's presses did not reach (a text that waits for A)
        next_start = self.p.anchors[self.ai]["start"] if self.ai < len(self.p.anchors) else self.p.n
        prev_end = self.p.anchors[self.ai - 1]["end"] if self.ai > 0 else 0
        engine_gap = next_start - prev_end
        if self.ai < len(self.p.anchors) and f - self.gap_start > engine_gap + self.RESCUE_AFTER and f - self.last_press > 60:
            self.rescues += 1
            self.note("rescue-a", gapIndex=self.gap_index, romFramesInGap=f - self.gap_start, engineGap=engine_gap)
            self.press("A", 2, f)
            return self.hold[0]
        return []


# ---- round 2 and later (fcr2, docs/fcr2-catcher-round2.md) ----

STAGES = 7  # FRONTIER_STAGES_PER_CHALLENGE


class RoundCounter:
    """The ROM's round, from curChallengeBattleNum alone: it counts 0..6 through a round, is 7 in the Lobby after a won round, and
    InitFactoryChallenge (factory_init, at the save before the next challenge) sets it back to 0. A battle is keyed g = round * 7 + battle
    number on both sides (engineRun.mjs `g`).

    The number read can blip for a frame or a few (seed 23 Scene OFF, round 1: 4, then lower at ROM frame 46444 while battle 5 was being
    set up, then 4 again), so a round steps only when it reads 0 below a higher number and stays 0 for `settle` frames (a real factory_init
    is followed by the save dialog, the walk and the briefing: hundreds of frames). Until then the old round and number are kept. A blip is
    kept in `blips` (frame index, the number before, the value read)."""

    def __init__(self, settle=30):
        self.round, self.last, self.settle = 0, None, settle
        self.pending = 0
        self.blips = []
        self.n = 0

    def update(self, bn):
        """Feed this frame's battle number; True on the frame a new round starts. `self.last` is the number in force."""
        self.n += 1
        if self.last is None:
            self.last = bn
            return False
        if bn >= self.last:
            if self.pending:
                self.blips.append((self.n - self.pending, self.last, 0))
                self.pending = 0
            self.last = bn
            return False
        if bn != 0:
            self.blips.append((self.n, self.last, bn))
            return False
        self.pending += 1
        if self.pending < self.settle:
            return False
        self.pending = 0
        self.round += 1
        self.last = 0
        return True

    def g(self, bn=None):
        """The key of the battle in force (the number fed last, unless it is a blip or a 0 not yet settled)."""
        return self.round * STAGES + self.last


def go_on_roll(bn):
    """A field.multichoice answer that starts a later battle's trainer roll (the GO ON menu): battles 2 to 7 of a round. The Lobby's
    multichoices after a won round (record your last match?, CHALLENGE / INFO / EXIT, the level) run with the battle number still 7."""
    return 0 < bn < STAGES


def deal_traps_wanted(deal, ids_now, frame, rearm_frames=5):
    """Which deal traps a frame is stepped again with, after its fast run (romRun.deal_traps): both ("rentals", "opponent") when the fast
    run changed rentalMons' set ids (factory_generaterentalmons ran in it), the opponent's alone in the next `rearm_frames` frames when the
    rental trap fired but the opponent roll fell past a frame boundary, else none. `deal`: {"rentals": None | {"frame"}, "opponent": None |
    {...}, "idsBefore": [...], "want": {"dealRngBefore"}}; a deal whose opponent trap fired (or was given up) wants nothing."""
    if deal is None or deal.get("opponent") is not None:
        return ()
    if deal.get("rentals") is None:
        if ids_now == deal.get("idsBefore") or deal.get("want", {}).get("dealRngBefore") is None:
            return ()
        return ("rentals", "opponent")
    if frame - deal["rentals"]["frame"] > rearm_frames:
        return ("give-up",)
    return ("opponent",)


def deal_opponent_check(rom_trainer, rom_sets, first):
    """The ROM's first opponent of a new round against the engine's battle record (`first`: trainerId, opponentSetIds): (same, rom, engine)."""
    engine = [first["trainerId"], list(first["opponentSetIds"])]
    rom = [rom_trainer, list(rom_sets)]
    return rom == engine, rom, engine


def brain_trap_wanted(brain, enemy_now, frame):
    """The Factory Head's party trap (romRun.brain_traps): armed on the first frame whose fast run changed gEnemyParty's first record
    (FillFactoryTrainerParty zeroes it, then FillFactoryBrainParty builds the three), kept armed until it fires. Returns (arm now?, armed?).
    `brain`: {"armedAt": None | frame, "fired": None | {...}, "enemyBefore": bytes}."""
    if brain is None or brain.get("fired") is not None:
        return False, False
    if brain.get("armedAt") is None:
        if enemy_now == brain.get("enemyBefore"):
            return False, False
        return True, True
    return False, True
