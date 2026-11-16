#!/usr/bin/env python3
"""cry3: measure the ROM's cry length per (species, mode): frames from a `PlayCry_ByMode(species, 0, mode)` call to the frame IsPokemonCryPlaying turns false and
to the frame Task_DuckBGMForPokemonCry restores the BGM (destroys itself). Dev tool (register-poke call of the ROM's own entry point on the oracle's canonical
snapshot, tools/audio/soundRecorder.py Recorder); the result validates the source-derived table tools/audio/genCryModeFrames.py emits.

  /srv/pokebench/vendor/mgba-venv/bin/python tools/audio/cryLengthProbe.py OUT.json --modes 0,11 [--species 9,83 | --all]
OUT.json: {"rows": [[species, mode, cryOffFrame, restoreFrame], ...]}; frames count the advances after the call (the call is made at frame 0)."""
import argparse, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import soundRecorder as sr  # noqa: E402  (redirects fd 1 to the log; report lines go through sr.say)

TASK_SIZE = 40


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--modes", default="11")
    ap.add_argument("--species", default="")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    if Path(a.out).exists():
        raise SystemExit("refusing to overwrite " + a.out)
    root = sr.ROOT
    ids = sorted(json.load(open(root / "tools/integration/fixtures/forced-switch/factory-species-ids.json")))
    species = ids if a.all else [int(x) for x in a.species.split(",")]
    rec = sr.Recorder(sr.DEFAULT_RATE)
    rec.prepare()
    o = rec.o
    tasks = rec.sym["gTasks"]
    cry_player = rec.sym["gMPlay_PokemonCry"]

    def active_tasks():
        return {i for i in range(16) if o.read_u8(tasks + TASK_SIZE * i + 4)}

    def cry_playing():
        mp = o.read_u32(cry_player)
        track = o.read_u32(mp + 0x2C)  # MusicPlayerInfo.tracks
        chan = o.read_u32(track + 0x20)  # MusicPlayerTrack.chan
        return bool(chan) and o.read_u32(chan + 0x2C) == track  # SoundChannel.track

    rows, t0 = [], time.time()
    for sp in species:
        for mode in (int(m) for m in a.modes.split(",")):
            rec.start_clean()
            before = active_tasks()
            rec.call("PlayCry_ByMode", (sp, 0, mode))
            mine = sorted(active_tasks() - before)
            if len(mine) != 1:
                raise RuntimeError(f"species {sp} mode {mode}: expected one new task, got {mine}")
            tid, off, rest = mine[0], None, None
            for f in range(1, 400):
                rec.frame()
                if off is None and not cry_playing():
                    off = f
                if not o.read_u8(tasks + TASK_SIZE * tid + 4):
                    rest = f
                    break
            rows.append([sp, mode, off, rest])
    Path(a.out).write_text(json.dumps({"rows": rows}) + "\n")
    sr.say(f"{len(rows)} rows in {time.time() - t0:.1f}s")


main()
