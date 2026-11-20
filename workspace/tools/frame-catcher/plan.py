"""Frame catcher: the engine run as anchors and presses (Plan) and the ROM driver's per-frame decisions (Driver), with no emulator
(tools/frame-catcher/README.md; romRun.py runs them on mGBA, tools/test_frame_catcher.py tests them)."""


# Kinds whose cursor value means the same on both sides (checked before each replayed press; a mismatch is logged, never fixed).
SIG_CHECKED = {"battle.action", "battle.fight", "draft.cursor", "draft.menu", "draft.yesno", "swap.menu", "swap.yesno", "swap.pick", "battle.partySub", "battle.party"}
ENGINE_SIG_TO_ROM = {("battle.party", "cancel"): "7"}  # the party menu's CANCEL is slot PARTY_SIZE + 1 (party_menu.c)
PARTY_ORDER = ["0", "1", "2", "7"]
STEER_MAX = 10  # cursor presses at most to bring the ROM's cursor to the engine's before one replayed press


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


def new_buttons(before, now):
    """The buttons that start being pressed at `now` (the game reads JOY_NEW): a chord like LEFT+DOWN after LEFT is a DOWN press."""
    b = set(before.split("+")) if before else set()
    fresh = [x for x in now.split("+") if x and x not in b] if now else []
    return "+".join(fresh) if fresh else now


class Plan:
    """The engine run as menus ("anchors") and the presses between them.

    anchor: a run of frames in which the engine waits at one menu kind. Its `effects` are the frames whose (kind, cursor) differ from the
    frame before, with the buttons held then (the press that moved the cursor or left the menu); `offset` counts from the anchor's first frame.
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
        self.anchors, self.free = [], {}  # free[k] = presses after anchor k-1 (k = 0: from frame 0)
        f = 1
        gap_start, gap_index, frees = 0, 0, []
        while f <= n:
            if kind[f] is None:
                if held[f] and held[f] != held[f - 1]:
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
