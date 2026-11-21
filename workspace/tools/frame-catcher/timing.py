#!/usr/bin/env python3
"""Frame catcher, the sound timing report (tdr1, docs/tdr1-catcher-timing-report.md): how far each sound drifts from the ROM's.

  python3 tools/frame-catcher/timing.py RUNDIR [--json]      the report of a finished run (also for runs made before tdr1)
  python3 tools/frame-catcher/timing.py --fixture FILE        the report's numbers (JSON) for a small hand-made fixture (the tests)

compare.py runs `timing_report` on every run: report.md gains "Sound timing", findings.json gains "timing".

Per stretch (menu to menu), the k-th time a sound plays on our side is paired with its k-th time on the ROM: SEs, cries and music starts
(BGM, fanfares). Pans, volume ducks, stops and fades are left out, and so is SE_SELECT, the sound of a press: on the ROM those are the
driver's replays of our presses. A sound's drift is ROM minus ours, in frames from the stretch's start; its "gap" is the change in drift
from the paired sound before it (the stretch's start for the first). So one late sound counts once, not again for every sound after it.

A text box that waits for a press (`\\p`, text.c:865-900) plays SE_SELECT when it takes one. Between two sounds such a press splits the gap.
The part after the press is the game's: both sides answer a press they took. The part up to the press depends on which press it was. The
ROM driver replays our presses at our offsets (plan.py), so when the ROM took the same press of ours, the drift up to it is only where the
press landed: the driver's part, not a game fault. When the ROM took a later press of ours (its box was not ready yet) or an earlier one
(ours was not), the box was ready at another time: the game's part, measured only to the presses' spacing ("via another press"). Which
press the ROM took comes from the driver's log (`pressReplays`, rom/timeline.json); a run made before tdr1 has none, and its presses count
as the driver's ("unknown"). Battle text at the oracle save's FAST speed prints one glyph a frame with or without A held (AddTextPrinter
decrements the speed to 0, text.c:281-301, so `canABSpeedUpPrint` has nothing to skip): held presses do not move prints. Presses that make no
sound (a field script's `waitbuttonpress`, walking) are not seen: a gap across one is counted as the game's.
"""
import bisect, json, statistics, sys
from collections import Counter, defaultdict
from pathlib import Path

KINDS = {"se", "direct", "cry", "bgm", "fanfare"}
SE_SELECT = 5
WITHIN = 1   # a gap of at most this many frames is on time
OFF = 6      # a gap of at least this many frames is far off
TOP = 30


def key(ev):
    return ("se" if ev.get("kind") == "direct" else ev.get("kind"), ev.get("id"))


def is_press(k):
    return k == ("se", SE_SELECT)


def stretch_events(sounds, a, b, skip=frozenset()):
    """(frame from the stretch start, key) of the compared sounds in [a, b), in order; the same sound twice on one frame once."""
    out, seen = [], set()
    for i, (f, ev) in enumerate(sounds):
        if not (a <= f < b) or i in skip or ev.get("kind") not in KINDS:
            continue
        k = key(ev)
        if (f, k, ev.get("pan")) in seen:
            continue
        seen.add((f, k, ev.get("pan")))
        out.append((f - a, k))
    return out


def chain(E, R):
    """Our events with the ROM's partner (k-th of the same key), in our order; a press first among events of one frame."""
    occ = defaultdict(list)
    for t, k in R:
        occ[k].append(t)
    n, out = Counter(), []
    for t, k in E:
        i = n[k]
        n[k] += 1
        if i < len(occ[k]):
            out.append((t, occ[k][i], k))
    out.sort(key=lambda x: (x[0], 0 if is_press(x[2]) else 1))
    return out


def press_onsets(buttons):
    """Frames on which a button starts being pressed, from a timeline's run-length [frame, "A+B"] rows."""
    out, held = [], set()
    for f, b in buttons:
        now = set(b.split("+")) if b else set()
        if now - held:
            out.append(f)
        held = now
    return out


class PressIdentity:
    """Which press of ours the ROM's press at a frame replays (the driver's `pressReplays` log)."""

    def __init__(self, eng_onsets, replays):
        self.onsets = sorted(eng_onsets)
        self.replays = sorted((r[0], r[1]) for r in replays) if replays is not None else None
        self.rom_frames = [r[0] for r in self.replays] if self.replays is not None else []

    def of(self, e_abs, r_abs):
        """'same' / 'other' / 'steer' / 'rescue' / 'unknown' for the press our side took at e_abs and the ROM at r_abs. The press SE plays
        on the press's first frame, or the frame before when compare.py counts it for the stretch before (attribute_press_sounds)."""
        if self.replays is None:
            return "unknown"
        j = bisect.bisect_right(self.rom_frames, r_abs + 1) - 1
        if j < 0 or r_abs + 1 - self.rom_frames[j] > 6:
            return "unknown"
        src = self.replays[j][1]
        if src in ("steer", "rescue"):
            return src
        i = bisect.bisect_right(self.onsets, e_abs + 1) - 1
        if i < 0:
            return "unknown"
        return "same" if self.onsets[i] == src else "other"


