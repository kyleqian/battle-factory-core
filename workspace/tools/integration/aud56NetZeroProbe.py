#!/usr/bin/env python3
"""aud56 (ISSUES #156): general / hit / stat animation allocator net-zero probe, one pass (docs/aud56-general-animation-allocator.md).

usage: aud56NetZeroProbe.py <scenario.json> <output.json>
A copy of tools/integration/prep52NetZeroProbe.py (below, unchanged) with two additions:
 - every frame also records the OBJ tile allocator (sSpriteTileAllocBitmap, 128 bytes, sha256-16), the sprite palette tags
   (sSpritePaletteTags[16]) and the affine matrix allocator (gOamMatrixAllocBitmap); every interval reports them at baseline and
   end ("gfx") and gfxNetZero = all three equal;
 - HIT windows: Cmd_hitanimation's controller (PlayerHandleHitAnimation / OpponentHandleHitAnimation -> DoHitAnimHealthboxEffect)
   creates one invisible sprite with callback SpriteCB_HitAnimHealthoxEffect, destroyed by itself on its 21st callback, while
   DoHitAnimBlinkSpriteEffect blinks the battler for 32 frames before the controller completes. A hit window = [the frame that
   sprite appears, the frame it is gone]; it reports the same baseline / end / created / destroyed / gfx fields plus the frame of
   the next animation-script activation (the release must precede the next body's first allocation).
--- prep52 header ---
prep52: sprite-allocator net-zero probe keyed on a MOVE ID or a SCRIPT LABEL, one pass (docs/next-adapters-prep52.md).
A copy of tools/integration/prep50StatusProbe.py (frame-API pass, Scene ON, the docs/allocator-net-zero-audit.md window and
net-zero definition) that records EVERY animation-script interval instead of one label: an interval is an active run of
gAnimScriptActive (0 -> 1 -> 0); its keys at the first active frame are sAnimMoveIndex (a move animation sets it to the move
id; status / general / special animations launch with LaunchBattleAnimation(..., FALSE) -> 0, battle_anim.c ~:231) and the
script label (the ELF label containing sBattleAnimScriptPtr, or, when that pointer is inside a called subroutine, the label
containing sBattleAnimScriptRetAddr -- only when the pointer's own label is not a script entry, prep50's rule). Per interval:
baseline (occupied OBJ slots at activation-1), end (at the first inactive frame), create / destroy / replace events in between
(a same-slot template or callback change counts as destroy + create), occupied-set changes in the 8 frames after cleanup (with
template / callback), the surviving / freed slots (end - baseline, baseline - end, with template / callback) and
gBattleAnimAttacker / gBattleAnimTarget at activation. Extraction (prep52Extract.py) selects intervals by move id or label.
"""
from __future__ import annotations

import bisect
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: aud56NetZeroProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

