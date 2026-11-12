#!/usr/bin/env python3
"""Build tools/audio/aud244a-asset-list.json: the distinct sounds the recorder must capture (aud244a).

Sources: every ROM sound log (`events` with kind se / cry / bgm / fanfare) in tools/audio/fixtures/*.json plus any
extra log globs (the aud243 census replays live under ignored .integration/), and every Factory species' cry in
NORMAL / WEAK / FAINT (species of src/data/gen/battle-frontier-mons.json). Pure python3, no emulator.

  python3 tools/audio/audioAssetList.py [--extra-logs GLOB ...] [--out FILE]
"""
import argparse, glob, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SE_WRAPPERS = ["PlaySE", "PlaySE12WithPanning", "PlaySE1WithPanning", "PlaySE2WithPanning"]
CRY_MODES = ["NORMAL", "WEAK", "FAINT"]
DEFAULT_EXTRA = [".integration/validation/sv-*/aud243*/**/*.json", ".integration/validation/sv-*/aud243*/*.json",
                 ".integration/evidence/*/rom*/*.json", ".integration/evidence/*/chain/*.json", ".integration/evidence/aud244a/logs/*.json"]


def defines(path, prefix):
    out = {}
    for m in re.finditer(r"#define\s+(%s\w*)\s+(\d+)" % prefix, path.read_text()):
        out.setdefault(int(m.group(2)), m.group(1))
    return out


def log_files(extra_globs):
    files = sorted(glob.glob(str(ROOT / "tools/audio/fixtures/*.json")))
    seen = set(files)
    for g in extra_globs:
        for f in sorted(glob.glob(str(ROOT / g), recursive=True)):
            if f not in seen and "/tree/" not in f:
                seen.add(f)
                files.append(f)
    return files


def collect(files):
    se, cry, song = {}, {}, {}
    used = []
    for f in files:
        try:
            d = json.loads(Path(f).read_text())
        except (OSError, ValueError):
            continue
        events = d.get("events") if isinstance(d, dict) else None
        if not isinstance(events, list) or not events or not isinstance(events[0], dict) or "kind" not in events[0]:
            continue
        used.append(f)
        for e in events:
            k = e["kind"]
            if k == "se":
                row = se.setdefault((e["id"], e["pan"]), {"vias": {}, "logs": set()})
                row["vias"][e["via"]] = row["vias"].get(e["via"], 0) + 1
                row["logs"].add(f)
            elif k == "cry":
                row = cry.setdefault((e["id"], e["mode"]), {"pans": {}, "logs": set()})
                row["pans"][e["pan"]] = row["pans"].get(e["pan"], 0) + 1
                row["logs"].add(f)
            elif k in ("bgm", "fanfare"):
                row = song.setdefault((k, e["id"]), {"via": {}, "logs": set()})
                row["via"][e["via"]] = row["via"].get(e["via"], 0) + 1
                row["logs"].add(f)
    return se, cry, song, used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extra-logs", nargs="*", default=DEFAULT_EXTRA)
    ap.add_argument("--out", default=str(ROOT / "tools/audio/aud244a-asset-list.json"))
    a = ap.parse_args()
    songs = defines(ROOT / "reference/pokeemerald/include/constants/songs.h", r"(?:SE|MUS)_")
    species = defines(ROOT / "reference/pokeemerald/include/constants/species.h", r"SPECIES_")
    by_name = {n: i for i, n in species.items()}
    files = log_files(a.extra_logs)
    se, cry, song, used = collect(files)
    frontier = json.loads((ROOT / "src/data/gen/battle-frontier-mons.json").read_text())
    factory = sorted({by_name[e["species"]] for e in frontier["entries"]})

    se_rows = []
    for (sid, pan), row in sorted(se.items(), key=lambda kv: (kv[0][0], -999 if kv[0][1] is None else kv[0][1])):
        vias = sorted(row["vias"], key=SE_WRAPPERS.index)
        se_rows.append({"id": sid, "name": songs.get(sid), "pan": pan, "vias": vias, "uses": sum(row["vias"].values()), "logs": len(row["logs"])})

    cry_rows = []
    for sp in factory:
        for mode in CRY_MODES:
            row = cry.get((sp, mode))
            cry_rows.append({"species": sp, "name": species[sp], "mode": mode, "inLogs": row is not None,
                             "logPans": sorted(row["pans"]) if row else []})
    outside = sorted({(sp, mode) for sp, mode in cry if sp not in set(factory) or mode not in CRY_MODES})
    song_rows = [{"kind": k, "id": i, "name": songs.get(i), "via": sorted(r["via"]), "logs": len(r["logs"])} for (k, i), r in sorted(song.items(), key=lambda kv: (kv[0][0], kv[0][1]))]

    out = {"schema": "aud244a-asset-list/1",
           "source": "tools/audio/audioAssetList.py: ROM sound logs (tools/audio/fixtures + extra) and battle-frontier-mons.json",
           "logFiles": {"fixtures": sum(1 for f in used if "/tools/audio/fixtures/" in f), "extra": sum(1 for f in used if "/tools/audio/fixtures/" not in f)},
           "se": se_rows, "cry": cry_rows, "songs": song_rows,
           "logCriesOutsideFactorySet": [{"species": s, "mode": m} for s, m in outside]}
    Path(a.out).write_text(json.dumps(out, indent=1) + "\n")
    print(f"{len(used)} logs ({out['logFiles']}), {len(se_rows)} se (id,pan) tuples over {len({r['id'] for r in se_rows})} ids, "
          f"{len(cry_rows)} cries ({len(factory)} species x {len(CRY_MODES)}), {sum(r['inLogs'] for r in cry_rows)} of them seen in logs, "
          f"{len(song_rows)} bgm/fanfare ids, {len(outside)} log cries outside the Factory set", file=sys.stderr)


if __name__ == "__main__":
    main()
