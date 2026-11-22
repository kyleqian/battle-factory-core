#!/usr/bin/env python3
"""Frame catcher, the compare (tools/frame-catcher/README.md): engine run vs ROM run, stretch by stretch.

  python3 tools/frame-catcher/compare.py RUNDIR [--title NAME] [--keep-stores]

RUNDIR holds engine/ (engineRun.mjs) and rom/ (romRun.py). A stretch runs from one menu where both sides wait for the player to the next
(the ROM driver's anchor binds). Each stretch is classed

  identical  the same pictures for the same number of frames, and the same sounds on the same frames;
  timing     every picture and sound of one side is also in the other side's stretch, only shown earlier, later or for longer;
  content    one side shows a picture (or plays a sound) the other never shows in that stretch.

"Shows" is judged pixel by pixel: a picture counts as shown by the other side when every one of its pixels has the same colour at the same
place in some frame of the other side near the same point of the stretch (MARGIN frames past the stretch ends included). So text printed
faster on one side under the same animation is timing; a wrong Pokemon, a missing fade or a sprite one tile off is content. The pixels
that are never shown on the other side are cut into blobs (8x8 tiles, touching tiles joined) and followed over frames as "episodes";
episodes of the same side and place are grouped across stretches into one difference. Sounds: per stretch the two event lists (kind, id)
are aligned in order; one side's event with no partner is content, a partner on another frame is timing.

Writes RUNDIR/report.md, RUNDIR/findings.json and RUNDIR/images/ (ROM | ours | diff of the worst frame of each difference: yellow = pixels
that differ from the nearest frame of the other side, red = pixels the other side never shows there). Without --keep-stores the frame
stores (engine/frames.bin, rom/frames.bin) are deleted at the end: only the differing frames stay on disk.
"""
import difflib, json, math, mmap, sys, zlib
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import timing  # the sound timing report (tdr1), this directory

W, H, TILE = 240, 160, 8
WINDOW_MIN = 150         # frames either side of the mapped point searched for a matching pixel
WINDOW_FRACTION = 0.12
WINDOW_PICTURES = 240    # distinct pictures at most per coverage window (evenly thinned)
MARGIN = 60              # frames past a stretch's ends the other side's pictures still count (menus open a few frames apart)
EPISODE_GAP = 6          # frames without the blob that still continue an episode
MINOR_PIXELS = 8         # differences never larger than this are listed as minor


class Side:
    def __init__(self, d):
        d = Path(d)
        self.dir = d
        self.idx = json.loads((d / "frames.idx.json").read_text())
        self.per = np.fromfile(d / "perframe.u32", dtype="<u4")
        self.fd = open(d / "frames.bin", "rb")
        self.mm = mmap.mmap(self.fd.fileno(), 0, access=mmap.ACCESS_READ)
        self.tl = json.loads((d / "timeline.json").read_text())
        self.hash = [h for h, _, _ in self.idx]
        self.cache = {}

    def rgb(self, pid):
        _, off, n = self.idx[pid]
        return np.frombuffer(zlib.decompress(self.mm[off:off + n]), dtype=np.uint8).reshape(H, W, 3)

    def packed(self, pid):
        p = self.cache.get(pid)
        if p is None:
            a = self.rgb(pid).astype(np.uint32)
            p = (a[:, :, 0] << 16) | (a[:, :, 1] << 8) | a[:, :, 2]
            if len(self.cache) > 6000:
                self.cache.clear()
            self.cache[pid] = p
        return p

    def close(self):
        self.mm.close()
        self.fd.close()


def runs(seq):
    out = []
    for x in seq:
        if out and out[-1][0] == x:
            out[-1][1] += 1
        else:
            out.append([x, 1])
    return out


def window_ids(per, start, end, center, half):
    lo, hi = max(start, center - half), min(end, len(per), center + half + 1)
    ids = list(dict.fromkeys(int(x) for x in per[lo:hi]))
    if len(ids) > WINDOW_PICTURES:
        step = len(ids) / WINDOW_PICTURES
        ids = [ids[int(i * step)] for i in range(WINDOW_PICTURES)]
    return ids


