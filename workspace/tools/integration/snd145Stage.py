#!/usr/bin/env python3
"""snd145 (docs/snd145-send-in-tail-live.md): stage the R4 dense Scene ON windows of an OPPONENT send-in for each species.

  faint-<sp>.json  tools/battle-lab/issue84-opponent-replacement-sendout-off.json in Battle Scene ON: player URSARING Strength KOs the
                   opponent lead; BOTH bench slots are <sp> (the AI picks either), so the faint replacement sends <sp>.
  roar-<sp>.json   tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json: HOUNDOUR's Roar drags out party slot 1 = <sp>
                   (the committed sweep's scenario: model frames = this window's frames).
Dense captures: faint 560..899, roar 340..679 (the longest Factory send-in tail is 260 frames after a send-in at ~580 / ~361), each
split into <kind>-<sp>-a.json / -b.json (the oracle takes at most 256 captures per run; run both into one directory).
  python3 tools/integration/snd145Stage.py <out-dir> <species,...> [--off]
--off: only the Roar windows in Battle Scene OFF (the Scene OFF parity control; no Roar body, so captures 220..559)."""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
species = [int(x) for x in sys.argv[2].split(",")]
off = "--off" in sys.argv
def write(d, name, frames):
    for part, chunk in (("a", frames[:256]), ("b", frames[256:])):
        d["trace"]["captureFrames"] = chunk
        (out / f"{name}-{part}.json").write_text(json.dumps(d))
for sp in species:
    if off:
        d = json.load(open(root / "tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json"))
        d["profile"] = "battle-scene-off"
        d["overrides"]["parties"]["opponent"][1]["species"] = sp
        d["trace"]["segments"] += [{"frames": 400, "buttons": []}]
        write(d, f"roar-{sp}", list(range(220, 560)))
        continue
    d = json.load(open(root / "tools/battle-lab/issue84-opponent-replacement-sendout-off.json"))
    d["profile"] = "battle-scene-on"
    o = d["overrides"]["parties"]["opponent"]
    o[1] = {k: v for k, v in o[1].items() if k != "personality"}
    o[1]["species"] = sp
    o[2] = dict(o[1])
    d["trace"]["segments"] += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}] * 40
    write(d, f"faint-{sp}", list(range(560, 900)))
    d = json.load(open(root / "tools/battle-lab/mechanic-roar-player-houndour-opponent-onix.json"))
    d["overrides"]["parties"]["opponent"][1]["species"] = sp
    d["trace"]["segments"] += [{"frames": 400, "buttons": []}]
    write(d, f"roar-{sp}", list(range(340, 680)))
print(f"{out}: {len(species)} species x {'roar (Scene OFF)' if off else 'faint/roar'}")
