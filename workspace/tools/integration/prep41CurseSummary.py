#!/usr/bin/env python3
"""prep41: Ghost Curse P1 phase receipt. usage: prep41CurseSummary.py <curseProbeDir> <counterDir> <out.json>
Per scenario (2 fresh runs each of cursePaletteTimingProbe.py and speciesAudit2Counters.py, asserted identical): the CurseGhost body
(activation .. first inactive), its lag ages, the first-Step2 body row (probe targetFrame - activation) and the palette-transfer scanline
(firstPostTransferScanline = REG_VCOUNT + HBlank at BeginNormalPaletteFade's CpuSet). Tallies the scanlines."""
import collections, hashlib, json, sys
from pathlib import Path

pdir, cdir, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
windows, ok = [], True
for f in sorted(pdir.glob("*.run0.json")):
    stem = f.name[:-len(".run0.json")]
    p = [json.loads((pdir / f"{stem}.run{r}.json").read_text()) for r in (0, 1)]
    c = [json.loads((cdir / f"{stem}.run{r}.json").read_text()) for r in (0, 1)]
    cd = [hashlib.sha256(json.dumps(x["rows"]).encode()).hexdigest()[:16] for x in c]
    same = p[0] == p[1] and cd[0] == cd[1]
    ok &= same
    cols, rows = c[0]["cols"], c[0]["rows"]
    a, m, pt = cols.index("animActive"), cols.index("animMove"), cols.index("playTimeVBlanks")
    active = [r[0] for r in rows if r[a] == 1 and r[m] == 174]
    start = active[0]
    end = start
    while end + 1 in set(active): end += 1
    fi = end + 1
    lags = [i - start for i in range(start, fi + 1) if rows[i][pt] == rows[i - 1][pt]]
    ev = p[0]["transfer"]["events"][0]
    target = p[0]["sourceDiscovery"]["targetFrame"]
    scen = json.loads(Path(p[0]["scenario"]).read_text()) if Path(p[0]["scenario"]).is_file() else None
    windows.append({"scenario": stem, "activation": start, "firstInactive": fi, "rows": fi - start + 1, "lagAges": lags,
                    "step2Frame": target, "step2BodyRow": target - start, "vcount": ev["vcountBefore"], "inHBlank": ev["inHBlankBefore"],
                    "firstPostTransferScanline": ev["firstPostTransferScanline"], "freshRunsIdentical": same})
    print(stem, windows[-1])
tally = collections.Counter(w["firstPostTransferScanline"] for w in windows)
res = {"schema": "prep41-curse-p1/v1", "method": "tools/integration/prep41CurseProbes.sh + prep41CurseCounters.sh (2 fresh direct-mGBA runs each; no framebuffer read)",
       "scanlineTally": {str(k): v for k, v in sorted(tally.items())}, "allIdentical": ok, "windows": windows}
out.write_text(json.dumps(res, indent=1) + "\n")
print("tally", dict(sorted(tally.items())), "allIdentical", ok)
sys.exit(0 if ok else 1)