def uncovered(pic, others_packed):
    """Pixels of `pic` whose colour no picture of `others` has at that place."""
    if not others_packed:
        return np.ones(pic.shape, dtype=bool)
    out = np.ones(pic.shape, dtype=bool)
    for k in range(0, len(others_packed), 64):
        stack = np.stack(others_packed[k:k + 64])
        out &= ~np.any(stack == pic[None, :, :], axis=0)
        if not out.any():
            break
    return out


def nearest(pic, other_side, ids):
    best, best_n = None, None
    for pid in ids:
        n = int(np.count_nonzero(other_side.packed(pid) != pic))
        if best_n is None or n < best_n:
            best, best_n = pid, n
    return best, best_n


def blobs(mask):
    """Connected groups of 8x8 tiles holding uncovered pixels (8-neighbour): [(bbox [x, y, w, h], pixels)]."""
    tiles = mask.reshape(H // TILE, TILE, W // TILE, TILE).any(axis=(1, 3))
    seen = np.zeros_like(tiles)
    out = []
    for ty, tx in zip(*np.nonzero(tiles)):
        if seen[ty, tx]:
            continue
        stack, cells = [(ty, tx)], []
        seen[ty, tx] = True
        while stack:
            y, x = stack.pop()
            cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < tiles.shape[0] and 0 <= nx < tiles.shape[1] and tiles[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        ys, xs = [c[0] for c in cells], [c[1] for c in cells]
        y0, y1, x0, x1 = min(ys) * TILE, (max(ys) + 1) * TILE, min(xs) * TILE, (max(xs) + 1) * TILE
        sub = mask[y0:y1, x0:x1]
        py, px = np.nonzero(sub)
        out.append(([int(x0 + px.min()), int(y0 + py.min()), int(px.max() - px.min() + 1), int(py.max() - py.min() + 1)], int(sub.sum())))
    return out


def iou(a, b):
    ax1, ay1, bx1, by1 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]
    iw, ih = min(ax1, bx1) - max(a[0], b[0]), min(ay1, by1) - max(a[1], b[1])
    if iw <= 0 or ih <= 0:
        return 0.0
    inter = iw * ih
    return inter / (a[2] * a[3] + b[2] * b[3] - inter)


def union_box(a, b):
    x0, y0 = min(a[0], b[0]), min(a[1], b[1])
    x1, y1 = max(a[0] + a[2], b[0] + b[2]), max(a[1] + a[3], b[1] + b[3])
    return [x0, y0, x1 - x0, y1 - y0]


def picture_compare(eng, rom, e0, e1, r0, r1):
    E, R = eng.per[e0:e1], rom.per[r0:r1]
    ehash = [eng.hash[i] for i in E]
    rhash = [rom.hash[i] for i in R]
    seq_e, seq_r = runs(ehash), runs(rhash)
    if seq_e == seq_r:
        return {"class": "identical"}, []
    eset = {eng.hash[i] for i in eng.per[max(0, e0 - MARGIN):e1 + MARGIN]}
    rset = {rom.hash[i] for i in rom.per[max(0, r0 - MARGIN):r1 + MARGIN]}
    timing = {"class": "timing", "engineFrames": e1 - e0, "romFrames": r1 - r0, "enginePictures": len(seq_e), "romPictures": len(seq_r)}
    if set(ehash) <= rset and set(rhash) <= eset:
        return timing, []
    Le, Lr = max(1, e1 - e0), max(1, r1 - r0)
    episodes = []
    for side, this, other, per, oper, s0, s1, o0, o1, L, OL, oset, hashes in (
            ("ours", eng, rom, eng.per, rom.per, e0, e1, r0, r1, Le, Lr, rset, ehash),
            ("rom", rom, eng, rom.per, eng.per, r0, r1, e0, e1, Lr, Le, eset, rhash)):
        half = max(WINDOW_MIN, int(OL * WINDOW_FRACTION))
        seen = {}
        open_eps = []
        for t in range(s1 - s0):
            if hashes[t] in oset:
                continue
            pid = int(per[s0 + t])
            if pid not in seen:
                center = o0 + int(t * OL / L)
                ids = window_ids(oper, max(0, o0 - MARGIN), o1 + MARGIN, center, half)
                mask = uncovered(this.packed(pid), [other.packed(i) for i in ids])
                seen[pid] = (blobs(mask) if mask.any() else [], center)
            found, center = seen[pid]
            for box, n in found:
                ep = next((x for x in open_eps if s0 + t - x["last"] <= EPISODE_GAP and iou(x["box"], box) > 0.2), None)
                if ep is None:
                    ep = {"side": side, "first": s0 + t, "last": s0 + t, "frames": 0, "box": box, "firstBox": box, "pixels": 0, "worst": None}
                    open_eps.append(ep)
                    episodes.append(ep)
                ep["last"] = s0 + t
                ep["frames"] += 1
                ep["box"] = union_box(ep["box"], box)
                if n > ep["pixels"]:
                    ep["pixels"] = n
                    ep["worst"] = {"frame": s0 + t, "pid": pid, "center": center, "box": box}
    if not episodes:
        timing["note"] = "pictures differ only in which parts change when"
        return timing, []
    return {"class": "content", "engineFrames": e1 - e0, "romFrames": r1 - r0,
            "episodes": [{k: v for k, v in ep.items() if k != "worst"} | {"worstFrame": ep["worst"]["frame"]} for ep in episodes]}, episodes


def press_frames(buttons):
    """Frames on which a button starts being pressed (the game reads JOY_NEW), from a timeline's run-length [frame, "A+B"] rows."""
    out, held = set(), set()
    for f, b in buttons:
        now = set(b.split("+")) if b else set()
        if now - held:
            out.add(f)
        held = now
    return out


def attribute_press_sounds(sounds, presses, boundaries):
    """A menu that opens on the very frame of the press that opened it would put that press's own sound (its SE_SELECT) in the new
    menu's stretch, while the other side, whose next menu opens a few frames after the press, keeps it in the old one: our party menu,
    its submenu and the swap screen report themselves open on the A frame, the ROM's a few frames later, so every A there showed as
    "the ROM plays, ours does not" in one stretch and "ours plays, the ROM does not" in the next. An SE on a stretch's first frame
    with a new press on that frame belongs to the menu that took the press: it is counted on the stretch's last frame before."""
    return [(f - 1 if f in boundaries and f in presses and ev.get("kind") in ("se", "direct") else f, ev) for f, ev in sounds]


def sound_key(ev):
    k = ev.get("kind")
    if k == "direct":
        k = "se"
    if k == "duck":  # a cry's lowering (85) and the restore (256) are different events: aligned by kind and id alone they paired crosswise
        return (k, ev.get("id"), ev.get("volume"))
    return (k, ev.get("id"))


def steer_sounds(rom_sounds, steer_frames):
    """The ROM's SE_SELECT of each cursor press the ROM driver added itself (to bring the ROM's cursor to ours): the first one in the 8
    frames from the press. Only that one: a wider cut also dropped a real press's sound right after a steer (seed 3's fight-menu B)."""
    sel = sorted((f, i) for i, (f, ev) in enumerate(rom_sounds) if sound_key(ev) == ("se", 5))
    out = set()
    for sf in steer_frames:
        hit = next((i for f, i in sel if sf <= f < sf + 8 and i not in out), None)
        if hit is not None:
            out.add(hit)
    return out


def drop_unchanged_volume(sounds):
    """A BGM volume set to the volume it already has changes nothing (the ROM log drops such an m4aMPlayVolumeControl as `noop`; ours
    logs every call, e.g. CloseSummaryScreen's restore to 0x100 after the cry's own restore, pokemon_summary_screen.c:1523-1524). A new
    BGM plays at full volume."""
    volume, out = 0x100, []
    for f, ev in sounds:
        if ev.get("kind") == "bgm":
            volume = 0x100
        elif ev.get("kind") == "duck":
            if ev.get("volume") == volume:
                continue
            volume = ev.get("volume")
        out.append([f, ev])
    return out


def drop_silent_cry_stops(sounds):
    """A cry stop that cuts no sounding cry changes nothing you hear; the ROM log keeps StopCryAndClearCrySongs only when it changed the
    m4a RAM (CloseSummaryScreen calls it on every close, pokemon_summary_screen.c:1523), ours logs every call. A cry sounds from its start
    to the BGM restore after it (Task_DuckBGMForPokemonCry: duck to 256 once the cry is over) or a stop."""
    sounding, out = False, []
    for f, ev in sounds:
        kind = ev.get("kind")
        if kind == "cry":
            sounding = True
        elif kind == "duck" and ev.get("volume") == 0x100:
            sounding = False
        elif kind == "stop" and ev.get("player") == "cry":
            if not sounding:
                continue
            sounding = False
        out.append([f, ev])
    return out


def one_per_frame(events):
    """The same sound started twice on one frame is one sound: m4a's second MPlayStart changes nothing (the ROM log drops it as `noop`;
    ours logs both calls, e.g. the YES / NO's NO: menu.c:1020 and script_menu.c:238)."""
    seen, out = set(), []
    for f, k, ev in events:
        key = (f, k, ev.get("pan"))
        if key not in seen:
            seen.add(key)
            out.append((f, k, ev))
    return out


def sound_compare(eng_snd, rom_snd, e0, e1, r0, r1, steered=frozenset()):
    """`steered`: indexes into `rom_snd` of the ROM's own steering presses' SE_SELECTs (steer_sounds), left out: no press of ours is behind them."""
    E = one_per_frame([(f - e0, sound_key(ev), ev) for f, ev in eng_snd if e0 <= f < e1 and ev.get("kind") != "pan"])
    R = one_per_frame([(f - r0, sound_key(ev), ev) for i, (f, ev) in enumerate(rom_snd) if r0 <= f < r1 and ev.get("kind") != "pan" and i not in steered])
    if not E and not R:
        return {"class": "identical", "events": [0, 0]}
    sm = difflib.SequenceMatcher(a=[k for _, k, _ in E], b=[k for _, k, _ in R], autojunk=False)
    missing, extra, shifts = [], [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for a, b in zip(range(i1, i2), range(j1, j2)):
                if E[a][0] != R[b][0]:
                    shifts.append(R[b][0] - E[a][0])
        else:
            missing += [R[j] for j in range(j1, j2)]  # the ROM plays it, ours does not
            extra += [E[i] for i in range(i1, i2)]    # ours plays it, the ROM does not
    # same-key leftovers inside the stretch (reordered) are settled after the cross-boundary pairing (settle_sounds): settled first, a
    # sound that belongs to the neighbouring stretch was used up here and left its partner unpaired there
    cls = "content" if missing or extra else ("timing" if shifts else "identical")
    return {"class": cls, "events": [len(E), len(R)], "missingInOurs": [[f, *k] for f, k, _ in missing],
            "extraInOurs": [[f, *k] for f, k, _ in extra], "shifts": shifts[:40], "reordered": 0}


def settle_sounds(snd):
    """Leftovers of one key on both sides of a stretch are the same sounds in another order: timing, not content."""
    if snd["class"] != "content":
        return snd
    both = Counter(tuple(x[1:]) for x in snd["missingInOurs"]) & Counter(tuple(x[1:]) for x in snd["extraInOurs"])

    def drop(lst):
        c, out = Counter(both), []
        for item in lst:
            if c[tuple(item[1:])] > 0:
                c[tuple(item[1:])] -= 1
            else:
                out.append(item)
        return out
    snd["missingInOurs"], snd["extraInOurs"] = drop(snd["missingInOurs"]), drop(snd["extraInOurs"])
    snd["reordered"] = sum(both.values())
    if not snd["missingInOurs"] and not snd["extraInOurs"]:
        snd["class"] = "timing"
    return snd


def phase_labels(eng):
    """Engine frame -> a coarse place in the round (draft / battle N / between battles), from the engine's screen owners."""
    marks, battle = [], 0
    for f, s in eng.tl["surfaces"]:
        if s == "battleStartIntro":
            battle += 1
            marks.append((f, f"battle {battle}"))
        elif s.startswith("postwin") and (not marks or not marks[-1][1].startswith("after")):
            marks.append((f, f"after battle {battle}"))
        elif s.startswith("factorySwap") and (not marks or not marks[-1][1].startswith("swap")):
            marks.append((f, f"swap screen after battle {battle}"))
        elif s.startswith("prebattleRoom") and battle == 0 and not marks:
            marks.append((f, "walk to battle 1"))
        elif s.startswith("battleRoom") and (not marks or not marks[-1][1].startswith("battle room")):
            marks.append((f, f"battle room before battle {battle + 1}"))
        # between rounds (fcr2): the Lobby after a round, the attendant's new challenge, the PreBattleRoom walk and the next draft
        elif s in ("factoryTerminal", "lobbyFreeRoam") and (not marks or not marks[-1][1].startswith("Lobby")):
            marks.append((f, f"Lobby after battle {battle}"))
        elif s.startswith("lobbyAttendant") and (not marks or marks[-1][1] != "Lobby attendant"):
            marks.append((f, "Lobby attendant"))
        elif s.startswith("prebattleEntry") and (not marks or not marks[-1][1].startswith("PreBattleRoom")):
            marks.append((f, f"PreBattleRoom before round {battle // 7 + 1}"))
        elif s.startswith("draft:") and battle > 0 and marks and marks[-1][1].startswith("PreBattleRoom"):
            marks.append((f, f"draft of round {battle // 7 + 1}"))

    def label(f):
        cur = "draft"
        for mf, name in marks:
            if mf <= f:
                cur = name
            else:
                break
        return cur
    return label


def surface_at(eng, f):
    cur = None
    for sf, s in eng.tl["surfaces"]:
        if sf <= f:
            cur = s
        else:
            break
    return cur


def triptych(path, rom_rgb, eng_rgb, mask, title, box=None):
    scale = 2
    diff = np.zeros((H, W, 3), dtype=np.uint8)
    neq = np.any(rom_rgb != eng_rgb, axis=2)
    gray = (eng_rgb.mean(axis=2) * 0.35).astype(np.uint8)
    diff[:, :, 0] = diff[:, :, 1] = diff[:, :, 2] = gray
    diff[neq] = (255, 200, 0)
    if mask is not None:
        diff[mask] = (255, 0, 64)
    pad, top = 8, 22
    img = Image.new("RGB", (W * 3 * scale + pad * 4, H * scale + top + pad), (24, 24, 28))
    d = ImageDraw.Draw(img)
    for i, (a, label) in enumerate(((rom_rgb, "ROM"), (eng_rgb, "ours"), (diff, "diff"))):
        x = pad + i * (W * scale + pad)
        img.paste(Image.fromarray(a).resize((W * scale, H * scale), Image.NEAREST), (x, top))
        d.text((x, 5), label, fill=(230, 230, 230))
        if box is not None:
            bx, by, bw, bh = box
            d.rectangle([x + bx * scale - 3, top + by * scale - 3, x + (bx + bw) * scale + 2, top + (by + bh) * scale + 2], outline=(0, 220, 255))
    d.text((pad + 70, 5), title[:150], fill=(160, 160, 170))
    img.save(path)


def episode_image(run, name, ep, eng, rom, bounds_of, title):
    """ROM | ours | diff of an episode's worst frame against the nearest frame of the other side."""
    w = ep["worst"]
    this, other = (eng, rom) if ep["side"] == "ours" else (rom, eng)
    o0, o1 = bounds_of(ep)
    ids = window_ids(other.per, max(0, o0 - MARGIN), o1 + MARGIN, w["center"], max(WINDOW_MIN, int((o1 - o0) * WINDOW_FRACTION)))
    pic = this.packed(w["pid"])
    opid, _ = nearest(pic, other, ids)
    mask = uncovered(pic, [other.packed(i) for i in ids])
    ofr = int(np.nonzero(other.per == opid)[0][np.argmin(np.abs(np.nonzero(other.per == opid)[0] - w["center"]))])
    if ep["side"] == "ours":
        triptych(run / "images" / name, other.rgb(opid), this.rgb(w["pid"]), mask, f"{title}: ours frame {w['frame']} vs nearest ROM frame {ofr}", w["box"])
        return {"oursFrame": w["frame"], "romFrame": ofr}
    triptych(run / "images" / name, this.rgb(w["pid"]), other.rgb(opid), mask, f"{title}: ROM frame {w['frame']} vs nearest of ours {ofr}", w["box"])
    return {"romFrame": w["frame"], "oursFrame": ofr}


def main():
    args = sys.argv[1:]
    run = Path(args[0])
    title = args[args.index("--title") + 1] if "--title" in args else run.name
    keep = "--keep-stores" in args
    eng, rom = Side(run / "engine"), Side(run / "rom")
    binds = rom.tl["anchorBinds"]
    label = phase_labels(eng)
    bounds = [(0, 0, None)] + [(e, r, j) for j, r, e in binds]
    e_end, r_end = len(eng.per), len(rom.per)
    stretches, all_eps = [], []
    (run / "images").mkdir(exist_ok=True)
    for old in (run / "images").glob("*.png"):
        old.unlink()
    menu_at = {f: k for f, k, _ in eng.tl["menus"]}
    eng_sounds = attribute_press_sounds(drop_silent_cry_stops(drop_unchanged_volume(eng.tl["sounds"])), press_frames(eng.tl["buttons"]), {e for e, _, _ in bounds})
    rom_list = drop_silent_cry_stops(drop_unchanged_volume(rom.tl["sounds"]))
    rom_sounds = attribute_press_sounds(rom_list, press_frames(rom.tl["buttons"]), {r for _, r, _ in bounds})
    steered = frozenset(steer_sounds(rom_list, rom.tl.get("steerFrames", [])))
    for k, (e0, r0, j) in enumerate(bounds):
        e1, r1 = (bounds[k + 1][0], bounds[k + 1][1]) if k + 1 < len(bounds) else (e_end, r_end)
        if e1 <= e0 or r1 <= r0:
            continue
        # (opl: an after-save start has no staging: its first stretch, the Lobby to the first draft menu, is compared like any other)
        if k == 0 and rom.tl.get("start", "draft") != "after-save":
            pic, eps = {"class": "skipped", "note": "the ROM's select screen fade-in after the draft staging"}, []
            snd = {"class": "skipped"}
        else:
            pic, eps = picture_compare(eng, rom, e0, e1, r0, r1)
            snd = sound_compare(eng_sounds, rom_sounds, e0, e1, r0, r1, steered)
        cls = "content" if "content" in (pic["class"], snd["class"]) else "timing" if "timing" in (pic["class"], snd["class"]) else pic["class"]
        st = {"index": k, "engine": [e0, e1], "rom": [r0, r1], "startsAt": menu_at.get(e0), "where": label(e0), "surface": surface_at(eng, e0),
              "class": cls, "pictures": pic, "sounds": snd}
        for ep in eps:
            ep["stretch"] = k
            ep["where"] = st["where"]
            ep["bounds"] = (r0, r1) if ep["side"] == "ours" else (e0, e1)
        all_eps += eps
        stretches.append(st)
        print(f"stretch {k}: {cls} ({pic['class']} / {snd['class']}) engine {e0}-{e1} rom {r0}-{r1} {st['where']}", flush=True)

    # A sound one side plays just before a menu and the other just after it (the menus opened a few frames apart) lands in two
    # neighbouring stretches with no partner in either: pair such leftovers across the boundary (each once) as timing.
    for a, b in zip(stretches, stretches[1:]):
        sa, sb = a["sounds"], b["sounds"]
        if "content" not in (sa["class"], sb["class"]):
            continue
        boundary_e, boundary_r = b["engine"][0], b["rom"][0]
        for left, right, lk, rk in ((sa, sb, "missingInOurs", "extraInOurs"), (sa, sb, "extraInOurs", "missingInOurs")):
            for item in list(left.get(lk, [])):
                abs_l = (a["rom"][0] if lk == "missingInOurs" else a["engine"][0]) + item[0]
                near_l = abs_l >= (boundary_r if lk == "missingInOurs" else boundary_e) - MARGIN
                partner = next((x for x in right.get(rk, []) if x[1:] == item[1:] and near_l
                                and (b["rom"][0] if rk == "missingInOurs" else b["engine"][0]) + x[0] < (boundary_r if rk == "missingInOurs" else boundary_e) + MARGIN), None)
                if partner is not None:
                    left[lk].remove(item)
                    right[rk].remove(partner)
        for x in (a, b):
            snd = x["sounds"]
            if snd["class"] == "content" and not snd["missingInOurs"] and not snd["extraInOurs"]:
                snd["class"] = "timing"
                x["class"] = "content" if x["pictures"]["class"] == "content" else "timing"
    for x in stretches:
        if x["sounds"]["class"] == "content" and settle_sounds(x["sounds"])["class"] == "timing":
            x["class"] = "content" if x["pictures"]["class"] == "content" else "timing"

    # group episodes of one side at one place, in stretches that start at the same kind of menu, into differences
    stretches_by_index = {st["index"]: st for st in stretches}
    groups = []
    for ep in all_eps:
        ctx = stretches_by_index[ep["stretch"]]["startsAt"] or (stretches_by_index[ep["stretch"]]["surface"] or "").split(":")[0]
        g = next((g for g in groups if g["side"] == ep["side"] and g["ctx"] == ctx and iou(g["box"], ep["firstBox"]) > 0.4), None)
        if g is None:
            g = {"side": ep["side"], "ctx": ctx, "box": ep["firstBox"], "episodes": []}
            groups.append(g)
        g["episodes"].append(ep)
    diffs = []
    for g in groups:
        eps = g["episodes"]
        worst = max(eps, key=lambda e: e["pixels"])
        frames = sum(e["frames"] for e in eps)
        score = worst["pixels"] * (1 + math.log2(1 + frames))
        diffs.append({"side": g["side"], "context": g["ctx"], "box": worst["box"], "pixels": worst["pixels"], "frames": frames, "score": round(score),
                      "occurrences": [{"stretch": e["stretch"], "where": e["where"], "first": e["first"], "last": e["last"], "frames": e["frames"],
                                       "pixels": e["pixels"]} for e in eps], "worstEpisode": worst})
    diffs.sort(key=lambda d: d["score"], reverse=True)
    for i, d in enumerate(diffs):
        ep = d.pop("worstEpisode")
        if d["pixels"] > MINOR_PIXELS or i < 40:
            name = f"d{i + 1:02d}-{d['side']}-{ep['worst']['frame']}.png"
            d["frames_at"] = episode_image(run, name, ep, eng, rom, lambda e: e["bounds"], f"{title} #{i + 1}")
            d["image"] = f"images/{name}"
        d["worstFrame"] = ep["worst"]["frame"]
        d["id"] = i + 1

    # sound differences grouped by (direction, kind, id, menu the stretch starts at)
    sgroups = defaultdict(lambda: {"count": 0, "stretches": []})
    for st in stretches:
        snd = st["sounds"]
        if snd["class"] != "content":
            continue
        for key, lst in (("missing", snd["missingInOurs"]), ("extra", snd["extraInOurs"])):
            for f, kind, sid, *_ in lst:
                g = sgroups[(key, kind, sid, st["startsAt"] or st["surface"])]
                g["count"] += 1
                if st["index"] not in g["stretches"]:
                    g["stretches"].append(st["index"])
                g.setdefault("first", [st["engine"][0] + f if key == "extra" else None, st["rom"][0] + f if key == "missing" else None, st["where"]])
    sound_diffs = sorted(({"direction": k[0], "kind": k[1], "id": k[2], "at": k[3], **v} for k, v in sgroups.items()), key=lambda x: -x["count"])

    # how far each sound drifts from the ROM's (timing.py, docs/tdr1-catcher-timing-report.md)
    names = songs()
    last = stretches[-1]["engine"][1] if stretches else 0
    sound_timing = timing.timing_report(stretches, eng_sounds, rom_sounds, eng.tl["buttons"], rom.tl.get("pressReplays"), steered,
                                        lambda k: timing.sound_name(names, k), timing.battles_in(eng.tl, last))

    content = [s for s in stretches if s["class"] == "content"]
    timing_only = [s for s in stretches if s["class"] == "timing"]
    identical = [s for s in stretches if s["class"] == "identical"]
    out = {"title": title, "engineFrames": e_end - 1, "romFrames": r_end - 1, "stretches": len(stretches), "content": len(content),
           "timing": len(timing_only), "identical": len(identical), "pictureDifferences": diffs, "soundDifferences": sound_diffs,
           "soundTiming": sound_timing,
           "driver": {"anchors": [rom.tl["anchorsMatched"], rom.tl["anchorsTotal"]], "stop": rom.tl["stop"], "log": rom.tl["driverLog"],
                      "staging": rom.tl["staging"], "romSeconds": rom.tl.get("seconds")},
           "list": stretches}
    (run / "findings.json").write_text(json.dumps(out, indent=1))
    write_report(run, out, names)
    eng.close()
    rom.close()
    if not keep:
        for side in ("engine", "rom"):
            p = run / side / "frames.bin"
            if p.exists():
                p.unlink()
    print(f"{title}: {len(content)} content, {len(timing_only)} timing, {len(identical)} identical stretches; "
          f"{len(diffs)} picture differences, {len(sound_diffs)} sound differences; {timing.headline(sound_timing)}; report {run / 'report.md'}")


def songs():
    ref = Path(__file__).resolve().parents[2] / "reference/pokeemerald/include/constants"
    names = {}
    import re
    for f, pre in (("songs.h", r"(?:SE|MUS)_"), ("species.h", r"SPECIES_")):
        p = ref / f
        if p.exists():
            for m in re.finditer(r"#define\s+(%s\w*)\s+(\d+)" % pre, p.read_text()):
                names.setdefault((f, int(m.group(2))), m.group(1))
    return names


def sound_name(names, kind, sid):
    if sid is None:
        return kind
    n = names.get(("species.h" if kind == "cry" else "songs.h", sid))
    return f"{kind} {n or sid}"


def write_report(run, out, names):
    pd, sd = out["pictureDifferences"], out["soundDifferences"]
    major = [d for d in pd if d["pixels"] > MINOR_PIXELS]
    minor = [d for d in pd if d["pixels"] <= MINOR_PIXELS]
    L = [f"# Frame catcher: {out['title']}", "",
         f"Engine {out['engineFrames']} frames, ROM {out['romFrames']} frames, {out['stretches']} stretches (menu to menu): "
         f"**{out['content']} with content differences**, {out['timing']} timing only, {out['identical']} identical. "
         f"ROM driver: {out['driver']['anchors'][0]} of {out['driver']['anchors'][1]} menus followed (stop: {out['driver']['stop']}).", ""]
    L += timing.report_lines(out["soundTiming"])  # tdr1: how far the sounds drift, before the long picture list
    L += [f"## Picture differences ({len(major)}, plus {len(minor)} of at most {MINOR_PIXELS} pixels)", "",
         "Ranked by size x frames. \"ours only\": pixels ours shows that the ROM never shows near that point; \"ROM only\": the reverse "
         "(for example a fade ours skips). Frames are engine frames for ours, ROM frames for the ROM.", ""]
    for d in major:
        occ = d["occurrences"]
        places = Counter(o["where"] for o in occ)
        L.append(f"### #{d['id']} {'ours only' if d['side'] == 'ours' else 'ROM only'}: {d['pixels']} px at x{d['box'][0]} y{d['box'][1]} "
                 f"{d['box'][2]}x{d['box'][3]}, {d['frames']} frames in {len(occ)} stretch(es)")
        L.append(f"- in stretches from {d['context']}; where: {', '.join(f'{w} ({n})' for w, n in places.most_common(4))}; first at frame {occ[0]['first']} (stretch {occ[0]['stretch']}), worst frame {d['worstFrame']}")
        if d.get("image"):
            fa = d["frames_at"]
            L.append(f"- ours frame {fa['oursFrame']} vs ROM frame {fa['romFrame']}: ![]({d['image']})")
        L.append("")
    if minor:
        L += ["### Minor (at most %d pixels)" % MINOR_PIXELS, "", "| # | side | box | frames | first frame | where |", "|---|---|---|---|---|---|"]
        for d in minor:
            L.append(f"| {d['id']} | {d['side']} | x{d['box'][0]} y{d['box'][1]} {d['box'][2]}x{d['box'][3]} | {d['frames']} | {d['occurrences'][0]['first']} | {d['occurrences'][0]['where']} |")
        L.append("")
    L += [f"## Sound differences ({len(sd)})", "", "| what | sound | stretch starts at | times | stretches | first (engine / ROM frame, where) |", "|---|---|---|---|---|---|"]
    for s in sd:
        what = "the ROM plays, ours does not" if s["direction"] == "missing" else "ours plays, the ROM does not"
        L.append(f"| {what} | {sound_name(names, s['kind'], s['id'])} | {s['at']} | {s['count']} | {', '.join(map(str, s['stretches'][:12]))}{' ...' if len(s['stretches']) > 12 else ''} | {s['first']} |")
    L += ["", "## Stretches", "", "| stretch | where | starts at | engine frames | ROM frames | pictures | sounds |", "|---|---|---|---|---|---|---|"]
    for s in out["list"]:
        L.append(f"| {s['index']} | {s['where']} | {s['startsAt'] or s['surface']} | {s['engine'][0]}-{s['engine'][1]} | {s['rom'][0]}-{s['rom'][1]} | "
                 f"{s['pictures']['class']} | {s['sounds']['class']} |")
    L += ["", "## ROM set-up and driver log", ""]
    for x in out["driver"]["staging"]:
        L.append(f"- set-up: {json.dumps(x)}")
    for x in out["driver"]["log"][:120]:
        L.append(f"- driver: {json.dumps(x)}")
    (run / "report.md").write_text("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
