#!/usr/bin/env python3
"""Live semantic smoke test for the factoryBrain battle-lab mode.

Stages Noland's silver (challenge 2) and gold (challenge 5) battles against a
running Battle Scene OFF service and checks the ROM really generated a
Frontier-Brain party: three mons at the Brain-only fixed IVs (15/31, from
sFixedIVTable[challengeNum + 2][0] — ordinary challenge-2 opponents get 9/12),
with Noland's own no-duplicate rules holding. Also re-proves the standing
rejections over the live HTTP contract.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


BASE_URL = os.environ.get("POKEBENCH_ORACLE_URL", "http://127.0.0.1:8014").rstrip("/")
failures: list[str] = []


def check(name: str, condition: bool, detail: object = None) -> None:
    if condition:
        print(f"ok   {name}")
    else:
        failures.append(name)
        print(f"FAIL {name}: {detail!r}")


def post(path: str, value: dict) -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(value).encode(),
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=600) as response:
        return json.load(response)


def post_error(path: str, value: dict) -> tuple[int, str]:
    try:
        post(path, value)
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()
    return 200, ""


# Player picks must sit in the challenge's own draft band
# (LEVEL_50_SET_RANGES: challenge 2 -> 267..371, challenge 5 -> 564..659).
PLAYER_SET_IDS = {2: [267, 268, 269], 5: [564, 565, 566]}


def brain_request(challenge_num: int, **changes) -> dict:
    value = {
        "schemaVersion": 1,
        "mode": "factoryBrain",
        "profile": "battle-scene-off",
        "level": 50,
        "challengeNum": challenge_num,
        "playerSetIds": PLAYER_SET_IDS.get(challenge_num, PLAYER_SET_IDS[2]),
        "rentalSwapCount": 0,
        "seed": 305419896,
        "trace": {"segments": [], "captureFrames": [0]},
    }
    value.update(changes)
    return value


def run_case(case: str, challenge_num: int, fixed_iv: int) -> None:
    response = post("/v1/battle-lab/run", brain_request(challenge_num))
    setup = response["battleLab"]
    check(f"{case}: mode echoed", setup["mode"] == "factoryBrain", setup.get("mode"))
    check(f"{case}: no trainerId echo", "trainerId" not in setup, sorted(setup))
    check(f"{case}: no rangeIndex echo", "rangeIndex" not in setup, sorted(setup))
    check(f"{case}: battleNum is the final battle", setup["battleNum"] == 6, setup.get("battleNum"))
    check(f"{case}: fixedIv echo", setup["fixedIv"] == fixed_iv, setup.get("fixedIv"))
    party = setup.get("opponentParty", [])
    check(f"{case}: three generated mons", len(party) == 3, len(party))
    check(
        f"{case}: all mons level 50",
        all(mon["level"] == 50 for mon in party),
        [mon["level"] for mon in party],
    )
    check(
        f"{case}: every IV is the Brain fixed IV",
        all(iv == fixed_iv for mon in party for iv in mon["ivs"].values()),
        [mon["ivs"] for mon in party],
    )
    species = [mon["species"] for mon in party]
    check(f"{case}: no duplicate species", len(set(species)) == 3, species)
    items = [mon["item"] for mon in party if mon["item"]]
    check(f"{case}: no duplicate held items", len(set(items)) == len(items), items)
    state = response["captures"][0]["state"]
    battlers = state["battlers"]
    check(
        f"{case}: both active battlers exist at frame zero",
        bool(battlers["player"]["species"]) and bool(battlers["opponent"]["species"]),
        {side: mon.get("species") for side, mon in battlers.items()},
    )
    check(
        f"{case}: opponent battler is the generated lead",
        battlers["opponent"]["species"] == species[0],
        (battlers["opponent"].get("species"), species[0]),
    )
    check(
        f"{case}: captured opponent party matches the echoed generated party",
        [mon["species"] for mon in state["parties"]["opponent"]] == species,
        ([mon["species"] for mon in state["parties"]["opponent"]], species),
    )


def main() -> int:
    info = json.load(urllib.request.urlopen(f"{BASE_URL}/v1/info", timeout=60))
    check("service profile is battle-scene-off", info.get("profile") == "battle-scene-off", info.get("profile"))
    advertised = info.get("capabilities", {}).get("battleLab", {}).get("modes", [])
    check("factoryBrain mode advertised", "factoryBrain" in advertised, advertised)

    run_case("silver", 2, 15)
    run_case("gold", 5, 31)

    code, body = post_error(
        "/v1/battle-lab/run",
        brain_request(2, trainerId=50),
    )
    check("explicit trainerId still rejected", code == 400 and "does not accept" in body, (code, body[:80]))
    code, body = post_error(
        "/v1/battle-lab/run",
        brain_request(3),
    )
    check("non-encounter challengeNum rejected", code == 400 and "silver" in body, (code, body[:80]))
    code, body = post_error(
        "/v1/battle-lab/run",
        {
            "schemaVersion": 1,
            "mode": "factoryLegal",
            "profile": "battle-scene-off",
            "level": 50,
            "challengeNum": 2,
            "battleNum": 6,
            "trainerId": 140,
            "playerSetIds": [156, 149, 180],
            "opponentSetIds": [188, 184, 135],
            "seed": 305419896,
            "trace": {"segments": [], "captureFrames": [0]},
        },
    )
    check("ordinary-mode Noland staging still rejected", code == 400 and "factoryBrain" in body, (code, body[:80]))

    print(f"\n{len(failures)} failure(s)" if failures else "\nall checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
