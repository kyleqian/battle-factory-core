#!/usr/bin/env python3
"""Generate the r3 profile live-adapter dense fixtures (Lovely Kiss 142, Spikes 191, Octazooka 190) from fresh direct-mGBA
prep22Probe.py outputs (prep22Probes.sh DIR 1 <scenarios> -> DIR/<scenario>-r1.json).  Window = [activation, activation + rows - 1];
the Lovely Kiss pinned activation value is the probe's gRng2Value at the activation frame (never a word array).
usage: r3ProfileFixtures.py PROBEDIR   -> tools/integration/fixtures/r3-profile-live/*.json"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = {"LOVELY_KISS": (142, 152), "SPIKES": (191, 113), "OCTAZOOKA": (190, 79), "SIGNAL_BEAM": (324, None)}  # Signal Beam rows: 145 (player attacker) / 144 (opponent)
CASES = [  # (move, tag, scenario, attacker side)
    ("LOVELY_KISS", "lovely-kiss-player-jynx-opponent-onix", "mechanic-lovely-kiss-player-jynx-opponent-onix", "player"),
    ("LOVELY_KISS", "lovely-kiss-opponent-jynx-player-onix", "mechanic-lovely-kiss-opponent-jynx-player-onix", "opponent"),
    ("LOVELY_KISS", "lovely-kiss-alt-player-hypno-golem", "prep22-lovely-kiss-alt-player-hypno-golem", "player"),
    ("LOVELY_KISS", "lovely-kiss-alt-opponent-hypno-golem", "prep22-lovely-kiss-alt-opponent-hypno-golem", "opponent"),
    ("SPIKES", "spikes-player-qwilfish-opponent-onix", "mechanic-spikes-player-qwilfish-opponent-onix", "player"),
    ("SPIKES", "spikes-opponent-qwilfish-player-onix", "mechanic-spikes-opponent-qwilfish-player-onix", "opponent"),
    ("SPIKES", "spikes-alt-player-forretress-golem", "prep22-spikes-alt-player-forretress-golem", "player"),
    ("SPIKES", "spikes-alt-opponent-forretress-golem", "prep22-spikes-alt-opponent-forretress-golem", "opponent"),
    ("OCTAZOOKA", "octazooka-player-octillery-opponent-onix", "mechanic-octazooka-player-octillery-opponent-onix", "player"),
    ("OCTAZOOKA", "octazooka-opponent-octillery-player-onix", "mechanic-octazooka-opponent-octillery-player-onix", "opponent"),
    ("OCTAZOOKA", "octazooka-alt-player-kingler-golem", "prep22-octazooka-alt-player-kingler-golem", "player"),
    ("OCTAZOOKA", "octazooka-alt-opponent-kingler-golem", "prep22-octazooka-alt-opponent-kingler-golem", "opponent"),
]
CASES += [
    ("SIGNAL_BEAM", "signal-beam-player-ariados-opponent-chansey", "mechanic-signal-beam-player-ariados-opponent-chansey", "player"),
    ("SIGNAL_BEAM", "signal-beam-opponent-ariados-player-chansey", "mechanic-signal-beam-opponent-ariados-player-chansey", "opponent"),
    ("SIGNAL_BEAM", "signal-beam-alt-player-venomoth-golem", "prep22-signal-beam-alt-player-venomoth-golem", "player"),
    ("SIGNAL_BEAM", "signal-beam-alt-opponent-venomoth-golem", "prep22-signal-beam-alt-opponent-venomoth-golem", "opponent"),
]
extra = Path(__file__).parent / "r3ProfileExtraCases.json"
if extra.exists():
    CASES += [tuple(c) for c in json.loads(extra.read_text())]
def status(v):
    return "sleep" if v & 7 else "poison" if v & 0x88 else "burn" if v & 0x10 else "freeze" if v & 0x20 else "paralysis" if v & 0x40 else "none"
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
out = R / "tools/integration/fixtures/r3-profile-live"
out.mkdir(exist_ok=True)
for move, tag, scen, side in CASES:
    p = json.loads((D / f"{scen}-r1.json").read_text())
    mid, rows = MOVES[move]
    if rows is None:
        rows = 145 if side == "player" else 144
    bodies = p["bodies"]
    idx = next(i for i, b in enumerate(bodies) if b["move"] == mid)
    body = bodies[idx]
    A = body["start"]
    m = body["atActivation"]["mons"]
    foe = "opponent" if side == "player" else "player"
    sp = {"player": m[0], "opponent": m[1]}
    name = lambda x: S[x["species"]]["name"].replace("SPECIES_", "")
    fx = {
        "schema": "r3-profile-live-adapter-fixture/v1", "move": move,
        "probe": "tools/probe/run-battle-lab-rgb.py", "scenario": f"tools/battle-lab/{scen}.json",
        "denseWindow": {"startFrame": A, "endFrame": A + rows - 1},
        "windowSource": f"window = [activation, activation + {rows} - 1] from a fresh prep22Probes.sh run",
        "attacker": {"species": name(sp[side]), "geometry": {"side": side}},
        "target": {"species": name(sp[foe]), "geometry": {"side": foe}},
        "attackerPersonality": sp[side]["personality"],
        "displayedStatus": {"player": status(m[0]["status1"]), "opponent": status(m[1]["status1"])},
        "fieldProfile": {"playerHp": m[0]["hp"], "playerMaxHp": m[0]["maxHP"], "opponentHp": m[1]["hp"], "opponentMaxHp": m[1]["maxHP"],
                         "playerGender": gender(m[0]["species"], m[0]["personality"]), "opponentGender": gender(m[1]["species"], m[1]["personality"])},
    }
    pre = [{"moveId": b["move"], "side": "player" if b["atActivation"]["attacker"] == 0 else "opponent"} for b in bodies[:idx] if b["move"] != 0]
    if pre:
        fx["precedingBodies"] = pre
    if move == "LOVELY_KISS":
        fx["presentationRngActivation"] = {"value": body["atActivation"]["rng2"], "source": f"prep22Probe {scen} gRng2Value at activation frame {A}"}
    (out / f"{tag}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(tag, fx["denseWindow"], fx["attacker"]["species"], "->", fx["target"]["species"], pre)
