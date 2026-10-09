#!/usr/bin/env python3
"""Live audit 15: coverage grid + totals from the receipts (receipts/main + receipts/entry).
usage: audit15Coverage.py <receipt-dir>   (prints markdown)
A cell is `<live windows 0 px>/<windows>`; `D` = the production adapter declined (fallback, no live claim); `d<k>` = k of the 0-px windows
DISCRIMINATE the lend (their entry-lend control, the same window with the consumer as the first body, is non-zero); `n` = lend-neutral only."""
import collections, glob, json, sys

R = sys.argv[1]
rows = lambda p: [r for f in sorted(glob.glob(f"{R}/{p}/check-*.json")) for r in json.loads(open(f).read())["rows"]]
main, entry = rows("main"), {r["fixture"]: r for r in rows("entry")}
UNIT = {"brn": "Will-O-Wisp + BRN", "hydro-pump": "Hydro Pump", "fire-spin": "Fire Spin + TURN_TRAP", "petal-dance": "Petal Dance (retained)",
        "dig": "Dig unleash (retained)", "double-team": "Double Team + stat", "ice-beam": "Ice Beam", "faint-attack": "Faint Attack",
        "swift": "Swift", "icy-wind": "Icy Wind + stat", "solar-beam": "Solar Beam (retained unleash)", "giga-drain": "Giga Drain",
        "tackle": "Tackle", "ctl": "control (first body; later = after own consumer)"}
cells = collections.defaultdict(lambda: [0, 0, 0, 0])  # zero, total, declined, discriminating
for r in main:
    name = r["fixture"]
    pair = "EXEGGCUTE/ONIX" if name.startswith("acc-") else "SNORLAX/CHANSEY"
    stem = name[4:] if name.startswith("acc-") else name
    unit = next(k for k in UNIT if stem.startswith(k + "-"))
    c = cells[(UNIT[unit], r["move"], r["side"], pair)]
    c[1] += 1
    if not r["live"]:
        c[2] += 1
    elif r["residualPixels"] == 0:
        c[0] += 1
        e = entry.get(name)
        if e and e.get("residualPixels", 0) > 0:
            c[3] += 1
print("| unit | consumer | consumer side | species (unit / consumer side) | chain windows 0 px / total | lend-discriminating |")
print("|---|---|---|---|---|---|")
for (unit, move, side, pair), (z, t, d, disc) in sorted(cells.items()):
    print(f"| {unit} | {move} | {side} | {pair} | {z}/{t}{f' ({d} declined)' if d else ''} | {disc if disc else '-'} |")
live = [r for r in main if r["live"]]
print(f"\nwindows {len(main)}, live {len(live)} (0 px {sum(r['residualPixels'] == 0 for r in live)}), declined {len(main) - len(live)}, "
      f"r1 == r2 {all(r['digests'][0] == r['digests'][1] for r in main)}; lend-discriminating 0-px windows "
      f"{sum(1 for r in live if r['residualPixels'] == 0 and entry.get(r['fixture'], {}).get('residualPixels', 0) > 0)}")
