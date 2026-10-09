#!/usr/bin/env python3
"""words59 dense consumer fixtures (S10A; docs/next-adapters-words59.md): ORDER-DEPENDENT consumers (Water Pulse 352, Silver Wind 318) AFTER a
dirt words unit (Sand-Attack 28 / Mud-Slap 189) followed by an opponent KO + summary + send-out, from fresh direct-mGBA run-battle-lab-rgb.py
outputs of the words59 scenarios. words57Fixtures.py's method (offset, window, field profile, wordsChain from the words57Chain.ts production
marker, RAM-read activation values pinned per words body), generalized to any consumer move; every dirt body step carries the species
displayed at that body (the words59 marker's bodySpecies: the chain check's speciesInferred, else the leads).
usage: words59Fixtures.py <probe-out-dir (raw/, units.json)> <rgb-dir (<job>.json)> <chain.json> <lend-vectors.json> <fixture-out-dir>"""
import json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep46Words as Wd

R = Path(__file__).resolve().parents[2]
P, RGB, CHAIN, VEC, OUT = (Path(a) for a in sys.argv[1:6])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
VECTORS = json.loads(VEC.read_text())
INFERRED = {f"words57:{r['job']}:{r['words'].split(' f')[1]}": r["speciesInferred"] for r in json.loads(CHAIN.read_text())["chains"] if r.get("speciesInferred")}
# (job, consumer "<move> f<frame>", history turns before the first words body; the last one continues with the words body)
CASES = [
    ("wp-sa-opp-pidgeotto", "352 f9540", [[]]),
    ("wp-ms-opp-pidgeotto", "352 f11977", [[]]),
    ("sw-ms-opp-pidgeotto", "318 f11976", [[]]),
]
MOVES = {352: ("WATER_PULSE", 160), 318: ("SILVER_WIND", 193)}  # player-side live durations (liveMoveAnimationDuration)


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
        dirt = m.get("generalAnimation") is None and m["moveId"] in (28, 189)
        turns[-1].append(["rain"] if m.get("generalAnimation") == "RAIN_CONTINUES"
                         else ["body", m["moveId"], m["attackerSide"]] + ([INFERRED.get(m["key"], LEADS)] if dirt else []))
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
    v = next(x for x in VECTORS["vectors"] if x["job"] == job and x["consumer"] == consumer)
    assert v["afterBattleUnit"], consumer
    move_id = int(consumer.split()[0])
    move, n = MOVES[move_id]
    LEADS = v["species"]
    frame = int(v["consumer"].split("f")[1])
    frames = json.loads((RGB / f"{job}.json").read_text())["frames"]
    d, matched = offset_of(job, frames)
    A = frame - d
    markers = chain(v["marker"])
    turns, keys = steps_of(markers)
    # the consumer: the last body step of the last turn (the player's active mon)
    turns[-1].append(["body", move_id, "player"])
    full = [list(t) for t in history[:-1]] + [history[-1] + turns[0]] + turns[1:]
    by_frame = {f["frame"]: f for f in frames}
    r0 = by_frame[A]
    name = lambda s: S[r0[s]["species"]]["name"].replace("SPECIES_", "")
    pers = lambda s: r0[f"{s}Personality"]
    words = [VECTORS["words"][k] for k in keys]
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": move, "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/integration/fixtures/words59/scenarios/{job}.json", "denseWindow": {"startFrame": A, "endFrame": A + n - 1},
          "windowSource": f"window = [activation, activation + {n - 1}]; activation = words59 event-probe unit frame {frame} - offset {d} (every recorded sSpriteOrder row of the event probe equals the RGB probe's at this offset: {matched} frames)",
          "attacker": {"species": name("player"), "geometry": {"side": "player"}}, "target": {"species": name("opponent"), "geometry": {"side": "opponent"}},
          "attackerPersonality": pers("player"),
          "fieldProfile": {"playerHp": r0["player"]["hp"], "playerMaxHp": r0["player"]["maxHp"], "opponentHp": r0["opponent"]["hp"],
                           "opponentMaxHp": r0["opponent"]["maxHp"], "playerGender": gender(r0["player"]["species"], pers("player")),
                           "opponentGender": gender(r0["opponent"]["species"], pers("opponent"))},
          "wordsChain": {"turns": full, "words": [{"value": w["activationValue"], "source": f"words59 RAM gRng2Value at the activation of {k} (words59Extract.py, A == B)"} for k, w in zip(keys, words)]}}
    # a Random2 consumer (Water Pulse): its own activation value, RAM gRng2Value at its body edge (prep46Words.bodies, the words bodies' law)
    consumer_body = {b["frame"]: b for b in Wd.bodies(json.loads((P / "raw" / f"{job}-A.json").read_text()))}.get(frame)
    if move_id == 352:
        fx["presentationRngActivation"] = {"value": consumer_body["activationValue"],
                                           "source": f"words59 RAM gRng2Value at the consumer's activation (event-probe frame {frame}, A == B)"}
    path = OUT / f"{job}-{move.lower().replace('_', '')}.json"
    path.write_text(json.dumps(fx, indent=1) + "\n")
    print(job, v["consumer"], "offset", d, "matched", matched, "window", fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"],
          "turns", len(full), "words", len(words))
