#!/usr/bin/env python3
"""Live smoke test for BattleLab.preview_report.

Unlike battle-lab-smoke-test.py, this does not talk to a running HTTP
server: preview_report requires an oracle booted from
bootstrap/factory-pre-report.json (BOOTSTRAP.md's v2 checkpoint), not the
default anchor the shared server processes run, so it is exercised
in-process here — the same pattern this run's tools/probe/*.py scripts use
to call BattleLab directly (see e.g. tools/probe/run-battle-lab-rgb.py). A
single oracle is reused across scenarios, each call resetting via
new_session() inside preview_report() — the same reuse pattern the HTTP
smoke test gets for free from its one long-running server process.

Run with the venv python:
  ../../vendor/mgba-venv/bin/python \
    oracle/report-preview-smoke-test.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))

from battle_lab import ATTENDANT_DIALOGUE_ROUTE, BattleLab  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

_REFERENCE = _HERE.parent / "reference" / "pokeemerald"
BOOTSTRAP = _HERE / "bootstrap" / "factory-pre-report.json"
DEFAULT_BOOTSTRAP = _HERE / "bootstrap" / "factory-battle-scene-off.json"
V2_ANCHOR_SHA = "ebb6ad29cc122f04c1e64217774c784f403d821154fec407cb0166371d44874d"
V3_ANCHOR_SHA = "9c89c74113f29e7d4595571c3aceb728417c4fe441b644ec0022fb498463f297"

failures: list[str] = []
results: list[dict] = []
# mGBA's C-level logging writes to the same fd as Python's stdout when
# redirected to a file, and the two are not coordinated — captured stdout
# has been observed dropping/reordering lines. RESULTS_PATH is the
# authoritative record; read it instead of trusting captured stdout.
# main() resets it to {"done": False, "started": True, "results": []}
# before doing anything that can fail, so a crash before the first
# check() leaves an honest "started, not done" record rather than
# silently preserving a previous run's file untouched (including a
# stale prior pass). The default path is fixed and not otherwise
# namespaced — if running this concurrently with another process that
# also uses the default, pass a distinct REPORT_PREVIEW_RESULTS_PATH.
RESULTS_PATH = Path(
    os.environ.get("REPORT_PREVIEW_RESULTS_PATH", "/tmp/report-preview-smoke-results.json")
)


def check(name: str, condition: bool, detail: object = None) -> None:
    if condition:
        print(f"ok   {name}")
    else:
        failures.append(name)
        print(f"FAIL {name}: {detail!r}")
    sys.stdout.flush()
    results.append({"name": name, "ok": bool(condition), "detail": repr(detail)})
    RESULTS_PATH.write_text(
        json.dumps({"done": False, "started": True, "results": results}, indent=2)
    )


def main() -> None:
    # Written before anything that can fail (ROM/bootstrap load, mGBA
    # init) so a crash this early — a bad path, a missing ROM — leaves an
    # honest "started, not done" record instead of silently preserving
    # whatever a previous run's results file happened to contain,
    # including a stale prior pass. A prior adversarial review found the
    # old version only ever wrote from inside check(), so an early crash
    # left old data untouched and indistinguishable from a genuine
    # current pass.
    RESULTS_PATH.write_text(json.dumps({"done": False, "started": True, "results": []}, indent=2))

    oracle = EmeraldOracle(
        rom_path=_REFERENCE / "pokeemerald.gba",
        map_path=_REFERENCE / "pokeemerald.map",
        bootstrap_path=BOOTSTRAP,
    )
    # "battle-scene-on", matching factory-pre-report.json's own inherited
    # `profile` field (it's a truncation of factory.json, the scene-ON
    # anchor, not factory-battle-scene-off.json). BattleLab never reads
    # this value itself (checked: written once in __init__, unused
    # elsewhere), so this label is documentation, not a functional switch.
    lab = BattleLab(oracle, "battle-scene-on")

    check(
        "pre-report anchor matches BOOTSTRAP.md's published v2 checkpoint",
        oracle.canonical_screen_sha256 == V2_ANCHOR_SHA,
        oracle.canonical_screen_sha256,
    )

    # Drift detection: factory-pre-report.json's segments and
    # ATTENDANT_DIALOGUE_ROUTE are both static, literal copies of
    # factory.json's own segments[0:193]/[193:225] — unlike
    # factory-battle-scene-off.json, which uses a dynamic "extends":
    # "factory.json" that auto-tracks edits, nothing here auto-updates if
    # factory.json's early route is ever re-recorded. Compare against
    # factory.json's live content on every run so that drift fails loudly
    # here instead of silently producing a wrong anchor or wrong route.
    live_factory = json.loads((_HERE / "bootstrap" / "factory.json").read_text())
    live_prefix = live_factory["segments"][:193]
    pre_report_segments = json.loads(BOOTSTRAP.read_text())["segments"]
    check(
        "factory-pre-report.json's segments still match factory.json's segments[0:193]",
        pre_report_segments == live_prefix,
        {"pre_report_count": len(pre_report_segments), "live_count": len(live_prefix)},
    )
    live_dialogue = [
        (segment["frames"], tuple(segment.get("buttons", [])))
        for segment in live_factory["segments"][193:225]
    ]
    check(
        "ATTENDANT_DIALOGUE_ROUTE still matches factory.json's segments[193:225]",
        list(ATTENDANT_DIALOGUE_ROUTE) == live_dialogue,
        {"route_count": len(ATTENDANT_DIALOGUE_ROUTE), "live_count": len(live_dialogue)},
    )

    # Full-circle proof: replaying the extracted dialogue route from the new
    # anchor, plus the same 60-frame settle factory.json's own v3 anchor
    # ends with, must reproduce that already-trusted v3 anchor's canonical
    # hash exactly. This is independent of preview_report() itself — it
    # verifies the anchor truncation and the extracted route are both
    # correct by reconstructing the original from them.
    full_circle = EmeraldOracle(
        rom_path=_REFERENCE / "pokeemerald.gba",
        map_path=_REFERENCE / "pokeemerald.map",
        bootstrap_path=BOOTSTRAP,
    )
    full_circle.new_session()
    for frames, buttons in ATTENDANT_DIALOGUE_ROUTE:
        for _ in range(frames):
            full_circle.advance(list(buttons))
    for _ in range(60):
        full_circle.advance([])
    full_circle_sha = hashlib.sha256(full_circle.screen_rgb()).hexdigest()
    check(
        "pre-report anchor + extracted route reproduces the exact v3 anchor",
        full_circle_sha == V3_ANCHOR_SHA,
        full_circle_sha,
    )

    wrong_anchor_oracle = EmeraldOracle(
        rom_path=_REFERENCE / "pokeemerald.gba",
        map_path=_REFERENCE / "pokeemerald.map",
        bootstrap_path=DEFAULT_BOOTSTRAP,
    )
    wrong_anchor_lab = BattleLab(wrong_anchor_oracle, "battle-scene-off")
    try:
        wrong_anchor_lab.preview_report(seed=1)
        wrong_anchor_raised = False
    except RuntimeError:
        wrong_anchor_raised = True
    check(
        "preview_report rejects an oracle booted from the wrong anchor",
        wrong_anchor_raised,
        wrong_anchor_raised,
    )

    try:
        lab.preview_report(capture_frames={0}, capture_all_frames=True)
        both_fields_raised = False
    except ValueError:
        both_fields_raised = True
    check(
        "preview_report rejects capture_frames combined with capture_all_frames",
        both_fields_raised,
        both_fields_raised,
    )

    baseline = lab.preview_report(capture_frames={0})
    check(
        "no-seed preview reaches the default canonical opponent",
        baseline["report"]["opponentSetIds"] == [188, 184, 135],
        baseline["report"],
    )
    check(
        "preview frame zero is the untouched pre-report anchor",
        baseline["captures"][0]["sha256"] == V2_ANCHOR_SHA,
        baseline["captures"][0]["sha256"],
    )

    seed_reports = {}
    for seed in (None, 1, 42, 999999):
        seed_reports[seed] = lab.preview_report(seed=seed)["report"]
        print(f"     seed={seed} -> {seed_reports[seed]}")
        sys.stdout.flush()
    distinct_opponents = {tuple(r["opponentSetIds"]) for r in seed_reports.values()}
    distinct_reports = {(r["typeVar"], r["styleVar"]) for r in seed_reports.values()}
    check(
        "different seeds produce genuinely different real opponents",
        len(distinct_opponents) == len(seed_reports),
        seed_reports,
    )
    check(
        "different seeds produce different real report content",
        len(distinct_reports) > 1,
        seed_reports,
    )

    reseed_a = lab.preview_report(seed=1)["report"]
    reseed_b = lab.preview_report(seed=1)["report"]
    check(
        "the same seed reproduces the same real opponent and report",
        reseed_a == reseed_b,
        (reseed_a, reseed_b),
    )

    dense = lab.preview_report(seed=1, capture_all_frames=True)
    frames = [c["frame"] for c in dense["captures"]]
    check(
        "capture_all_frames captures every frame of the dialogue route densely",
        frames == list(range(len(frames))) and len(frames) == 2917,
        {"count": len(frames)},
    )

    sparse = lab.preview_report(capture_frames={0, 1802, 2916})
    sparse_frames = [c["frame"] for c in sparse["captures"]]
    check(
        "explicit capture_frames lands at exactly the requested frames, in order",
        sparse_frames == [0, 1802, 2916],
        sparse_frames,
    )
    check(
        "captures carry well-formed hashes and PNG data",
        all(
            len(c["sha256"]) == 64 and len(c["pngBase64"]) > 0
            for c in sparse["captures"]
        ),
        [(c["frame"], len(c["sha256"]), len(c["pngBase64"])) for c in sparse["captures"]],
    )

    RESULTS_PATH.write_text(
        json.dumps({"done": True, "started": True, "results": results}, indent=2)
    )
    if failures:
        print(f"\nreport-preview smoke test FAILED ({len(failures)}): {', '.join(failures)}")
        sys.stdout.flush()
        sys.exit(1)
    print("\nreport-preview smoke test passed")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
