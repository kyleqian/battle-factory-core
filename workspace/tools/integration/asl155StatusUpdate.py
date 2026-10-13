#!/usr/bin/env python3
"""asl155: record the Extrasensory 326 player later-body D4 entry in docs/animation-integration-live-status.json (faithfulTimingAdapters id 326):
timingParameters = liveMoveTimingPolicy.ts 326 (without evidence), the player later windows' documented residual (asl155-windows-b.json), and
the evidence / proof lines. Idempotent; only the 326 entry's text is rewritten (json.dumps indent 2 at its nesting level), the rest of the file
is kept byte for byte.
usage: asl155StatusUpdate.py   (from workspace/)"""
import json, subprocess
from pathlib import Path

P = Path("docs/animation-integration-live-status.json")
text = P.read_text()
d = json.loads(text)
params = json.loads(subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e",
    "import('./src/engine/liveMoveTimingPolicy.ts').then((m) => console.log(JSON.stringify(m.LIVE_MOVE_TIMING_POLICY[326].parameters"
    ".map(({ evidence, ...p }) => p))))"], check=True, capture_output=True, text=True).stdout)
rows = {r["fixture"]: r for r in json.loads(Path("tools/integration/fixtures/asl155/asl155-windows-b.json").read_text())["rows"]}
policy = {w["fixture"]: w for w in json.loads(Path("tools/integration/fixtures/asl155/asl155-xs-policy.json").read_text())["windows"]}
LAG = list(range(143, 159))
e = next(a for a in d["faithfulTimingAdapters"] if a["id"] == 326)
e["timingParameters"] = params
windows = e["alternatePhaseResidual"]["windows"]
for name in ["xs-pla-nuzleaf-shuckle-xs-1", "xs-pla-nuzleaf-shuckle-qa-2", "xs-pla-nuzleaf-shuckle-qa-0", "xs-pla-nuzleaf-shuckle-qa-1"]:
    r = rows[f"{name}.json"]; split = policy[f"{name}.json"]["policyAges"]
    lag = r["timing"]["measured"]["optional-lag-age"] == "no-event"
    ages = split + (LAG if lag else [])
    windows[f"asl155-player-later-{name}"] = {"ages": ages, "rows": len(ages), "pixels": r["runs"][0]["residualPixels"],
        "cause": "scanline-split-line (player later, S = 0 policy): the ROM split S >= 27 on the listed distortion rows (ord149 B1: S is a CPU phase; "
                 "fixtures/asl155/asl155-xs-policy.json)" + ("; optional-lag-age: a measured no-lag window under the player later lag policy (rows 143..158)" if lag else "")}
EV = "asl155 (docs/asl155-astonish-extrasensory-live.md): a PLAYER attacker's later body is live (history known, non-elevated target, first visible monbg line >= 27): player later lag policy 9 : 2 (scan93) + S = 0 on every row (ord149 xs per-row dominant class 69 / 69, fitted row 0 of 5); dense tools/integration/fixtures/asl155/asl155-windows-b.json (12 later SHUCKLE windows live: 5 at 0 px, the rest only on the documented rows); GOLEM-class (line 18), CROBAT (elevated) and DD-history later bodies decline"
e["evidence"] = [x for x in e["evidence"] if not x.startswith("asl155")] + [EV]
CMD = "sh tools/integration/asl155Run.sh .integration/validation/<fresh>  # asl155: census + dense windows of the player later bodies"
e["proofCommands"] = [x for x in e["proofCommands"] if "asl155Run" not in x] + [CMD]
# the entry's span: from its "{" line (4 spaces) to the matching "}" line at the same indentation
start = text.index('    {\n      "id": 326,\n      "move": "MOVE_EXTRASENSORY"')
end = text.index("\n    }", start) + len("\n    }")
body = "\n".join("    " + line for line in json.dumps(e, indent=2, ensure_ascii=False).split("\n"))
P.write_text(text[:start] + body + text[end:])
assert json.loads(P.read_text()) == d
print(f"326: {len(params)} timing parameters, {len(windows)} residual windows")
