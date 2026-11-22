#!/usr/bin/env python3
"""Write bootstrap/factory-open.json from bootstrap/factory.json (BOOTSTRAP.md, "Open Level profiles").

The Open route is factory.json's route with one change: segment 202 (frame 4424, the 100 idle frames between tap 5,
A = CHALLENGE, and tap 6, A on the LV. 50 / OPEN LEVEL / EXIT menu) becomes 80 idle + 6 frames DOWN + 14 idle, the same
100 frames, so tap 6 at frame 4524 picks OPEN LEVEL. Every other segment, the save and the 60 settle frames are copied.
Re-run after any change to factory.json's segments (the script checks the segment it replaces).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
TAP6_IDLE = 202
DESCRIPTION = (
    "Open Level anchor: factory.json's route (the same save, inputs and 60 settle frames) with segment 202, the 100 idle "
    "frames before tap 6, replaced by 80 idle + 6 frames DOWN + 14 idle, so tap 6 (frame 4524) picks OPEN LEVEL from the "
    "LV. 50 / OPEN LEVEL / EXIT menu. The ROM then runs its own Open Level single challenge (SaveBlock2 lvlMode = 1): the "
    "same save prompts, the walk into the PreBattleRoom, the deal (factory_generaterentalmons, factory_generateopponentmons) "
    "and the attendant's comments, ending on the Open Level rental draft ('Select the first POKeMON.'), cursor on slot 1, "
    "no mon selected. 6970 frames (6910 scripted + 60 settle). Battle Scene ON (set in the save, as factory.json). "
    "Pinned rental pool and numbers: BOOTSTRAP.md, 'Open Level profiles'."
)


def main():
    base = json.loads((HERE / "factory.json").read_text())
    segs = base["segments"]
    if segs[TAP6_IDLE] != {"frames": 100, "buttons": []} or segs[TAP6_IDLE + 1] != {"frames": 6, "buttons": ["A"]}:
        raise SystemExit(f"factory.json segment {TAP6_IDLE} is not the idle before tap 6: {segs[TAP6_IDLE]}")
    new = segs[:TAP6_IDLE] + [
        {"frames": 80, "buttons": []},
        {"frames": 6, "buttons": ["DOWN"]},
        {"frames": 14, "buttons": []},
    ] + segs[TAP6_IDLE + 1:]
    assert sum(s["frames"] for s in new) == sum(s["frames"] for s in segs)
    out = {
        "version": base["version"],
        "profile": "battle-scene-on",
        "lvlMode": "open",
        "description": DESCRIPTION,
        "save": base["save"],
        "pokes": [],
        "settleFrames": base["settleFrames"],
        "segments": new,
    }
    (HERE / "factory-open.json").write_text(json.dumps(out, indent=1) + "\n")
    print(f"wrote {HERE / 'factory-open.json'}: {len(new)} segments, {sum(s['frames'] for s in new)} + {out['settleFrames']} frames")


if __name__ == "__main__":
    main()