def gaps(stretches, eng_sounds, rom_sounds, identity, rom_skip=frozenset(), name=None):
    """Every sound-to-sound gap of the compared stretches, split into the game's and the driver's part."""
    name = name or (lambda k: f"{k[0]} {k[1]}")
    out = []
    for st in stretches:
        if st.get("class") == "skipped":
            continue
        e0, e1 = st["engine"]
        r0, r1 = st["rom"]
        E, R = stretch_events(eng_sounds, e0, e1), stretch_events(rom_sounds, r0, r1, rom_skip)
        start = f"menu {st.get('startsAt') or st.get('surface') or '?'}"
        prev_name, pe, pr = start, 0, 0
        game = driver = 0
        via_other, presses = False, []
        for te, tr, k in chain(E, R):
            seg = (tr - pr) - (te - pe)
            pe, pr = te, tr
            if is_press(k):
                ident = identity.of(e0 + te, r0 + tr)
                presses.append(ident)
                if ident == "other":
                    game += seg
                    via_other = True
                else:
                    driver += seg
                continue
            game += seg
            out.append({"stretch": st["index"], "where": st.get("where"), "prev": prev_name, "sound": name(k), "engine": e0 + te,
                        "rom": r0 + tr, "jump": game + driver, "game": game, "driver": driver, "viaOther": via_other, "presses": presses})
            prev_name, game, driver, via_other, presses = name(k), 0, 0, False, []
    return out


def share(n, d):
    return round(100 * n / d, 1) if d else 0.0


def grouped(gs, part, top):
    by = defaultdict(list)
    seen = Counter(f"{g['prev']} -> {g['sound']}" for g in gs)
    for g in gs:
        if abs(g[part]) > WITHIN:
            by[f"{g['prev']} -> {g['sound']}"].append(g)
    rows = []
    for k, lst in by.items():
        vals = [g[part] for g in lst]
        first = lst[0]
        rows.append({"gap": k, "times": len(lst), "seen": seen[k], "frames": sum(abs(v) for v in vals), "median": statistics.median(vals),
                     "viaOther": sum(1 for g in lst if g["viaOther"]) if part == "game" else None,
                     "first": {"stretch": first["stretch"], "where": first["where"], "engine": first["engine"], "rom": first["rom"], part: first[part]}})
    rows.sort(key=lambda r: (-r["frames"], r["gap"]))
    return rows if top is None else rows[:top]


def timing_report(stretches, eng_sounds, rom_sounds, eng_buttons, rom_replays, rom_skip=frozenset(), name=None, battles=None, top=TOP):
    identity = PressIdentity(press_onsets(eng_buttons), rom_replays)
    gs = gaps(stretches, eng_sounds, rom_sounds, identity, rom_skip, name)
    n = len(gs)
    press_kinds = Counter(p for g in gs for p in g["presses"])
    game_off = [g for g in gs if abs(g["game"]) > WITHIN]
    driver_off = [g for g in gs if abs(g["driver"]) > WITHIN]
    return {
        "gaps": n, "battles": battles,
        "all": {"within1": sum(1 for g in gs if abs(g["jump"]) <= WITHIN), "off6": sum(1 for g in gs if abs(g["jump"]) >= OFF)},
        "game": {"within1": n - len(game_off), "off6": sum(1 for g in gs if abs(g["game"]) >= OFF), "frames": sum(abs(g["game"]) for g in game_off)},
        "driver": {"gaps": len(driver_off), "frames": sum(abs(g["driver"]) for g in driver_off)},
        "presses": dict(sorted(press_kinds.items())), "pressLog": rom_replays is not None,
        "seen": dict(sorted(Counter(f"{g['prev']} -> {g['sound']}" for g in gs).items())),
        "ranked": grouped(gs, "game", None), "driverRanked": grouped(gs, "driver", None),
        "topGame": [r["gap"] for r in grouped(gs, "game", top)],
    }


def headline(t):
    n = t["gaps"]
    return (f"sound timing: {share(t['all']['within1'], n)}% of {n} gaps within 1 frame, {share(t['all']['off6'], n)}% off by 6+; "
            f"game alone {share(t['game']['within1'], n)}% / {share(t['game']['off6'], n)}%, {t['game']['frames']} frames off")


