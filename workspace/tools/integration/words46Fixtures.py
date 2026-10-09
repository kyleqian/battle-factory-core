#!/usr/bin/env python3
"""words46 dense consumer fixtures (S10A; docs/next-adapters-prep46.md): consumers AFTER a Random2-words order unit, from fresh direct-mGBA
run-battle-lab-rgb.py outputs of the prep46 scenarios (tools/integration/fixtures/words46/scenarios/). The consumer's activation frame A (RGB
frame index) = its prep46 unit frame - the job's offset; the offset is fixed by the job's FIRST words body: its first dirt sprite exists in RAM
at A1 + 9 (Mud-Slap first wave row) / A1 + 12 (Sand-Attack). Window = [A, A + rows - 1]. Field profile (HP, genders, personality) from the
probe row at A. Presentation words: the RAM-read activation values (prep46-units.json, prep46Words.py), pinned per unit (wordsChain).
usage: words46Fixtures.py PROBEDIR   (PROBEDIR holds <job>.json from run-battle-lab-rgb.py)"""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
S = {s["id"]: s for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
U = json.loads((R / "tools/integration/fixtures/words46/prep46-units.json").read_text())["jobs"]
ROWS = {28: 58, 189: 51}
NAMES = {28: "SAND_ATTACK", 189: "MUD_SLAP"}
def gender(sp, pers):
    r = S[sp]["genderRatio"]
    return "none" if r == 255 else "female" if r == 254 else "male" if r == 0 else ("male" if (pers & 255) >= r else "female")
# (job, consumer body index among the job's words bodies, turns): the consumer is the LAST body step of the last turn
CASES = [
    ("ms-opp-onix", 1, [[["body", 189, "opponent"], ["hit", "player"], ["stat", "player", 20]], [["body", 189, "opponent"]]]),
    ("ms-ply-onix", 1, [[["body", 189, "player"], ["hit", "opponent"], ["stat", "opponent", 20], ["body", 225, "opponent"], ["hit", "player"]],
                        [["body", 189, "player"]]]),
    ("sa-ply-nosepass", 1, [[["body", 28, "player"], ["stat", "opponent", 20]], [["body", 28, "player"]]]),
    ("sa-opp-lickitung", 1, [[["body", 28, "opponent"], ["stat", "player", 20], ["body", 21, "player"], ["hit", "opponent"]], [["body", 28, "opponent"]]]),
    ("sa-opp-onix", 1, [[["body", 28, "opponent"], ["stat", "player", 20], ["body", 157, "player"], ["hit", "opponent"]], [["body", 28, "opponent"]]]),
]
out = R / "tools/integration/fixtures/words46/live"; out.mkdir(parents=True, exist_ok=True)
for job, k, turns in CASES:
    j = U[job]; frames = json.loads((D / f"{job}.json").read_text())["frames"]
    words = [u for u in j["units"] if u["kind"] == "body" and u.get("draws")]
    mv = words[0]["mv"]; key = "mudSlapMudSprites" if mv == 189 else "sandAttackDirtSprites"
    first = next(f["frame"] for f in frames if f["frame"] > 0 and f.get(key))
    a1 = first - (9 if mv == 189 else 12)
    offset = words[0]["frame"] - a1
    body = words[k]; A = body["frame"] - offset; n = ROWS[body["mv"]]
    r0 = frames[A]; side = j["attackerSide"]; foe = "opponent" if side == "player" else "player"
    name = lambda s: S[r0[s]["species"]]["name"].replace("SPECIES_", "")
    pers = lambda s: r0[f"{s}Personality"]
    fx = {"schema": "s10a-live-adapter-fixture/v1", "move": NAMES[body["mv"]], "probe": "tools/probe/run-battle-lab-rgb.py",
          "scenario": f"tools/integration/fixtures/words46/scenarios/{job}.json", "denseWindow": {"startFrame": A, "endFrame": A + n - 1},
          "windowSource": f"window = [activation, activation + {n - 1}]; activation = prep46 unit frame {body['frame']} - offset {offset} (the job's first words body's first {key} row at A1 + {9 if mv == 189 else 12}, A1 = {a1})",
          "attacker": {"species": name(side), "geometry": {"side": side}}, "target": {"species": name(foe), "geometry": {"side": foe}},
          "attackerPersonality": pers(side),
          "fieldProfile": {"playerHp": r0["player"]["hp"], "playerMaxHp": r0["player"]["maxHp"], "opponentHp": r0["opponent"]["hp"],
                           "opponentMaxHp": r0["opponent"]["maxHp"], "playerGender": gender(r0["player"]["species"], pers("player")),
                           "opponentGender": gender(r0["opponent"]["species"], pers("opponent"))},
          "presentationRngActivation": {"value": body["activationValue"], "source": f"prep46Words.py RAM gRng2Value at the activation of {job} body f{body['frame']} (prep46-units.json)"},
          "wordsChain": {"turns": turns, "words": [{"value": w["activationValue"], "source": f"prep46Words.py RAM gRng2Value at the activation of {job} body f{w['frame']}"} for w in words[:k]]}}
    (out / f"{job}-b{k + 1}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(job, f"b{k + 1}", fx["denseWindow"], "offset", offset, fx["fieldProfile"])