PROFILE = "battle-scene-on"
LATE = 8
ENTRY = ("Move_", "General_", "Special_", "Status_")


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), PROFILE)
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, PROFILE)
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", "-n", str(ref / "pokeemerald.elf")], check=True,
                        capture_output=True, text=True).stdout
    names: dict[str, int] = {}
    data_labels: list[tuple[int, str]] = []
    code_labels: list[tuple[int, str]] = []
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) == 3:
            names[parts[2]] = int(parts[0], 16)
            if parts[1] in "dDrR":
                data_labels.append((int(parts[0], 16), parts[2]))
            elif parts[1] in "tT":
                code_labels.append((int(parts[0], 16) & ~1, parts[2]))
    data_labels.sort()
    code_labels.sort()
    addrs = [a for a, _ in data_labels]
    caddrs = [a for a, _ in code_labels]

    def label_of(x: int) -> str:
        i = bisect.bisect_right(addrs, x) - 1
        return data_labels[i][1] if i >= 0 else "?"

    def sym(x: int, table=None) -> str:  # template (data) / callback (code) name for receipts
        if table == "code":
            i = bisect.bisect_right(caddrs, x & ~1) - 1
            return code_labels[i][1] if i >= 0 and code_labels[i][0] == x & ~1 else hex(x)
        i = bisect.bisect_right(addrs, x) - 1
        return data_labels[i][1] if i >= 0 and data_labels[i][0] == x else hex(x)

    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    hit_cb = names["SpriteCB_HitAnimHealthoxEffect"] & ~1
    hit_data: dict[int, dict[int, int]] = {}  # frame -> {hit-effect slot: its data[1]}
    gfx = []  # per frame (tile bitmap sha256-16, palette tags, matrix bitmap)
    rows = []  # (frame, active, ptr, retaddr, attacker, target, table{slot:(template,callback)}, sAnimMoveIndex)

    def capture(frame: int) -> None:
        table = {}
        for i in range(64):
            base = names["gSprites"] + 0x44 * i
            if u8(base + 0x3E) & 1:
                table[i] = (u32(base + 0x14), u32(base + 0x1C))
                if (table[i][1] & ~1) == hit_cb:
                    hit_data.setdefault(frame, {})[i] = u16(base + 0x30)  # data[1] = gHealthboxSpriteIds[battler]
        tiles = hashlib.sha256(bytes(u8(names["sSpriteTileAllocBitmap"] + i) for i in range(128))).hexdigest()[:16]
        pals = tuple(u16(names["sSpritePaletteTags"] + 2 * i) for i in range(16))
        gfx.append((tiles, pals, u32(names["gOamMatrixAllocBitmap"])))
        rows.append((frame, bool(u8(names["gAnimScriptActive"])), u32(names["sBattleAnimScriptPtr"]),
                     u32(names["sBattleAnimScriptRetAddr"]), u8(names["gBattleAnimAttacker"]), u8(names["gBattleAnimTarget"]),
                     table, u16(names["sAnimMoveIndex"])))

    frame = 0
    capture(0)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    intervals = []
    for f, active, ptr, ret, attacker, target, _, move_index in rows:
        if active and (not intervals or intervals[-1]["end"] is not None):
            own = label_of(ptr)
            script = own if own.startswith(ENTRY) else label_of(ret) if label_of(ret).startswith(ENTRY) else own
            intervals.append({"start": f, "end": None, "script": script, "moveIndex": move_index, "ptrLabel": own,
                              "attacker": attacker, "target": target})
        elif not active and intervals and intervals[-1]["end"] is None:
            intervals[-1]["end"] = f
    by_frame = {r[0]: r for r in rows}
    ent = lambda v: [sym(v[0]), sym(v[1], "code")]
    def gfx_fields(f0: int, f1: int) -> dict:
        g0, g1 = gfx[f0], gfx[f1]
        return {"gfx": {"baseline": {"tiles": g0[0], "paletteTags": list(g0[1]), "matrices": g0[2]},
                        "end": {"tiles": g1[0], "paletteTags": list(g1[1]), "matrices": g1[2]}},
                "gfxNetZero": g0 == g1}

    bodies = []
    for iv in intervals:
        a, c = iv["start"], iv["end"]
        body = {"activation": a, "cleanup": c, "script": iv["script"], "moveIndex": iv["moveIndex"], "ptrLabel": iv["ptrLabel"],
                "attacker": iv["attacker"], "target": iv["target"]}
        if c is None or a == 0:
            body["error"] = "no cleanup within trace" if c is None else "activation at frame 0"
            bodies.append(body)
            continue
        base, end = by_frame[a - 1][6], by_frame[c][6]
        events, created, destroyed, prev = [], 0, 0, base
        for fr in range(a, c + 1):
            t = by_frame[fr][6]
            for slot in sorted(set(prev) | set(t)):
                bf, af = prev.get(slot), t.get(slot)
                if bf == af:
                    continue
                kind = "create" if bf is None else "destroy" if af is None else "replace"
                if kind in ("create", "replace"): created += 1
                if kind in ("destroy", "replace"): destroyed += 1
                events.append([fr, slot, kind] + ent(af or bf))
            prev = t
        late, prev = [], end
        for fr in range(c + 1, min(c + LATE, frame) + 1):
            t = by_frame[fr][6]
            if set(t) != set(prev):
                late.append({"frame": fr, "occupied": sorted(t),
                             "added": {str(s): ent(t[s]) for s in sorted(set(t) - set(prev))},
                             "removed": {str(s): ent(prev[s]) for s in sorted(set(prev) - set(t))}})
            prev = t
        body.update({"baseline": sorted(base), "end": sorted(end), "created": created, "destroyed": destroyed,
                     "endEqualsBaselineTable": base == end,
                     "survivors": {str(s): ent(end[s]) for s in sorted(set(end) - set(base))},
                     "freed": {str(s): ent(base[s]) for s in sorted(set(base) - set(end))},
                     "lateChanges": late, "windowEvents": events,
                     "netZero": sorted(base) == sorted(end) and created == destroyed and not late})
        body.update(gfx_fields(a - 1, c))
        bodies.append(body)
    # HIT windows (SpriteCB_HitAnimHealthoxEffect sprite lifetime).
    hits = []
    for slot in range(64):
        start = None
        for f, *_rest in rows:
            t = by_frame[f][6]
            on = slot in t and (t[slot][1] & ~1) == hit_cb
            if on and start is None:
                start = f
            elif not on and start is not None:
                hits.append((start, f, slot)); start = None
        if start is not None:
            hits.append((start, None, slot))
    hit_rows = []
    for a, c, slot in sorted(hits):
        hb = hit_data.get(a, {}).get(slot)
        boxes = [u8(names["gHealthboxSpriteIds"] + i) for i in range(2)]
        h = {"created": a, "released": c, "slot": slot, "healthboxSprite": hb,
             "battler": boxes.index(hb) if hb in boxes else None}
        if c is None or a == 0:
            h["error"] = "not released within trace" if c is None else "at frame 0"
            hit_rows.append(h); continue
        base, end = by_frame[a - 1][6], by_frame[c][6]
        created = destroyed = 0
        prev, events = base, []
        for fr in range(a, c + 1):
            t = by_frame[fr][6]
            for s2 in sorted(set(prev) | set(t)):
                bf, af = prev.get(s2), t.get(s2)
                if bf == af: continue
                kind = "create" if bf is None else "destroy" if af is None else "replace"
                if kind in ("create", "replace"): created += 1
                if kind in ("destroy", "replace"): destroyed += 1
                events.append([fr, s2, kind] + ent(af or bf))
            prev = t
        nxt = next((iv["start"] for iv in intervals if iv["start"] >= a), None)
        h.update({"lifetime": c - a, "baseline": sorted(base), "end": sorted(end), "createdInWindow": created, "destroyedInWindow": destroyed,
                  "windowEvents": events, "nextScriptActivation": nxt,
                  "releasedBeforeNextScript": nxt is None or c <= nxt,
                  "netZero": sorted(base) == sorted(end) and created == destroyed})
        h.update(gfx_fields(a - 1, c))
        hit_rows.append(h)
    payload = {
        "schema": "aud56-net-zero-raw/v1", "scenario": SCENARIO.name, "scenarioSha256": hashlib.sha256(SCENARIO.read_bytes()).hexdigest(),
        "profile": PROFILE, "toolSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "framesRun": frame,
        "bodies": bodies, "hits": hit_rows,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {[(b['activation'], b['cleanup'], b['script'], b['moveIndex'], b['attacker'], b.get('netZero')) for b in bodies]}")


if __name__ == "__main__":
    main()
    sys.stdout.flush()
    os._exit(0)  # mGBA teardown segfaults at interpreter exit; output is already written