def report_lines(t, top=TOP):
    n, b = t["gaps"], t.get("battles")
    per = f" ({round(t['game']['frames'] * 7 / b)} per 7 battles)" if b else ""
    p = t["presses"]
    L = ["## Sound timing", "",
         "Each sound is paired with the ROM's same sound in the same stretch (the k-th of each; SEs, cries, music starts; not pans, ducks, "
         "stops or the presses' SE_SELECT). A gap is the change in drift (ROM minus ours) from the paired sound before it, so one late sound "
         "counts once. A text box's press between two sounds splits the gap: up to the press it is the driver's part when the ROM took the "
         "same press of ours (it replays our presses at our times), the game's when it took another one (its box was ready earlier or later "
         "than ours; measured only to the presses' spacing). After the press it is the game's. tools/frame-catcher/timing.py.", "",
         f"- {n} sound-to-sound gaps{f' in {b} battles' if b else ''}: **{share(t['all']['within1'], n)}% within 1 frame, "
         f"{share(t['all']['off6'], n)}% off by 6 or more**.",
         f"- The game's part alone: {share(t['game']['within1'], n)}% within 1 frame, {share(t['game']['off6'], n)}% off by 6 or more; "
         f"{t['game']['frames']} frames off in the gaps off by 2 or more{per}.",
         f"- The driver's part: {t['driver']['frames']} frames in {t['driver']['gaps']} gaps.",
         f"- Text box presses: the ROM took the same press of ours {p.get('same', 0)} times, another press {p.get('other', 0)}, a steer "
         f"{p.get('steer', 0)}, a rescue {p.get('rescue', 0)}, unknown {p.get('unknown', 0)}"
         + ("" if t["pressLog"] else " (this run has no press log: made before tdr1)") + ".", "",
         f"### Largest game gaps (frames off summed over the run, gaps off by 2 or more)", "",
         "| previous sound -> sound | times off / seen | frames | median (ROM - ours) | via another press | first (stretch, where, ours / ROM frame) |",
         "|---|---|---|---|---|---|"]
    for r in t["ranked"][:top]:
        f = r["first"]
        L.append(f"| {r['gap']} | {r['times']} / {r['seen']} | {r['frames']} | {r['median']:+g} | {r['viaOther']} | "
                 f"{f['stretch']}, {f['where']}, {f['engine']} / {f['rom']} |")
    L += ["", "### Largest driver gaps (where the replayed presses landed)", "",
          "| previous sound -> sound | times off / seen | frames | median (ROM - ours) | first (stretch, where, ours / ROM frame) |", "|---|---|---|---|---|"]
    for r in t["driverRanked"][:10]:
        f = r["first"]
        L.append(f"| {r['gap']} | {r['times']} / {r['seen']} | {r['frames']} | {r['median']:+g} | {f['stretch']}, {f['where']}, {f['engine']} / {f['rom']} |")
    return L + [""]


def battles_in(eng_tl, last_frame):
    return sum(1 for f, s in eng_tl.get("surfaces", []) if s == "battleStartIntro" and f < last_frame)


def from_run(run):
    """The report of a finished run: its findings.json stretches and the two timelines, the sounds prepared as compare.py does."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import compare as c  # numpy / PIL, as for the compare itself
    run = Path(run)
    f = json.loads((run / "findings.json").read_text())
    eng = json.loads((run / "engine/timeline.json").read_text())
    rom = json.loads((run / "rom/timeline.json").read_text())
    be = {s["engine"][0] for s in f["list"]}
    br = {s["rom"][0] for s in f["list"]}
    eng_sounds = c.attribute_press_sounds(c.drop_silent_cry_stops(c.drop_unchanged_volume(eng["sounds"])), c.press_frames(eng["buttons"]), be)
    rom_list = c.drop_silent_cry_stops(c.drop_unchanged_volume(rom["sounds"]))
    rom_sounds = c.attribute_press_sounds(rom_list, c.press_frames(rom["buttons"]), br)
    steered = frozenset(c.steer_sounds(rom_list, rom.get("steerFrames", [])))
    names = c.songs()
    last = max((s["engine"][1] for s in f["list"]), default=0)
    return timing_report(f["list"], eng_sounds, rom_sounds, eng["buttons"], rom.get("pressReplays"), steered,
                         lambda k: sound_name(names, k), battles_in(eng, last))


def sound_name(names, k):
    kind, sid = k
    if kind == "cry":
        return f"cry {names.get(('species.h', sid), sid)}"
    return str(names.get(("songs.h", sid), f"{kind} {sid}"))


def main():
    args = sys.argv[1:]
    if args and args[0] == "--fixture":
        fx = json.loads(Path(args[1]).read_text())
        t = timing_report(fx["stretches"], fx["engine"]["sounds"], fx["rom"]["sounds"], fx["engine"]["buttons"], fx["rom"].get("pressReplays"),
                          frozenset(fx["rom"].get("skip", [])), None, fx.get("battles"), top=TOP)
        print(json.dumps(t, indent=1))
        return
    t = from_run(args[0])
    if "--json" in args:
        print(json.dumps(t, indent=1))
    else:
        print("\n".join(report_lines(t)))
        print(headline(t))


if __name__ == "__main__":
    main()
