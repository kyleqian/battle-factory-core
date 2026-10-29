#!/usr/bin/env python3
"""bso225 (docs/bso225-player-back-send-out.md): stage dense Scene ON Roar windows with the PLAYER as the Roar target.
  roar-<tag>-{a,b}.json  tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json (Scene ON): HOUNDOUR's Roar drags out player
                         party slot 1 = <species> with <nature>. Captures FIRST..LAST (two oracle runs of at most 256 captures each).
  python3 tools/integration/bso225Stage.py <out-dir> <first> <last> <tag>=<species>[:<nature>[:<gender>]] ..."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
first, last = int(sys.argv[2]), int(sys.argv[3])
for arg in sys.argv[4:]:
    tag, rest = arg.split("=")
    sp, _, rest2 = rest.partition(":")
    nat, _, gender = rest2.partition(":")
    d = json.load(open(root / "tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json"))
    d["profile"] = "battle-scene-on"
    d["overrides"]["parties"]["player"][1]["species"] = int(sp)
    if nat:
        d["overrides"]["parties"]["player"][1]["nature"] = int(nat)
    if gender:
        d["overrides"]["parties"]["player"][1]["gender"] = gender
    frames = list(range(first, last + 1))
    for part, chunk in (("a", frames[:256]), ("b", frames[256:])):
        if not chunk:
            continue
        d["trace"]["captureFrames"] = chunk
        (out / f"roar-{tag}-{part}.json").write_text(json.dumps(d))
