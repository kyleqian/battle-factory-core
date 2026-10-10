#!/usr/bin/env python3
"""prep61 RANK: the semi-invulnerable two-turn units (Dive 291, Fly 19, Bounce 340) in a prep61OrderCensus.ts run.

usage: prep61Rank.py <events.jsonl> <commands.jsonl> <out.json>
events.jsonl: prep61OrderCensus.ts --events (every semantic event the production order host consumed, in order, with the host's tracker
state after its step). commands.jsonl: the same run's --commands (prep45 decline rows with orderChain).
Reports (docs/next-adapters-prep61.md, rank):
  - every setup / unleash body (MOVE_ANIMATION of 291 / 19 / 340; request turn 0 = setup, 1 = unleash), whether the host was known
    just before it, and the window between the setup and the unleash: every allocation-relevant event (animations, status animations,
    visibility toggles, faints, switches) in order, as a compact shape string;
  - the window shapes counted per move;
  - the "sprite-order lend unknown" declines whose chain holds one of these bodies, by consumer move and chain.
"""
import json, sys
from collections import Counter, defaultdict

ev_path, cmd_path, out_path = sys.argv[1:4]
UNITS = {291: "DIVE", 19: "FLY", 340: "BOUNCE"}
events = [json.loads(l) for l in open(ev_path) if l.strip()]
by_battle = defaultdict(list)
for e in events:
    by_battle[e["b"]].append(e)

SKIP = {"message", "string", "hp-change", "set-battler-pp-data", "play-se", "set-battler-data", "battler-data", "status-data",
        "set-battler-status-data", "pause", "play-fanfare", "play-cry", "set-hp", "printstring", "printselectionstring"}

def short(e):
    k = e["k"]
    if k == "animation":
        side = "p" if e.get("bt") == 0 else "o"
        if e.get("a") == "MOVE_ANIMATION":
            return f"M{e['m']}{'u' if e.get('turn', 0) & 1 else ''}:{side}"
        if e.get("a") == "HIT_ANIMATION":
            return f"H:{side}"
        if e.get("a") == "STATS_CHANGE":
            return f"S{(e.get('args') or ['?'])[0]}:{side}"
        return f"G{e.get('a')}:{side}"
    if k == "set-battler-sprite-visibility":
        return f"{'hide' if e.get('inv') else 'show'}:{'p' if e.get('bt') == 0 else 'o'}"
    if k == "status-animation":
        return f"st:{'p' if e.get('bt') == 0 else 'o'}"
    if k in ("faint-animation", "switch-in-animation"):
        return f"{k.split('-')[0]}:{'p' if e.get('bt') == 0 else 'o'}"
    if k in ("draw-party-status-summary", "hide-party-status-summary", "trainer-slide-in", "trainer-slide-out", "outcome", "switch"):
        return k
    return None

bodies, windows = [], []
for b, evs in by_battle.items():
    open_setup = {}
    for i, e in enumerate(evs):
        if e["k"] == "animation" and e.get("a") == "MOVE_ANIMATION" and e.get("m") in UNITS:
            known_before = evs[i - 1]["hk"] if i > 0 else None
            reason_before = evs[i - 1]["hr"] if i > 0 else None
            phase = "unleash" if e.get("turn", 0) & 1 else "setup"
            side = "player" if e.get("bt") == 0 else "opponent"
            bodies.append({"battle": b, "rq": e["rq"], "seq": e["seq"], "move": UNITS[e["m"]], "phase": phase, "side": side,
                           "knownBefore": known_before, "reasonBefore": reason_before})
            if phase == "setup":
                open_setup[e.get("bt")] = i
            elif e.get("bt") in open_setup:
                s = open_setup.pop(e.get("bt"))
                shape = [x for x in (short(x) for x in evs[s:i + 1]) if x is not None]
                # moveend's per-battler show toggles (invisible false on an already shown battler) are no-ops: keep hide / show only
                # where they change the battler's hidden state.
                hidden, compact = {"p": False, "o": False}, []
                for t in shape:
                    if t.startswith(("hide:", "show:")):
                        bt, inv = t[-1], t.startswith("hide:")
                        if hidden[bt] == inv:
                            continue
                        hidden[bt] = inv
                    compact.append(t)
                windows.append({"battle": b, "move": UNITS[e["m"]], "side": side, "knownBeforeSetup": evs[s - 1]["hk"] if s > 0 else None,
                                "shape": " ".join(compact)})
    for bt, s in open_setup.items():
        rest = [x for x in (short(x) for x in evs[s:]) if x is not None][:12]
        windows.append({"battle": b, "move": UNITS[evs[s]["m"]], "side": "player" if bt == 0 else "opponent",
                        "knownBeforeSetup": evs[s - 1]["hk"] if s > 0 else None, "shape": " ".join(rest) + " (no unleash)"})

def generic(shape):
    return shape

shapes = defaultdict(Counter)
for w in windows:
    shapes[w["move"]][w["shape"]] += 1

rows = [json.loads(l) for l in open(cmd_path) if l.strip()]
decl = [r for r in rows if r.get("orderChain") is not None]
consumers = defaultdict(lambda: Counter())
frames = defaultdict(Counter)
for r in decl:
    hit = [u for u in r["orderChain"] if any(f"body {m}:" in u for m in UNITS)]
    if not hit:
        continue
    key = " > ".join(dict.fromkeys(r["orderChain"]))
    consumers[key][f"{r['moveId']} {r['move']}"] += 1
    frames[key][f"{r['moveId']} {r['move']}"] += r["frames"] - r["liveFrames"]

report = {
    "bodies": Counter(f"{x['move']} {x['phase']} {x['side']} known-before={x['knownBefore']}" for x in bodies),
    "windowShapes": {m: shapes[m].most_common() for m in sorted(shapes)},
    "declinesByChain": {k: {"commands": sum(v.values()), "frames": sum(frames[k].values()),
                            "consumers": sorted(((c, n, frames[k][c]) for c, n in v.items()), key=lambda t: -t[2])}
                        for k, v in sorted(consumers.items(), key=lambda kv: -sum(frames[kv[0]].values()))},
    "windows": windows,
}
report["bodies"] = dict(sorted(report["bodies"].items()))
json.dump(report, open(out_path, "w"), indent=1, sort_keys=False)
print(f"{len(bodies)} bodies, {len(windows)} setup windows")
for k, v in report["bodies"].items():
    print(f"  {v:4d}  {k}")
for m in sorted(shapes):
    print(f"{m}: {sum(shapes[m].values())} windows, {len(shapes[m])} shapes")
    for s, n in shapes[m].most_common(12):
        print(f"  {n:3d}  {s}")
for k, v in report["declinesByChain"].items():
    print(f"chain [{k}]: {v['commands']} declines / {v['frames']} frames; consumers {v['consumers'][:8]}")
