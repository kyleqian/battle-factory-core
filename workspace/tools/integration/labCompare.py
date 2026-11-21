#!/usr/bin/env python3
"""labCompare: the table half of tools/integration/labCompare.sh (read that script's header first).

  labCompare.py fingerprint LAB.json            print "<lab sha256>:<ROM sha256>" (a cached ROM file is reused only when this is unchanged)
  labCompare.py table DIR KEY [--span A:B] [--kinds se,cry] [--ignore-ids 5] [--rows]
      DIR holds KEY.rom.json (hcr3mProbe.py: per-frame script rows), KEY.se.json (soundEventProbe.py lab: ROM sounds) and KEY.eng.json (b4mEngine.ts: commands, sounds).
      The ROM and engine sounds are aligned as ordered (kind, id) lists with difflib (soundScoreboard.py's rule); every matched row prints ENG - ROM (frames of the lab's own clock),
      the ROM script label / exec flag / gAnimScriptActive at the ROM frame and the engine command running at the engine frame (and the next one).
      Last line: SUMMARY (exact = offset 0, offset = matched but ENG - ROM != 0, missing = ROM only, extra = ENG only, mass = sum |ENG - ROM| over matched rows).
      --ignore-ids drops those SE ids from both sides (default 5 = the menu select, input-driven, as soundScoreboard.py; "" keeps everything).
      --span A:B limits the printed rows and the tally to rows whose ROM frame (ENG frame for engine-only rows) is in A..B; --rows adds the merged script / command timeline."""
import bisect
import hashlib
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16]


def load_rom_script(rom):
    names = rom["names"]
    label = lambda p: names.get(hex(p), hex(p))
    frames, state, last_label = [], [], "-"
    for f, ptr, ex, anim, _main, _c0, _h0, _h1, mv, *_ in rom["rows"]:
        if ptr >= 0x08000000:
            last_label = label(ptr)
        frames.append(f)
        state.append((last_label, ex, anim, mv))
    return frames, state


def main():
    if len(sys.argv) >= 3 and sys.argv[1] == "fingerprint":
        print(f"{sha(sys.argv[2])}:{sha(ROOT / 'reference/pokeemerald/pokeemerald.gba')}")
        return
    if len(sys.argv) < 4 or sys.argv[1] != "table":
        raise SystemExit(__doc__)
    d, key, rest = Path(sys.argv[2]), sys.argv[3], sys.argv[4:]
    lo, hi = (int(x) for x in rest[rest.index("--span") + 1].split(":")) if "--span" in rest else (-10**9, 10**9)
    kinds = set((rest[rest.index("--kinds") + 1] if "--kinds" in rest else "se").split(","))
    ignore = {int(x) for x in (rest[rest.index("--ignore-ids") + 1] if "--ignore-ids" in rest else "5").split(",") if x}
    rom = json.load(open(d / f"{key}.rom.json"))
    se = json.load(open(d / f"{key}.se.json"))
    eng = json.load(open(d / f"{key}.eng.json"))
    rows_f, rows_s = load_rom_script(rom)
    rom_snd = [(e["frame"], e["kind"], e["id"]) for e in se["events"] if e["kind"] in kinds and not e.get("noop") and not (e["kind"] == "se" and e["id"] in ignore)]
    eng_snd = [(f, k, i) for f, k, i, _ in eng["sounds"] if k in kinds and not (k == "se" and i in ignore)]
    cmds = [(c[0], f"{c[1]}.{c[2]} {c[3]}" + (f" mv{c[5]}" if c[5] is not None else "")) for c in eng["cmds"]]
    cmd_frames = [c[0] for c in cmds]

    def rom_at(f):
        i = bisect.bisect_right(rows_f, f) - 1
        if i < 0:
            return "-"
        label, ex, anim, _mv = rows_s[i]
        return f"{label} ex{ex}" + (" A" if anim else "")

    def eng_at(f):
        i = bisect.bisect_right(cmd_frames, f) - 1
        cur = f"{cmds[i][1]} @{cmds[i][0]}" if i >= 0 else "-"
        nxt = f" -> {cmds[i + 1][1]} @{cmds[i + 1][0]}" if i + 1 < len(cmds) else ""
        return cur + nxt

    sm = SequenceMatcher(None, [(k, i) for _, k, i in rom_snd], [(k, i) for _, k, i in eng_snd], autojunk=False)
    out = []  # (sort frame, text)
    tally = {"exact": 0, "offset": 0, "missing": 0, "extra": 0}
    mass = 0
    for tag, a, b, c, dd in sm.get_opcodes():
        if tag == "equal":
            for k in range(b - a):
                (rf, kind, i), (ef, _, _) = rom_snd[a + k], eng_snd[c + k]
                if not lo <= rf <= hi:
                    continue
                tally["exact" if ef == rf else "offset"] += 1
                mass += abs(ef - rf)
                out.append((rf, f"  {kind:5s} {i:4d} ROM {rf:5d} ENG {ef:5d} {ef - rf:+5d}  | {rom_at(rf)}  | {eng_at(ef)}"))
            continue
        for k in range(a, b):
            rf, kind, i = rom_snd[k]
            if lo <= rf <= hi:
                tally["missing"] += 1
                out.append((rf, f"  {kind:5s} {i:4d} ROM {rf:5d} ENG    -- missing  | {rom_at(rf)}"))
        for k in range(c, dd):
            ef, kind, i = eng_snd[k]
            if lo <= ef <= hi:
                tally["extra"] += 1
                out.append((ef, f"  {kind:5s} {i:4d} ROM    -- ENG {ef:5d} extra    |  | {eng_at(ef)}"))
    print(f"== {key}  ROM {len(rom_snd)} / ENG {len(eng_snd)} sounds ({','.join(sorted(kinds))})" + ("" if len(rom_snd) == len(eng_snd) else "  COUNTS DIFFER") + f"   [kind id ROM ENG ENG-ROM | ROM script label exFlag A=gAnimScriptActive | ENG command @start -> next]")
    for _, text in sorted(out, key=lambda r: r[0]):
        print(text)
    if "--rows" in rest:
        print("-- timeline (ROM label edges / anim edges, ENG commands)")
        tl, last, prev_anim = [], None, 0
        for f, (label, ex, anim, mv) in zip(rows_f, rows_s):
            k = (label.split("+")[0], ex > 0)
            if k != last:
                tl.append((f, 0, f"ROM  {label} ex{ex} mv{mv}"))
                last = k
            if anim != prev_anim:
                tl.append((f, 0, f"ROM  anim {'start (A0)' if anim else 'end (A1)'}"))
                prev_anim = anim
        for c in eng["cmds"]:
            tl.append((c[0], 1, f"ENG  cmd {c[1]}.{c[2]} {c[3]} b{c[4]} mv{c[5]} timing={json.dumps(c[6])}" + (f" age0@{c[7]}" if c[7] is not None else "")))
        for f, _, t in sorted(tl):
            if lo <= f <= hi:
                print(f"{f:6d} {t}")
    span = "" if "--span" not in rest else f" span {lo}:{hi}"
    print(f"SUMMARY {key}: exact {tally['exact']} / offset {tally['offset']} / missing {tally['missing']} / extra {tally['extra']}, mass {mass} (ROM {len(rom_snd)} / ENG {len(eng_snd)} {','.join(sorted(kinds))}{span})")


if __name__ == "__main__":
    main()
