#!/usr/bin/env python3
"""Golden-hash smoke test for the factory oracle service.

Run with the service up (./run-oracle.sh):  python3 oracle/smoke-test.py
Pins the bootstrap-v3 canonical anchor (the Lv-50 single challenge's rental
draft screen, cursor on slot 1 = ONIX) and a cursor-RIGHT trace (slot 2 =
MAGBY). Regenerate the pins ONLY for a deliberate, documented bootstrap bump
(update BOOTSTRAP.md and the version in bootstrap/factory.json together —
and note the rental pool is RNG-derived from the exact input prefix, so ANY
upstream frame change reshuffles it).
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.client import HTTPConnection
from urllib.parse import urlparse

BASE_URL = os.environ.get("POKEBENCH_ORACLE_URL", "http://127.0.0.1:8012").rstrip("/")

BOOTSTRAP_VERSION = 5
EXPECTED_PROFILE = os.environ.get("POKEBENCH_EXPECTED_ORACLE_PROFILE", "battle-scene-on")
CANONICAL_SHA = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"
CURSOR_TRACE = {
    "segments": [
        {"frames": 6, "buttons": ["RIGHT"]},
        {"frames": 20, "buttons": []},
    ],
    "captureFrames": [0, 26],
}
CURSOR_SLOT2_SHA = "f98116c078fce6458b46917d833dd2a52ec904a307c7252aed034872ba047f1b"
SYMBOL_PINS = {"gSaveBlock1Ptr": "0x3005d8c", "gMain": "0x30022c0"}

failures = []


def check(name: str, actual, expected) -> None:
    if actual == expected:
        print(f"ok   {name}")
    else:
        failures.append(name)
        print(f"FAIL {name}: expected {expected!r}, got {actual!r}")


def get(path: str):
    with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=120) as response:
        return json.load(response)


def get_error(path: str) -> tuple[int, dict]:
    try:
        get(path)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)
    raise AssertionError("request unexpectedly succeeded")


def post(path: str, value) -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(value).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.load(response)


def post_with_raw_content_length(length: str) -> tuple[int, dict]:
    parsed = urlparse(BASE_URL)
    connection = HTTPConnection(parsed.hostname, parsed.port, timeout=10)
    connection.request(
        "POST",
        "/v1/run",
        headers={"content-length": length, "content-type": "application/json"},
    )
    response = connection.getresponse()
    value = json.loads(response.read())
    connection.close()
    return response.status, value


def main() -> None:
    check("health", get("/health").get("ok"), True)

    info = get("/v1/info")
    check("oracle profile", info.get("profile"), EXPECTED_PROFILE)
    check("bootstrap version", info["bootstrap"]["version"], BOOTSTRAP_VERSION)
    check("bootstrap profile", info["bootstrap"].get("profile"), EXPECTED_PROFILE)
    check("save file", info["bootstrap"]["saveFile"], "factory.sav")
    check("canonical screen sha", info["bootstrap"]["canonicalScreenSha256"], CANONICAL_SHA)

    result = post("/v1/run", CURSOR_TRACE)
    shas = {capture["frame"]: capture["sha256"] for capture in result["captures"]}
    check("anchor frame 0 (draft screen, slot 1 ONIX)", shas.get(0), CANONICAL_SHA)
    check("frame 26 (cursor on slot 2 MAGBY)", shas.get(26), CURSOR_SLOT2_SHA)

    names = "&".join(f"name={name}" for name in SYMBOL_PINS)
    symbols = get(f"/v1/symbols?{names}")["symbols"]
    for name, address in SYMBOL_PINS.items():
        check(f"symbol {name}", symbols.get(name), address)

    invalid_limit_status, invalid_limit = get_error("/v1/symbols?prefix=gMain&limit=abc")
    check("symbol prefix invalid limit status", invalid_limit_status, 400)
    check("symbol prefix invalid limit error", invalid_limit.get("error"), "limit must be a positive integer")
    zero_limit_status, zero_limit = get_error("/v1/symbols?prefix=gMain&limit=0")
    check("symbol prefix zero limit status", zero_limit_status, 400)
    check("symbol prefix zero limit error", zero_limit.get("error"), "limit must be a positive integer")

    negative_length_status, negative_length = post_with_raw_content_length("-1")
    check("negative content-length status", negative_length_status, 400)
    check(
        "negative content-length error",
        negative_length.get("error"),
        f"content-length must be from 0 to {1_000_000}",
    )

    if failures:
        print(f"\nsmoke test FAILED ({len(failures)}): {', '.join(failures)}")
        sys.exit(1)
    print("\nsmoke test passed")


if __name__ == "__main__":
    main()
