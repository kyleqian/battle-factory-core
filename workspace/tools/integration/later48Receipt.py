#!/usr/bin/env python3
"""later48: tools/integration/fixtures/later48-live-receipt.json (Dig 91 / Return 216 later-body gates; no RGB).

usage: later48Receipt.py <later48-probe-r1> <prep48-probe-dir> <later48-check-dir> <prep48-check-dir> [census-delta.json]
- allocator: at every Dig / Return activation of the later48 probes (non-net-zero predecessors) the ROM tile bitmap, sprite palette
  tags, OAM matrix bitmap and live task list vs the battle's first body of the same move;
- windows: the later48 + prep48 production-renderer checks (prep48DigCheck.ts, two fresh probes per fixture);
- pinned: ROM RGB sha256 per row of the dense window for the Tier-2 test fixtures (tests/animation/later48LiveGates.test.ts).
"""
import json, sys
from pathlib import Path

r1, p48, c48l, c48 = (Path(a) for a in sys.argv[1:5])
census = json.loads(Path(sys.argv[5]).read_text()) if len(sys.argv) > 5 else None
KEYS = ("tileBitmapSha", "paletteTags", "matrixBitmap", "tasks")
act = same = tags = 0
for f in sorted(r1.glob("*.json")):
    bs = [b for b in json.loads(f.read_text())["bodies"] if b["label"] in ("Move_DIG", "Move_RETURN")]
    for b in bs:
        act += 1; same += all(b["at"][k] == bs[0]["at"][k] for k in KEYS); tags += b["at"]["tileTagsSha"] == bs[0]["at"]["tileTagsSha"]
PIN = {  # fixture -> (fixture dir, probe dir)
    **{n: ("tools/integration/fixtures/prep48/dig-live", p48) for n in (
        "dig-opp-vibrava-chansey-qa4-dig2-setup", "dig-opp-vibrava-chansey-qa4-dig3-unleash", "dig-ply-flygon-golem-first4-dig2-setup")},
    **{n: ("tools/integration/fixtures/prep48/return-live", p48) for n in (
        "return-opp-snorlax-golem-growl3-return1", "return-ply-snorlax-golem-qa3-return1")},
    **{n: ("tools/integration/fixtures/later48/dig-live", r1) for n in (
        "dig-ply-flygon-golem-wisp-dig2-setup", "dig-opp-vibrava-chansey-toxic-dig3-unleash")},
    "return-opp-snorlax-golem-wisp-return1": ("tools/integration/fixtures/later48/return-live", r1),
}
pinned = {}
for name, (fdir, pdir) in PIN.items():
    fx = json.loads(Path(fdir, name + ".json").read_text())
    probe = json.loads((pdir / Path(fx["scenario"]).name).read_text())
    sha = {fr["frame"]: fr["sha256"] for fr in probe["frames"]}
    w = fx["denseWindow"]
    pinned[name] = {"fixture": f"{fdir}/{name}.json", "rows": [[f - w["startFrame"], f, sha[f]] for f in range(w["startFrame"], w["endFrame"] + 1)]}
windows = {}
for label, d in (("later48", c48l), ("prep48", c48)):
    for k in ("dig", "return"):
        rows = json.loads((d / f"{k}-check-after.json").read_text())
        rs = rows["rows"]
        windows[f"{label}-{k}"] = {
            "fixtures": len(rs), "probeR1EqualsR2": f"{sum(p['same'] for p in rows['probeDeterminism'])}/{len(rows['probeDeterminism'])}",
            "live0pxTwice": sum(1 for r in rs if r["live"] and all(x["residualPixels"] == 0 for x in r["runs"])),
            "laterLive0pxTwice": sum(1 for r in rs if not r["firstBody"] and r["live"] and all(x["residualPixels"] == 0 for x in r["runs"])),
            "liveNonZero": [r["fixture"] for r in rs if r["live"] and any(x["residualPixels"] for x in r["runs"])],
            "declined": [r["fixture"] for r in rs if not r["live"]]}
out = {
    "schema": "later48-live-receipt/v1",
    "gates": {"dig91": "known lend AND (firstBody OR afterDigSetup OR both species front-idle rests {0,0})",
              "return216": "known lend AND (firstBody OR both species front-idle rests {0,0}) AND non-shiny"},
    "allocatorConcern": {
        "verdict": "(ii): pixels independent of the allocator host's historyKnown; (i) not expressible in the grant (spriteAllocatorInput is only "
                   "lent to the six PLANS wall consumers, never to 91 / 216)",
        "predecessors": "Will-O-Wisp 261 (not in LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS) + Status_Burn; Toxic 92 + Status_Poison (status "
                        "animations: crossedUnknownGraphics); prep48 already had Growl 45 / Splash 150 / Return 216 (none audited)",
        "activations": act, "tileBitmapPaletteTagsMatrixTasksEqualFirstBody": same, "tileTagTableEqualFirstBody": tags},
    "windows": windows, "census": census, "pinned": pinned,
}
Path("tools/integration/fixtures/later48-live-receipt.json").write_text(json.dumps(out, indent=0, separators=(",", ":")) + "\n")
print(json.dumps({k: v for k, v in out.items() if k not in ("pinned",)}, indent=1)[:3000])
