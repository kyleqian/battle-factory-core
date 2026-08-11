#!/usr/bin/env python3
"""Per-frame message-box diff analysis over oracle battle-lab captures.

Usage: python3 tools/probe/analyze-message-box.py <oracle-lab-output-dir>

Reads the manifest written by `bin/oracle lab`, and for every captured frame
reports the count of changed pixels in the bottom message-box strip vs the
previous captured frame, plus the semantic snapshot (HP, currentMove,
controller command). Adjacent frames that differ are message typing/wipe;
long zero-change runs are the message holds. See
docs/battle-message-hold-cadence-ground-truth.md §4 for the interpretation of
a full dense sweep.
"""
import json, sys
from PIL import Image

BOX = (2, 125, 238, 160)


def main():
    d = sys.argv[1]
    m = json.load(open(f"{d}/manifest.json"))
    caps = m["captures"]
    prev_px = None
    print(f"{'frame':>6} {'chgpx':>6} {'hpP':>4} {'hpO':>4} {'curMove':>7} {'plyCmd':>6}")
    for c in caps:
        img = Image.open(f"{d}/{c['file']}").convert("RGB")
        px = img.crop(BOX).tobytes()
        chg = 0 if prev_px is None else sum(1 for a, b in zip(px, prev_px) if a != b)
        prev_px = px
        st = c.get("state", {})
        b = st.get("battlers", {})
        e = st.get("engine", {})
        print(
            f"{c['frame']:6d} {chg:6d} "
            f"{b.get('player', {}).get('hp', ''):>4} "
            f"{b.get('opponent', {}).get('hp', ''):>4} "
            f"{e.get('currentMove', ''):>7} {e.get('playerControllerCommand', ''):>6}"
        )


if __name__ == "__main__":
    main()
