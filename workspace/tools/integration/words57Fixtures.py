#!/usr/bin/env python3
"""words57 dense consumer fixtures (S10A; docs/next-adapters-words57.md): Swift consumers AFTER a Random2-words unit (Rain Dance +
RAIN_CONTINUES) followed by a battle unit (an opponent KO + summary + send-out; the Factory AI's recall + summary + send-out), from fresh
direct-mGBA run-battle-lab-rgb.py outputs of the words57 scenarios. Window = [A, A + duration - 1], A = the consumer's words57 unit frame -
the job's offset; the offset is the one at which EVERY recorded sSpriteOrder row of the event probe (prep46OrderRngProbe.py) equals the RGB
probe's spriteOrder (all RGB frames). Field profile from the RGB row at A. wordsChain = the production order host's events: the job's history
before its first words body (below), then the words57Chain.ts production marker of the consumer (words bodies + units; a prompt starts a turn),
the RAM-read activation values pinned per words body (liveAdapterFramebuffer.ts fixtureWordsChain).
usage: words57Fixtures.py <probe-out-dir (raw/, units.json)> <rgb-dir (<job>.json)> <lend-vectors.json> <fixture-out-dir>"""
import json, sys
from pathlib import Path

R = Path(__file__).resolve().parents[2]
P, RGB, VEC, OUT = (Path(a) for a in sys.argv[1:5])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
UNITS = json.loads((P / "units.json").read_text())["jobs"]
VECTORS = json.loads(VEC.read_text())
# (job, consumer "<move> f<frame>", history turns before the first words body; the last one continues with the words body)
CASES = [
    ("rain-sun-ko-snorlax", "129 f9554", [[["body", 241, "opponent"]]]),
    ("rain-sun-ko-slowpoke", None, [[["body", 241, "opponent"]]]),
    ("rain-ai-mrmime", "129 f9811", [[["body", 195, "player"], ["body", 33, "opponent"], ["hit", "player"]], []]),
]
DURATION = {129: {"player": 78, "opponent": 80}}


def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")


def event_orders(job):
    rows = json.loads((P / "raw" / f"{job}-A.json").read_text())["rows"]
    return [(r[0], r[2]) for r in rows]


def offset_of(job, frames):
    rows = event_orders(job)
    rgb = {f["frame"]: bytes(f["spriteOrder"]).hex() for f in frames}
    lo, hi = min(rgb), max(rgb)
    for d in range(1800, 2400):
        ok, n = True, 0
        for k, (frame, order) in enumerate(rows):
            end = rows[k + 1][0] if k + 1 < len(rows) else frame + 1
            for f in range(frame, end):
                if lo <= f - d <= hi:
                    n += 1
                    if rgb[f - d] != order:
                        ok = False
                        break
            if not ok:
                break
        if ok and n > 1000:
            return d, n
    raise SystemExit(f"{job}: no offset")


def chain(marker):
    out = []
    if "deferred" in marker["activation"]:
        out += chain(marker["activation"]["deferred"])
    out.append(marker)
    return out


def steps_of(markers):
    """Production marker chain -> wordsChain turns (the first turn continues the history's last turn)."""
    turns, words = [[]], []
    for m in markers:
        words.append(m["key"])
        turns[-1].append(["rain"] if m.get("generalAnimation") == "RAIN_CONTINUES" else ["body", m["moveId"], m["attackerSide"]])
        units = m["units"]
        for i, u in enumerate(units):
            k = u["kind"]
            if k == "action-prompt":
                turns.append([])
            elif k in ("actions-committed", "move-menu", "switch-out"):
                continue
            elif k == "move-animation":
                turns[-1].append(["body", u["moveId"], u["attackerSide"]])
            elif k == "hit-animation":
                turns[-1].append(["hit", "player"])
            elif k == "stat-animation":
                turns[-1].append(["stat", "player", u["argument"]])
            elif k == "general-animation":
                turns[-1].append(["general", u["animation"]])
            elif k == "faint":
                turns[-1].append(["faint", u["side"]])
            elif k == "party-summary-next":
                ai = i > 0 and units[i - 1]["kind"] == "switch-out"
                turns[-1].append(["aisummary"] if ai else ["summary"])
            elif k == "party-summary-hide":
                turns[-1].append(["hide"])
            elif k == "next-mon-send-out":
                turns[-1].append(["sendout"])
            else:
                raise SystemExit(f"unit {u}")
    return turns, words


OUT.mkdir(parents=True, exist_ok=True)
for job, consumer, history in CASES:
    vs = [v for v in VECTORS["vectors"] if v["job"] == job and v["afterBattleUnit"] and v["consumer"].startswith("129 ")]
    v = next(x for x in vs if consumer is None or x["consumer"] == consumer)
    frame = int(v["consumer"].split("f")[1])
    frames = json.loads((RGB / f"{job}.json").read_text())["frames"]
    d, matched = offset_of(job, frames)
    A = frame - d
    markers = chain(v["marker"])
    turns, keys = steps_of(markers)
    side = markers[-1]["attackerSide"] if markers[-1].get("generalAnimation") is None else "player"
    # the consumer: the last body step of the last turn (Swift by the player's active mon)
    turns[-1].append(["body", 129, "player"])
    full = [list(t) for t in history[:-1]] + [history[-1] + turns[0]] + turns[1:]
    by_frame = {f["frame"]: f for f in frames}
    r0 = by_frame[A]
    n = DURATION[129]["player"]
    name = lambda s: S[r0[s]["species"]]["name"].replace("SPECIES_", "")
    pers = lambda s: r0[f"{s}Personality"]
    words = [VECTORS["words"][k] for k in keys]
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": "SWIFT", "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/integration/fixtures/words57/scenarios/{job}.json", "denseWindow": {"startFrame": A, "endFrame": A + n - 1},
          "windowSource": f"window = [activation, activation + {n - 1}]; activation = words57 event-probe unit frame {frame} - offset {d} (every recorded sSpriteOrder row of the event probe equals the RGB probe's at this offset: {matched} frames)",
          "attacker": {"species": name("player"), "geometry": {"side": "player"}}, "target": {"species": name("opponent"), "geometry": {"side": "opponent"}},
          "attackerPersonality": pers("player"),
          "fieldProfile": {"playerHp": r0["player"]["hp"], "playerMaxHp": r0["player"]["maxHp"], "opponentHp": r0["opponent"]["hp"],
                           "opponentMaxHp": r0["opponent"]["maxHp"], "playerGender": gender(r0["player"]["species"], pers("player")),
                           "opponentGender": gender(r0["opponent"]["species"], pers("opponent"))},
          "wordsChain": {"turns": full, "words": [{"value": w["activationValue"], "source": f"words57 RAM gRng2Value at the activation of {k} (words57Extract.py, A == B)"} for k, w in zip(keys, words)]}}
    path = OUT / f"{job}-swift.json"
    path.write_text(json.dumps(fx, indent=1) + "\n")
    print(job, v["consumer"], "offset", d, "matched", matched, "window", fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"],
          "turns", len(full), "words", len(words))
