#!/usr/bin/env python3
"""S7 worktree probe, ISSUES #30: simulate pokeemerald's real `sSpriteOrder`
persistent-insertion-sort mechanism (reference/pokeemerald/src/sprite.c's
`SortSprites`/`BuildSpritePriorities`/`AddSpritesToOamBuffer`) over the
committed FEATHER_DANCE probe tables, and test whether it explains the
7421-7549-class same-priority draw-order residual left open by
docs/battle-turn-notes.md §34 / ISSUES.md #30.

Restricted to the 8 `gFallingFeatherSpriteTemplate` slots (3/4/7/8/9/10/11/12)
per-turn, NOT the full 64-entry `gSprites`/`sSpriteOrder` array - the real
array's other ~56 entries (other battle sprites, live and dead, across the
whole battle since `ResetSpriteData`) are not RAM-probed by this session's
inputs, so their influence on the 8 feather slots' relative starting order
cannot be reconstructed. Per the step brief, that unknown initial relative
order is PARAMETERIZED: every permutation consistent with the two
same-tick-spawn pairing constraints (the real `createsprite` calls for a pair
like slots 4/7 or 8/9 land in the same RAM tick, so either slot could have
been assigned the lower `gSprites[]` index depending on which free slot
`CreateSprite`'s linear scan found first - a real, testable ambiguity) is
tried, and the persistent order is threaded tick-to-tick using the REAL
algorithm (full insertion-sort pass every tick, restricted to these 8
indices, using each tick's real `priority`/`y+y2` from the probe JSON).

Usage: python3 tools/probe/simulate-feather-sprite-order.py
"""
import itertools
import json
import os

TURNS = [
    ("turn6", "src/data/gen/turn6-feather-sprites-probe.json", 7557, (7421, 7549)),
    ("turn7", "src/data/gen/turn7-feather-sprites-probe.json", 8591, (8455, 8583)),
    ("turn8", "src/data/gen/turn8-feather-sprites-probe.json", 9637, (9501, 9629)),
]

DISPLAY_HEIGHT = 160
FEATHER_SLOTS = [3, 4, 7, 8, 9, 10, 11, 12]


def load_probe(path):
    ticks = json.load(open(path))["ticks"]
    by_tick = {}
    for r in ticks:
        by_tick.setdefault(r["tick"], {})[r["slot"]] = r
    return by_tick


def sprite_key(rec):
    """sSpritePriorities[i] = subpriority | (oam.priority << 8). All feather
    spawns share subpriority 0 (Cmd_createsprite's subpriority_offset arg is 0
    on every Move_FEATHER_DANCE createsprite line), so this collapses to the
    probe's own `priority` (== real oam.priority) field directly."""
    return rec["priority"]


def wrapped_y(rec):
    y = rec["y"] + rec["y2"]
    if y >= DISPLAY_HEIGHT:
        y -= 256
    # The ST_OAM_AFFINE_DOUBLE + ST_OAM_SIZE_3 (64x64) extra-wrap branch in
    # SortSprites does not apply: gFallingFeatherSpriteTemplate uses
    # gOamData_AffineNormal_ObjNormal_32x32 (affineMode Normal, size 32x32 =
    # ST_OAM_SIZE_2), never SIZE_3 - confirmed from
    # reference/pokeemerald/src/battle_anim_flying.c:171-180 template + the
    # OAM data name itself.
    return y


def sort_step(order, recs):
    """One exact `SortSprites` full-array pass (textbook insertion sort with
    the real comparator), restricted to `order`'s own indices. `recs` maps
    slot -> probe record for this tick (missing slot = not yet spawned /
    already recycled - real gSprites[] would hold stale/zeroed state here;
    since we only track the 8 feather slots we hold the last-seen record,
    passed in by the caller, so the comparator always has *some* deterministic
    key rather than crashing)."""
    order = list(order)
    n = len(order)
    for i in range(1, n):
        j = i
        while j > 0:
            s1, s2 = order[j - 1], order[j]
            r1, r2 = recs[s1], recs[s2]
            p1, p2 = sprite_key(r1), sprite_key(r2)
            y1, y2 = wrapped_y(r1), wrapped_y(r2)
            if p1 > p2 or (p1 == p2 and y1 < y2):
                order[j - 1], order[j] = order[j], order[j - 1]
                j -= 1
            else:
                break
    return order


def simulate(by_tick, initial_order, ticks):
    """Returns {tick: [slots in final sSpriteOrder-relative order, ascending
    index i.e. order[0] first]} restricted to the 8 feather slots, run
    tick-by-tick with real per-tick keys, carrying `order` forward exactly the
    way the persistent `sSpriteOrder` array would."""
    order = list(initial_order)
    last_rec = {}
    out = {}
    for t in ticks:
        recs_at_t = by_tick.get(t, {})
        for slot in FEATHER_SLOTS:
            if slot in recs_at_t:
                last_rec[slot] = recs_at_t[slot]
        # Before a slot's first-ever appearance in the probe there is no
        # meaningful record; skip sorting it in (treat as not-yet-relevant -
        # matches its real gSprites[] slot holding some earlier, unrelated
        # sprite/dead state we can't reconstruct without full-battle RAM).
        recs = {s: last_rec[s] for s in FEATHER_SLOTS if s in last_rec}
        active_order = [s for s in order if s in recs]
        if active_order:
            active_order = sort_step(active_order, recs)
            # splice the freshly-sorted subsequence back into `order`,
            # preserving relative positions of not-yet-appeared slots
            it = iter(active_order)
            order = [next(it) if s in recs else s for s in order]
        out[t] = [s for s in order if by_tick.get(t, {}).get(s, {}).get("inUse")
                  and not by_tick[t][s]["invisible"]]
    return out


