#!/usr/bin/env python3
"""S7 worktree probe, ISSUES #30 pixel-render step: dump the two live
`sSpriteOrder` initial-permutation candidates' per-RAM-tick simulated order
(front-to-back sSpriteOrder position, i.e. `simulate()`'s own return shape)
to JSON, for `tools/probe/render-feather-order-candidates.ts` to render and
diff against fresh oracle captures.

Reuses `simulate-feather-sprite-order.py`'s own algorithm verbatim (imported
as a module, no reimplementation) - per `docs/feather-order-notes.md`, only
the `(4,7)` spawn pair's initial relative order has any effect on the
result, so this dumps just the two candidates that matter:
`init-000` ("(4,7)": 4 before 7) and `init-100` ("(7,4)": 7 before 4) - the
`(8,9)`/`(10,11)` bits are fixed at 0 (confirmed fully redundant).

Usage: python3 tools/probe/dump-feather-order-candidates.py
Writes: tools/probe/out/feather-order-candidates.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import importlib

sim_mod = importlib.import_module("simulate-feather-sprite-order")

TURNS = sim_mod.TURNS
CANDIDATE_LABELS = {"a": "init-000", "b": "init-100"}  # a = (4,7), b = (7,4)


def main():
    out = {}
    for turn, path, last_ram_tick, residual_window in TURNS:
        by_tick = sim_mod.load_probe(path)
        ticks = sorted(by_tick.keys())
        pairs = [(4, 7), (8, 9), (10, 11)]

        def init_order(bits):
            order = [3]
            for (a, b), bit in zip(pairs, bits):
                order += [a, b] if bit == 0 else [b, a]
            order.append(12)
            return order

        turn_out = {"lastRamTick": last_ram_tick, "residualWindow": list(residual_window), "candidates": {}}
        for key, label in CANDIDATE_LABELS.items():
            bits = tuple(int(c) for c in label.split("-")[1])
            sim = sim_mod.simulate(by_tick, init_order(bits), ticks)
            # JSON keys must be strings; store tick -> [slots front-to-back]
            turn_out["candidates"][key] = {str(t): order for t, order in sim.items()}
        out[turn] = turn_out

    out_dir = os.path.join(os.path.dirname(__file__), "out")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "feather-order-candidates.json")
    with open(out_path, "w") as f:
        json.dump(out, f)
    print(f"wrote {out_path} ({sum(len(v['candidates']['a']) for v in out.values())} total ticks, candidate a)")


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(__file__), "..", ".."))
    main()
