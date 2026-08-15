#!/usr/bin/env python3
"""Live semantic smoke test for the factoryBrain walk-up staging.

Stages the silver (challenge 2) and gold (challenge 5) walk-ups against a
running Battle Scene OFF service. The walk-up checkpoint lands with the
ask-ready multichoice open, so the descriptor's overworld echoes prove the
ROM's own post-win fragment ran (streak/battle-number increments) and that
GetFrontierBrainStatus resolved a Brain encounter — the head menu only opens
on that branch. Silver's trace then answers GO ON and swap-No and rides the
guided walk into the BattleRoom Brain entrance. Also proves the new
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


PLAYER_SET_IDS = {2: [267, 268, 269], 5: [564, 565, 566]}

# Frame 0 is the open ask-ready menu. A picks GO ON; after the "can't tell
# you anything about the FACTORY HEAD" box, DOWN+A answers the swap prompt
# No; the remaining idles ride "Right this way!", the guided walk, the warp,
# and the BattleRoom fade-in into the held "Get a move on!" box.
GO_ON_SWAP_NO_TRACE = {
    "segments": [
        {"frames": 2, "buttons": ["A"]},
        {"frames": 260, "buttons": []},
        {"frames": 2, "buttons": ["A"]},
        {"frames": 120, "buttons": []},
        {"frames": 2, "buttons": ["DOWN"]},
        {"frames": 8, "buttons": []},
        {"frames": 2, "buttons": ["A"]},
        {"frames": 200, "buttons": []},
        {"frames": 2, "buttons": ["A"]},
        {"frames": 720, "buttons": []},
    ],
    "captureFrames": [0, 1318],
}


def walkup_request(challenge_num: int, **changes) -> dict:
    value = {
        "schemaVersion": 1,
        "mode": "factoryBrain",
        "profile": "battle-scene-off",
        "level": 50,
        "challengeNum": challenge_num,
        "walkup": True,
        "playerSetIds": PLAYER_SET_IDS[challenge_num],
        "rentalSwapCount": 0,
        "seed": 305419896,
        "trace": {"segments": [], "captureFrames": [0]},
    }
    value.update(changes)
    return value


def run_case(case: str, challenge_num: int, symbols: int, **changes) -> dict:
    response = post("/v1/battle-lab/run", walkup_request(challenge_num, **changes))
    setup = response["battleLab"]
    streak = challenge_num * 7 + 6
    check(f"{case}: walkup echoed", setup.get("walkup") is True, setup.get("walkup"))
    check(f"{case}: no trainerId echo", "trainerId" not in setup, sorted(setup))
    check(
        f"{case}: no opponentParty (battle not initialized)",
        "opponentParty" not in setup,
        sorted(setup),
    )
    check(
        f"{case}: ROM post-win increments ran",
        setup.get("factoryWinStreak") == streak
        and setup.get("curChallengeBattleNum") == 6,
        (setup.get("factoryWinStreak"), setup.get("curChallengeBattleNum")),
    )
    check(
        f"{case}: factory symbol flags staged",
        setup.get("factorySymbols") == symbols,
        setup.get("factorySymbols"),
    )
    check(
        f"{case}: four-option head menu open at frame zero",
        setup.get("askReadyMenuVariant") == "record",
        setup.get("askReadyMenuVariant"),
    )
    return response


def main() -> int:
    info = json.load(urllib.request.urlopen(f"{BASE_URL}/v1/info", timeout=60))
    check(
        "service profile is battle-scene-off",
        info.get("profile") == "battle-scene-off",
        info.get("profile"),
    )
    check(
        "walk-up capability advertised",
        info.get("capabilities", {}).get("battleLab", {}).get("factoryBrainWalkup") is True,
        info.get("capabilities", {}).get("battleLab", {}),
    )

    silver = run_case("silver", 2, 0, trace=GO_ON_SWAP_NO_TRACE)
    captures = {cap["frame"]: cap for cap in silver["captures"]}
    check(
        "silver: menu and entrance captures present",
        set(captures) == {0, 1318},
        sorted(captures),
    )
    check(
        "silver: GO ON + swap-No leaves the menu for the entrance",
        captures[0]["sha256"] != captures[1318]["sha256"],
        captures[0]["sha256"][:16],
    )

    run_case("gold", 5, 1)

    code, body = post_error(
        "/v1/battle-lab/run",
        {**walkup_request(2), "mode": "factoryLegal", "battleNum": 0,
         "trainerId": 50, "opponentSetIds": [113, 114, 115],
         "playerSetIds": [110, 111, 112]},
    )
    check(
        "walkup outside factoryBrain rejected",
        code == 400 and "factoryBrain" in body,
        (code, body[:80]),
    )
    code, body = post_error(
        "/v1/battle-lab/run",
        walkup_request(
            2,
            overrides={"parties": {"player": [], "opponent": []}},
        ),
    )
    check(
        "walkup with overrides rejected",
        code == 400 and "walkup does not permit overrides" in body,
        (code, body[:80]),
    )
    code, body = post_error(
        "/v1/battle-lab/run",
        walkup_request(2, walkup=1),
    )
    check(
        "non-boolean walkup rejected",
        code == 400 and "walkup must be a boolean" in body,
        (code, body[:80]),
    )

    print(f"\n{len(failures)} failure(s)" if failures else "\nall checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
