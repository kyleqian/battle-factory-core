#!/usr/bin/env python3
"""labCompare: the table half of tools/integration/labCompare.sh (read that script's header first).

  labCompare.py fingerprint LAB.json            print "<lab sha>:<ROM sha>:<probe scripts sha>" (a cached ROM capture is reused only when this is unchanged)
  labCompare.py find-rom KEY FINGERPRINT ROOT... print the newest dir under the ROOTs (a run dir, or a dir of run dirs) that holds KEY.{rom,se}.json and a KEY.fp equal to FINGERPRINT
  labCompare.py table DIR KEY [--span A:B] [--kinds se,cry] [--ignore-ids 5] [--rows] [--no-prints]
      DIR holds KEY.rom.json (hcr3mProbe.py: per-frame script rows), KEY.se.json (soundEventProbe.py lab: ROM sounds) and KEY.eng.json (b4mEngine.ts: commands, sounds).
      The ROM and engine sounds are aligned as ordered (kind, id) lists with difflib (soundScoreboard.py's rule); every matched row prints ENG - ROM (frames of the lab's own clock),
      the ROM script label / exec flag / gAnimScriptActive at the ROM frame and the engine command running at the engine frame (and the next one).
      Last line: SUMMARY (exact = offset 0, offset = matched but ENG - ROM != 0, missing = ROM only, extra = ENG only, mass = sum |ENG - ROM| over matched rows).
      --ignore-ids drops those SE ids from both sides (default 5 = the menu select, input-driven, as soundScoreboard.py; "" keeps everything).
      --span A:B limits the printed rows and the tally to rows whose ROM frame (ENG frame for engine-only rows) is in A..B; --rows adds the merged script / command timeline.
      Print rows (kind "print", also tallied on a PRINTS line, not in SUMMARY; --no-prints hides both): the first glyph of every battle message. ROM = the frame sTextPrinters[0] (hcr3mProbe.py tp) goes
      inactive -> active, + 1 (the printstring row; the first glyph is drawn the next frame, hcr1b); ENG = the start frame of a `message` command + its `leadFrames` (pso1: the rows before its first glyph). Ordered minimum-|ENG - ROM| alignment, a skip costs 120."""
import bisect
import hashlib
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


PROBE_SCRIPTS = ("tools/integration/hcr3mProbe.py", "tools/audio/soundEventProbe.py")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16]


def fingerprint(lab):
    probes = hashlib.sha256(b"".join((ROOT / p).read_bytes() for p in PROBE_SCRIPTS)).hexdigest()[:16]
    return f"{sha(lab)}:{sha(ROOT / 'reference/pokeemerald/pokeemerald.gba')}:{probes}"


def find_rom(key, fp, roots):
    """The newest run dir under `roots` (each a run dir or a dir of run dirs) whose KEY capture files exist and whose KEY.fp equals fp."""
    found = []
    for root in roots:
        root = Path(root)
        for d in [root, *(c for c in root.glob("*") if c.is_dir())] if root.is_dir() else []:
            f = d / f"{key}.fp"
            if f.is_file() and f.read_text().strip() == fp and (d / f"{key}.rom.json").stat().st_size and (d / f"{key}.se.json").stat().st_size:
                found.append((f.stat().st_mtime, d))
    return max(found)[1] if found else None


def rom_prints(rom):
    """Frames sTextPrinters[0] goes inactive -> active (hcr3mProbe rows, tp = active | state << 8), with the script label there; None when the capture has no printer data."""
    names = rom["names"]
    out, prev, label, seen = [], 0, "-", False
    for f, ptr, *_rest, tp in rom["rows"]:
        if ptr >= 0x08000000:
            label = names.get(hex(ptr), hex(ptr))
        seen = seen or tp != 0
        active = tp & 0xFF
        if active and not prev:
            out.append((f + 1, label))
        prev = active
    return out if seen else None