def draw_order_from_sorted(order_front_to_back):
    """Real hardware/engine convention (re-derived from SortSprites +
    AddSpritesToOamBuffer + this codebase's own ISSUES #30 write-up): earlier
    position in the final sSpriteOrder = lower assigned OAM index = drawn ON
    TOP. Returns slots in DRAW order (paint first..last, i.e. reversed - last
    painted ends up visually in front, matching `compareFeatherDrawOrder`'s
    own array.sort + draw-in-array-order convention)."""
    return list(reversed(order_front_to_back))


def descending_slot_order(live_slots):
    return sorted(live_slots, reverse=True)


def main():
    for turn, path, last_ram_tick, residual_window in TURNS:
        by_tick = load_probe(path)
        ticks = sorted(by_tick.keys())
        window_ticks = [t for t in ticks]

        # Parameterize: try every relative arrangement of the 4 same-tick
        # spawn pairs (4,7), (8,9), (10,11) - the only 3 pairs whose creation
        # order is genuinely ambiguous from the feather data alone (slot 3
        # and slot 12 spawn alone). 2^3 = 8 candidates via "ascending" or
        # "descending" within each pair, composed onto an ascending-slot
        # skeleton (matches `CreateSprite`'s own linear ascending scan when
        # ties don't apply).
        pairs = [(4, 7), (8, 9), (10, 11)]
        candidates = {}
        for bits in itertools.product([0, 1], repeat=3):
            order = [3]
            for (a, b), bit in zip(pairs, bits):
                order += [a, b] if bit == 0 else [b, a]
            order.append(12)
            label = "".join(str(b) for b in bits)
            candidates[f"init-{label}"] = order

        results = {}
        for label, init_order in candidates.items():
            sim = simulate(by_tick, init_order, window_ticks)
            results[label] = sim

        # ISSUES #30 is specifically about the SAME-PRIORITY tiebreak - only
        # feathers sharing an EXACT priority value have a genuine draw-order
        # ambiguity (differing-priority feathers are already ordered by the
        # numeric priority itself, agreed by every model). So: group live
        # feathers by exact `priority` each tick, and compare each candidate's
        # simulated RELATIVE order within a group against the shipped
        # descending-slot-within-group rule.
        diffs = {label: 0 for label in candidates}
        total_tie_ticks = 0
        first_diff_tick = {label: None for label in candidates}
        for t in window_ticks:
            recs_t = by_tick.get(t, {})
            live = [s for s in FEATHER_SLOTS
                    if recs_t.get(s, {}).get("inUse") and not recs_t[s]["invisible"]]
            groups = {}
            for s in live:
                groups.setdefault(recs_t[s]["priority"], []).append(s)
            tie_groups = [g for g in groups.values() if len(g) >= 2]
            if not tie_groups:
                continue
            total_tie_ticks += 1
            for label, sim in results.items():
                sim_order_full = sim[t]  # front-to-back, ascending sSpriteOrder position
                mismatch = False
                for g in tie_groups:
                    shipped_sub = descending_slot_order(g)
                    sim_sub = [s for s in draw_order_from_sorted(sim_order_full) if s in g]
                    if sim_sub != shipped_sub:
                        mismatch = True
                if mismatch:
                    diffs[label] += 1
                    if first_diff_tick[label] is None:
                        first_diff_tick[label] = (t, tie_groups)

        print(f"=== {turn} ({path}) ===")
        print(f"ticks with a same-priority tie among live feathers: {total_tie_ticks}")
        for label in candidates:
            fd = first_diff_tick[label]
            print(f"  {label}: differs from shipped descending-slot-within-group on "
                  f"{diffs[label]}/{total_tie_ticks} tie ticks"
                  + (f"; first diff @ tick {fd[0]} (tie groups={fd[1]})"
                     if fd else " (IDENTICAL to shipped rule on every tie tick)"))

        # Restrict to the already-characterized residual window (§34) and
        # report, per candidate, on how many of ITS ticks the simulated
        # per-tick draw order actually differs from shipped descending-slot -
        # only these ticks are where the two models could produce different
        # pixels at all.
        w0, w1 = residual_window
        w_diffs = {label: [] for label in candidates}
        for t in window_ticks:
            if not (w0 <= t <= w1):
                continue
            recs_t = by_tick.get(t, {})
            live = [s for s in FEATHER_SLOTS
                    if recs_t.get(s, {}).get("inUse") and not recs_t[s]["invisible"]]
            groups = {}
            for s in live:
                groups.setdefault(recs_t[s]["priority"], []).append(s)
            tie_groups = [g for g in groups.values() if len(g) >= 2]
            if not tie_groups:
                continue
            for label, sim in results.items():
                sim_draw_full = draw_order_from_sorted(sim[t])
                mismatch = any(
                    [s for s in sim_draw_full if s in g] != descending_slot_order(g)
                    for g in tie_groups)
                if mismatch:
                    w_diffs[label].append(t)
        print(f"residual window {residual_window}: ticks where sim vs shipped "
              f"draw order could differ (pixel-relevant):")
        for label in candidates:
            ticks_diff = w_diffs[label]
            print(f"  {label}: {len(ticks_diff)} ticks" +
                  (f" e.g. {ticks_diff[:6]}" if ticks_diff else ""))
        print()


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(__file__), "..", ".."))
    main()
