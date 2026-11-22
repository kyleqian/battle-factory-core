#!/usr/bin/env python3
"""Write bootstrap/factory-open-after-save.json (+ the Battle Scene OFF profile) from bootstrap/factory-open.json (BOOTSTRAP.md,
"Open Level profiles"; workspace/docs/opl5-open-level-more-runs.md).

The ROM's state the engine's `start: "after-save"` Open Level mount stands for: the Open route cut after AFTER_SAVE_FRAMES frames, the
frame whose screen shows "Please step this way." at its first glyph, as the engine's after-save frame 0 does (the text box rows
y 112-159 identical; the rest of the screen differs only by the Lobby's wandering NPCs, whose RNG the engine does not follow). The
save prompts are done (lvlMode 1, factory_init ran, the win-streak-active flag set). No settle frames: the cut frame is the snapshot.
gRngValue at the snapshot is 0xfd76c447 (4252487367), the engine's `gameplaySeed` for the same start (the Lobby cursor on frame 0).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
AFTER_SAVE_FRAMES = 5310
OFF_POKE = json.loads((HERE / "factory-battle-scene-off.json").read_text())["pokes"]


def main():
    base = json.loads((HERE / "factory-open.json").read_text())
    out_segs, acc = [], 0
    for seg in base["segments"]:
        if acc + seg["frames"] >= AFTER_SAVE_FRAMES:
            out_segs.append({"frames": AFTER_SAVE_FRAMES - acc, "buttons": seg["buttons"]})
            break
        out_segs.append(seg)
        acc += seg["frames"]
    assert sum(s["frames"] for s in out_segs) == AFTER_SAVE_FRAMES
    on = {"version": base["version"], "profile": "battle-scene-on", "lvlMode": "open", "start": "after-save",
          "description": ("Open Level after-save snapshot: factory-open.json's route cut after %d frames, \"Please step this way.\" at its "
                          "first glyph (the engine's start: \"after-save\" frame 0). No settle frames. gRngValue 0xfd76c447." % AFTER_SAVE_FRAMES),
          "save": base["save"], "segments": out_segs, "pokes": [], "settleFrames": 0}
    (HERE / "factory-open-after-save.json").write_text(json.dumps(on, indent=2) + "\n")
    off = {"extends": "factory-open-after-save.json", "version": base["version"], "profile": "battle-scene-off",
           "description": on["description"] + " Battle Scene OFF (the same poke as factory-battle-scene-off.json, zero frames).", "pokes": OFF_POKE}
    (HERE / "factory-open-after-save-battle-scene-off.json").write_text(json.dumps(off, indent=2) + "\n")
    print("wrote factory-open-after-save.json and factory-open-after-save-battle-scene-off.json")


if __name__ == "__main__":
    main()