def align_prints(rom, eng, skip=120):
    """Ordered minimum-cost alignment of ROM glyph frames and ENG message starts: [(i or None, j or None)]."""
    n, m = len(rom), len(eng)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for j in range(m + 1):
            if i == 0 or j == 0:
                cost[i][j] = skip * (i + j)
            else:
                cost[i][j] = min(cost[i - 1][j - 1] + abs(rom[i - 1] - eng[j - 1]), cost[i - 1][j] + skip, cost[i][j - 1] + skip)
    pairs, i, j = [], n, m
    while i or j:
        if i and j and cost[i][j] == cost[i - 1][j - 1] + abs(rom[i - 1] - eng[j - 1]):
            pairs.append((i - 1, j - 1)); i, j = i - 1, j - 1
        elif i and cost[i][j] == cost[i - 1][j] + skip:
            pairs.append((i - 1, None)); i -= 1
        else:
            pairs.append((None, j - 1)); j -= 1
    return pairs[::-1]


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
        print(fingerprint(sys.argv[2]))
        return
    if len(sys.argv) >= 5 and sys.argv[1] == "find-rom":
        hit = find_rom(sys.argv[2], sys.argv[3], sys.argv[4:])
        if hit is not None:
            print(hit)
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

    no_body = eng.get("noBody", [])

    def no_body_at(rf):
        # a ROM SE the engine does not play while a body without a live adapter runs: the last such command at or before the ROM frame + slack
        hit = [(f, m) for f, m in no_body if f - 20 <= rf]
        nxt = next((f for f, _ in no_body if f - 20 > rf), 10**9)
        hit = [(f, m) for f, m in hit if f - 20 <= rf < max(nxt, f + 400)]
        return f"  [ENG has no live body adapter for mv{hit[-1][1]} (@{hit[-1][0]}): no body SE]" if hit else ""

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
                out.append((rf, f"  {kind:5s} {i:4d} ROM {rf:5d} ENG    -- missing  | {rom_at(rf)}" + (no_body_at(rf) if kind == "se" else "")))
        for k in range(c, dd):
            ef, kind, i = eng_snd[k]
            if lo <= ef <= hi:
                tally["extra"] += 1
                out.append((ef, f"  {kind:5s} {i:4d} ROM    -- ENG {ef:5d} extra    |  | {eng_at(ef)}"))
    prints_line = None
    if "--no-prints" not in rest:
        rp = rom_prints(rom)
        ep = [(c[0] + ((c[6] or {}).get("msgLead", 0)), f"{c[1]}.{c[2]} message") for c in eng["cmds"] if c[3] == "message"]
        if rp is None:
            out.append((-10**9, "  print: no sTextPrinters data in this ROM capture (probed before cln13; re-probe without --reuse-rom)"))
        else:
            pt = {"exact": 0, "offset": 0, "missing": 0, "extra": 0}
            pmass = 0
            for i, j in align_prints([g for g, _ in rp], [f for f, _ in ep]):
                if i is not None and j is not None:
                    (rf, label), (ef, cname) = rp[i], ep[j]
                    if lo <= rf <= hi:
                        pt["exact" if ef == rf else "offset"] += 1
                        pmass += abs(ef - rf)
                        out.append((rf, f"  print      ROM {rf:5d} ENG {ef:5d} {ef - rf:+5d}  | {label}  | {eng_at(ef)}"))
                elif i is not None:
                    rf, label = rp[i]
                    if lo <= rf <= hi:
                        pt["missing"] += 1
                        out.append((rf, f"  print      ROM {rf:5d} ENG    -- missing  | {label}"))
                else:
                    ef, cname = ep[j]
                    if lo <= ef <= hi:
                        pt["extra"] += 1
                        out.append((ef, f"  print      ROM    -- ENG {ef:5d} extra    |  | {eng_at(ef)}"))
            prints_line = f"PRINTS {key}: exact {pt['exact']} / offset {pt['offset']} / missing {pt['missing']} / extra {pt['extra']}, mass {pmass} (first glyph: ROM {len(rp)} / ENG {len(ep)})"
    print(f"== {key}  ROM {len(rom_snd)} / ENG {len(eng_snd)} sounds ({','.join(sorted(kinds))})" + ("" if len(rom_snd) == len(eng_snd) else "  COUNTS DIFFER") + f"   [kind id ROM ENG ENG-ROM | ROM script label exFlag A=gAnimScriptActive | ENG command @start -> next; print = first glyph of a battle message]")
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
    if prints_line is not None:
        print(prints_line)
    print(f"SUMMARY {key}: exact {tally['exact']} / offset {tally['offset']} / missing {tally['missing']} / extra {tally['extra']}, mass {mass} (ROM {len(rom_snd)} / ENG {len(eng_snd)} {','.join(sorted(kinds))}{span})")


if __name__ == "__main__":
    main()
