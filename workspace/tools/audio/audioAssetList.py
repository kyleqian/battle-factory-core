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
# cry2: the cry-task modes (battle_anim_sound_tasks.c), recorded only for species that can use the move in Factory play.
CRY_TASK_MOVES = {"MOVE_ROAR": ["ROAR_1", "ROAR_2"], "MOVE_HOWL": ["HIGH_PITCH"], "MOVE_HYPER_VOICE": ["ECHO_START", "ECHO_END"]}
# Moves that run another move with the user's own species (Metronome / Assist / Mimic / Mirror Move): any of the three can come out.
CRY_TASK_INDIRECT = {"MOVE_METRONOME", "MOVE_ASSIST", "MOVE_MIMIC", "MOVE_MIRROR_MOVE", "MOVE_COPYCAT", "MOVE_SKETCH"}
ALL_CRY_MODES = CRY_MODES + [m for modes in CRY_TASK_MOVES.values() for m in modes]
# bgm1: songs the engine emits (GetBattleBGM, pokemon.c:6473-6480) that no ROM sound log contains; recorded like the logged ones.
EXTRA_SONGS = [("bgm", 471, "PlayBGM")]  # MUS_VS_FRONTIER_BRAIN: the Factory Head's battle
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
    # snd1: SE tuples the engine emits that no ROM sound log contains (tools/audio/snd1-extra-se.json); recorded like the logged ones.
    # snd3: the same for the tuples whose only recordings were more than 2 pan units away (tools/audio/snd3-extra-se.json).
    for extra in ("snd1-extra-se.json", "snd3-extra-se.json"):
        for r in json.loads((ROOT / "tools/audio" / extra).read_text())["se"]:
            if (r["id"], r["pan"]) not in se and not any(x["id"] == r["id"] and x["pan"] == r["pan"] for x in se_rows):
                se_rows.append({"id": r["id"], "name": songs.get(r["id"]), "pan": r["pan"], "vias": r["vias"], "uses": 0, "logs": 0, "source": extra})
    se_rows.sort(key=lambda r: (r["id"], -999 if r["pan"] is None else r["pan"]))

    task_modes = {}
    for e in frontier["entries"]:
        sp = by_name[e["species"]]
        for mv in e["moves"]:
            if mv in CRY_TASK_MOVES:
                task_modes.setdefault(sp, set()).update(CRY_TASK_MOVES[mv])
            elif mv in CRY_TASK_INDIRECT:
                task_modes.setdefault(sp, set()).update(m for ms in CRY_TASK_MOVES.values() for m in ms)
    cry_rows = []
    for sp in factory:
        for mode in CRY_MODES + [m for m in ALL_CRY_MODES[len(CRY_MODES):] if m in task_modes.get(sp, ())]:
            row = cry.get((sp, mode))
            cry_rows.append({"species": sp, "name": species[sp], "mode": mode, "inLogs": row is not None,
                             "logPans": sorted(row["pans"]) if row else []})
    wanted = {(r["species"], r["mode"]) for r in cry_rows}
    outside = sorted(k for k in cry if k not in wanted)
    for kind, sid, via in EXTRA_SONGS:
        song.setdefault((kind, sid), {"via": {via: 0}, "logs": set()})
    song_rows = [{"kind": k, "id": i, "name": songs.get(i), "via": sorted(r["via"]), "logs": len(r["logs"])} for (k, i), r in sorted(song.items(), key=lambda kv: (kv[0][0], kv[0][1]))]

    out = {"schema": "aud244a-asset-list/1",
           "source": "tools/audio/audioAssetList.py: ROM sound logs (tools/audio/fixtures + extra) and battle-frontier-mons.json",
           "logFiles": {"fixtures": sum(1 for f in used if "/tools/audio/fixtures/" in f), "extra": sum(1 for f in used if "/tools/audio/fixtures/" not in f)},
           "se": se_rows, "cry": cry_rows, "songs": song_rows,
           "logCriesOutsideFactorySet": [{"species": s, "mode": m} for s, m in outside]}
    Path(a.out).write_text(json.dumps(out, indent=1) + "\n")
    print(f"{len(used)} logs ({out['logFiles']}), {len(se_rows)} se (id,pan) tuples over {len({r['id'] for r in se_rows})} ids, "
          f"{len(cry_rows)} cries ({len(factory)} species x {len(CRY_MODES)} + {len(cry_rows) - len(factory) * len(CRY_MODES)} task modes on {len(task_modes)} species), {sum(r['inLogs'] for r in cry_rows)} of them seen in logs, "
          f"{len(song_rows)} bgm/fanfare ids, {len(outside)} log cries outside the Factory set", file=sys.stderr)


if __name__ == "__main__":
    main()
