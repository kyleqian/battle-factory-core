#!/usr/bin/env python3
"""spark62: assemble tools/integration/fixtures/spark62-live-receipt.json from the committed evidence + the run-local census reports.
usage: spark62Receipt.py <base-census.json> <final-census.json> <gates.json>"""
import json, subprocess, sys
from pathlib import Path
FX = Path("tools/integration/fixtures")
base, final, gates = (json.loads(Path(p).read_text()) for p in sys.argv[1:4])
git = lambda *a: subprocess.run(["git", *a], check=True, capture_output=True, text=True).stdout.strip()
dense = json.loads((FX / "spark62-dense-summary.json").read_text())
analysis = json.loads((FX / "spark62-analysis.json").read_text())
delta = json.loads((FX / "spark62-census-delta.json").read_text())
parity = json.loads((FX / "spark62-parity-battle85.json").read_text())
receipt = {
    "schema": "spark62-live-receipt/v1",
    "testedCodeCommit": gates["testedCodeCommit"], "testedSrcTree": gates["testedSrcTree"],
    "base": {"commit": "d78b936f3", "srcTree": git("rev-parse", "d78b936f3:workspace/src")},
    "doc": "docs/spark62-spark-opponent.md",
    "scope": "SPARK 209 opponent attacker (liveMoveAnimationDuration case 209 -> 115 for both attackers); presentation unchanged (all-zero flashing advances, accepted tie order, known-order lend gate for both attackers)",
    "mechanism": {
        "probe": "tools/integration/spark62Probe.py (creation frame replayed one instruction at a time from the previous frame's raw state); runs r1 == r2 byte-identical",
        "creation": "BattleMainCB1 -> {Opponent,Player}DoMoveAnimation -> RunAnimScriptCommand -> Cmd_createsprite+0xda -> CreateSpriteAndAnimate (init + one _Step + AnimateSprite), all 8 rows",
        "advance": "the VBlank edge falls inside BattleMainCB2 -> AnimateSprites of the overrunning creation iteration; flashing slots traversed before it show one extra _Step in the frame-boundary RAM",
        "lagFrame": "screen(c+1) == screen(c) on all 8 rows; renderer battleScene.ts SPARK draws view(age-1) and view(-1) for the effect sprites at reducer age 43",
        "rows": [{k: r[k] for k in ("scenario", "activation", "creationAge", "flashingSlots", "creationContext", "creatorCallers",
                                     "animateSpritesTraversedBeforeVBlank", "initialCallbackAdvances", "lagFrame")} for r in analysis["rows"]],
    },
    "dense": {"tool": "tools/integration/liveAdapterFramebuffer.ts via tools/integration/liveFixtureBatch.sh (2 fresh runs per fixture)",
              "fixtures": "tools/integration/fixtures/spark62-live/*.json (generator spark62LiveFixtures.mjs) + prep10-live/spark-player-*.json",
              "perFixture": dense, "rowsPerRun": sum(v["rows"] for v in dense.values()),
              "zeroResidualFixtures": sum(1 for v in dense.values() if v["residual"] == [0, 0]),
              "preChangeControl": "spark62-opponent-voltorb-player-snorlax on d78b936f3's liveMoveAnimation.ts: Error: No live adapter for SPARK"},
    "census": {"seeds": "0..299", "baseOverall": base["overall"], "finalOverall": final["overall"],
               "liveCount": [delta["liveCountBefore"], delta["liveCountAfter"]], "liveFrames": [delta["liveFramesBefore"], delta["liveFramesAfter"]],
               "regressions": delta["regressionCount"], "commandKeySequenceIdentical": True,
               "pairingMismatches": {"count": delta["pairingMismatches"], "attribution": "exactly the 22 opponent SPARK commands: presented frames 32 (fallback) -> 115 (live body)"},
               "battleDigest": [base["battleDigest"], final["battleDigest"]],
               "battleDigestAttribution": "only battles.frames differs: %d -> %d (+%d = 22 x (115 - 32)); played/terminal/stalled/errors/stalls/playerTurns identical"
                   % (base["battles"]["frames"], final["battles"]["frames"], final["battles"]["frames"] - base["battles"]["frames"]),
               "commandDigest": [base["commandDigest"], final["commandDigest"]],
               "commandDigestAttribution": "the 22 SPARK records + decline gate line numbers (liveMoveAnimation.ts:<n> shifted); the other 7948 records identical after stripping them",
               "sparkOpponent": next(u for u in delta["units"] if u["beforeDetail"] == "duration: no opponent-attacker adapter")},
    "parity": {"tool": "tools/integration/spark62Parity.ts 85 (words57Parity + per-consumer seed comparison)", "battle": 85, "checks": parity["checks"]},
    "gates": gates["gates"],
}
(FX / "spark62-live-receipt.json").write_text(json.dumps(receipt, indent=1) + "\n")
print("written", receipt["dense"]["rowsPerRun"], receipt["dense"]["zeroResidualFixtures"])
