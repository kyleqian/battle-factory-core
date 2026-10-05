#!/usr/bin/env python3
"""Step 1 of the real-route sprite-order validation (docs/sprite-order-real-route.md): raw ROM rows -> event list + observed F + uncovered-unit classes.

usage: spriteOrderRealRouteReplay.py [--check]
Reads tools/integration/fixtures/sprite-order-real-route/raw/<trace>-0.json (spriteOrderRealRouteProbe.py output) and writes
  tools/integration/fixtures/sprite-order-real-route/events/<trace>.json   (rule-table events + ROM-observed free order at each edge + uncovered clusters)
  tools/integration/fixtures/sprite-order-real-route/uncovered-units.json  (classification of every allocator cluster no rule covers)
The model replay itself is tools/integration/spriteOrderRealRouteReplay.ts (the production TS applier); pure python3, no mGBA.
Events are derived ONLY from probe markers (LaunchBattleAnimation/DoBounceEffect/EndBounceEffect/DoHitAnimHealthboxEffect/TryHandleLaunchBattleTableAnimation)
and all-free frames; the observed free order F (= sSpriteOrder filtered to free slots) is attached for comparison only.
"""
from __future__ import annotations
import collections, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FX = ROOT / "tools/integration/fixtures/sprite-order-real-route"
TRACES = ["battle1-turn17-dense", "battle1-switch", "battle1-turn2-dragonbreath", "battle1-grovyle-faint", "battle1-victory"]
CLUSTER_GAP = 40  # frames


def free_of(order_hex: str, mask: int) -> list[int]:
    order = bytes.fromhex(order_hex)
    return [s for s in order if not (mask >> s) & 1]


class Rows:
    def __init__(self, rows):
        self.rows, self.ns = rows, [r[0] for r in rows]

    def at(self, n):  # last row with frame <= n
        import bisect
        i = bisect.bisect_right(self.ns, n) - 1
        return self.rows[max(i, 0)]

    def free(self, n):
        r = self.at(n)
        return free_of(r[2], int(r[3], 16))

    def mask(self, n):
        return int(self.at(n)[3], 16)


def strip(caller: str) -> str:
    return re.sub(r"\+0x[0-9a-f]+$", "", caller)


def build(trace: str):
    raw = json.loads((FX / "raw" / f"{trace}-0.json").read_text())
    R = Rows(raw["rows"])
    calls, ctx = raw["calls"], raw["context"]
    events, windows = [], []
    first = raw["firstFrame"]
    # act runs (from rows): [start, end] frames with animActive==1
    runs, start = [], None
    for r in raw["rows"]:
        if r[4] and start is None:
            start = r[0]
        if not r[4] and start is not None:
            runs.append([start, r[0]])
            start = None
    if start is not None:
        runs.append([start, raw["lastFrame"]])

    IDLE = {"PlayerBufferRunCommand", "OpponentBufferRunCommand"}

    def run_end(n):  # gAnimScriptActive flickers 0/1/2 inside a body; the controller leaves *DoMoveAnimation/*HandleBattleAnimation when the body is done
        for c in ctx:
            if c["n"] > n and set(c["ctrl"]) <= IDLE:
                return c["n"]
        return raw["lastFrame"]

    # --- bounce pairs
    starts = sorted({c["n"] for c in calls if c["k"] == "m:DoBounceEffect"})
    ends = sorted({c["n"] for c in calls if c["k"] == "m:EndBounceEffect"})
    for s in starts:
        e = next((x for x in ends if x > s), None)
        nxt = next((x for x in starts if x > s), None)
        if e is None or (nxt is not None and nxt < e):
            events.append({"n": s, "k": "prompt-unterminated"})
        else:
            events.append({"n": e, "k": "prompt", "start": s})
            windows.append((s, e))
    # --- launches
    tries = {c["n"]: c for c in calls if c["k"] == "m:TryHandleLaunchBattleTableAnimation"}
    for c in calls:
        if c["k"] == "m:LaunchBattleAnimation":
            n = c["n"]
            end = run_end(n)
            if c["isMove"]:
                events.append({"n": n, "k": "body", "move": c["tableId"], "side": "opponent" if c["atk"] & 1 else "player", "attacker": c["atk"], "target": c["tgt"], "end": end})
            else:
                t = tries.get(n)
                events.append({"n": n, "k": "anim", "table": c["table"][0], "id": c["tableId"], "arg": t["args"][4] if t else None, "attacker": c["atk"], "end": end})
            windows.append((n, end + 2))
        elif c["k"] == "m:DoHitAnimHealthboxEffect":
            events.append({"n": c["n"], "k": "blip", "caller": strip(c["caller"])})
            windows.append((c["n"], c["n"] + 21))
    # --- all-free frames after the entry = ResetSpriteData-class (party menu / reshow)
    inreset = False
    for r in raw["rows"]:
        m = int(r[3], 16)
        if m == 0 and not inreset and r[0] > first:
            events.append({"n": r[0], "k": "reset"})
        inreset = m == 0
    # --- uncovered allocator calls
    created_covered = {}
    unc = []
    for c in sorted(calls, key=lambda c: c["n"]):
        if c["k"] not in ("CreateSprite", "CreateSpriteAt", "CreateSpriteAtEnd", "DestroySprite"):
            continue
        inwin = any(a <= c["n"] <= b for a, b in windows)
        if c["k"] != "DestroySprite":
            continue_flag = inwin
            # slot of creates is unknown to the call row; derive from mask delta below, so track by call index only
            c["_cov"] = continue_flag
        else:
            c["_cov"] = inwin
    # destroys of slots created by covered units stay covered: use mask deltas per frame to track slots
    cov_slots = set()
    by_n = collections.defaultdict(list)
    for c in calls:
        if c["k"] in ("CreateSprite", "CreateSpriteAt", "CreateSpriteAtEnd", "DestroySprite"):
            by_n[c["n"]].append(c)
    prev_mask = R.mask(first)
    for n in sorted(by_n):
        m = R.mask(n)
        new = [s for s in range(64) if (m >> s) & 1 and not (prev_mask >> s) & 1]
        gone = [s for s in range(64) if (prev_mask >> s) & 1 and not (m >> s) & 1]
        cs = by_n[n]
        covered_frame = any(a <= n <= b for a, b in windows)
        for s in new:
            (cov_slots.add if covered_frame else cov_slots.discard)(s)
        for c in cs:
            c["_cov"] = covered_frame or (c["k"] == "DestroySprite" and c.get("slot") in cov_slots and covered_frame is False and False)
        for s in gone:
            if s in cov_slots and not covered_frame:
                # tail destroy of a slot a covered unit created (e.g. +-2 stat carry): treat as covered
                for c in cs:
                    if c["k"] == "DestroySprite" and c.get("slot") == s:
                        c["_cov"] = True
            cov_slots.discard(s)
        prev_mask = m
    unc = [c for c in sorted(calls, key=lambda c: c["n"]) if c["k"] in ("CreateSprite", "CreateSpriteAt", "CreateSpriteAtEnd", "DestroySprite") and not c.get("_cov") and c["n"] > first]
    clusters, cur = [], None
    for c in unc:
        if cur and c["n"] - cur[-1]["n"] <= CLUSTER_GAP:
            cur.append(c)
        else:
            cur = [c]
            clusters.append(cur)
    ctxs = ctx
    out_clusters = []
    for cl in clusters:
        a, b = cl[0]["n"], cl[-1]["n"]
        before, after = R.free(a - 1), R.free(b + 3)
        mb, ma = R.mask(a - 1), R.mask(b + 3)
        created = [s for s in range(64) if (ma >> s) & 1 and not (mb >> s) & 1]
        destroyed_slots = [s for s in range(64) if (mb >> s) & 1 and not (ma >> s) & 1]
        # destroyed order = leading entries of F_after that were occupied before (array order)
        head = [s for s in after[: len(destroyed_slots) + 8] if s in destroyed_slots]
        cx = [x for x in ctxs if x["n"] <= a]
        cx = cx[-1] if cx else {}
        creators = collections.Counter(strip(c["caller"]) for c in cl if c["k"] != "DestroySprite")
        destroyers = collections.Counter(strip(c["caller"]) for c in cl if c["k"] == "DestroySprite")
        out_clusters.append({"first": a, "last": b, "calls": len(cl), "main": cx.get("main"), "ctrl": cx.get("ctrl"), "script": cx.get("script"), "curMove": cx.get("cur"),
                             "creators": dict(creators.most_common(6)), "destroyers": dict(destroyers.most_common(6)),
                             "createdSlots": created, "destroyedSlots": destroyed_slots, "destroyedArrayOrder": head,
                             "occupiedBefore": bin(mb).count("1"), "occupiedAfter": bin(ma).count("1"), "FbeforeHead": before[:12], "FafterHead": after[:24]})
        events.append({"n": a, "k": "uncovered", "last": b, "klass": None, "main": cx.get("main"), "ctrl": cx.get("ctrl"),
                       "obsF": after, "obsMask": format(ma, "x"), "obsFn": b + 3})
    # --- observed F at edges (state just before the frame the launch executes)
    for e in events:
        if e["k"] in ("body", "anim"):
            e["obsF"] = R.free(e["n"] - 1)
            e["obsMask"] = format(R.mask(e["n"] - 1), "x")
    for e in events:  # state just before the frame of the event (used only to re-seed the resync model)
        e["preF"], e["preMask"] = R.free(e["n"] - 1), format(R.mask(e["n"] - 1), "x")
    order = {"uncovered": 0, "reset": 1, "prompt": 2, "body": 3, "anim": 3, "blip": 4, "prompt-unterminated": 5}
    events.sort(key=lambda e: (e["n"], order[e["k"]]))
    initial = {"F": R.free(first), "mask": format(R.mask(first), "x")}
    return raw, events, out_clusters, initial


def classify(all_clusters):
    """Class = (main func, creator set, destroyer set shape).  Constant transform = identical created/destroyed slot lists across instances."""
    groups = collections.defaultdict(list)
    for tr, cl in all_clusters:
        key = f"{cl['main']}|{'+'.join(sorted(cl['creators']))}|{'+'.join(sorted(cl['destroyers']))}"
        groups[key].append((tr, cl))
    out = []
    for key, items in sorted(groups.items(), key=lambda kv: kv[1][0][1]["first"]):
        sigs = collections.Counter(json.dumps([c["createdSlots"], c["destroyedArrayOrder"], c["occupiedBefore"], c["occupiedAfter"]]) for _, c in items)
        out.append({"class": key, "instances": len(items), "distinctTransforms": len(sigs), "constant": len(sigs) == 1,
                    "transform": json.loads(sigs.most_common(1)[0][0]), "transformFields": ["createdSlots", "destroyedArrayOrder", "occupiedBefore", "occupiedAfter"],
                    "where": [{"trace": t, "first": c["first"], "last": c["last"]} for t, c in items][:12]})
    return out


def main():
    (FX / "events").mkdir(parents=True, exist_ok=True)
    all_clusters = []
    for tr in TRACES:
        raw, events, clusters, initial = build(tr)
        for c in clusters:
            all_clusters.append((tr, c))
        for e in events:
            if e["k"] == "uncovered":
                c = next(c for c in clusters if c["first"] == e["n"])
                e["klass"] = f"{c['main']}|{'+'.join(sorted(c['creators']))}|{'+'.join(sorted(c['destroyers']))}"
        (FX / "events" / f"{tr}.json").write_text(json.dumps({"schema": "sprite-order-real-route-events/v1", "trace": tr, "raw": f"raw/{tr}-0.json", "firstFrame": raw["firstFrame"],
                                                                "lastFrame": raw["lastFrame"], "initial": initial, "events": events, "clusters": clusters}, separators=(",", ":")) + "\n")
        print(tr, collections.Counter(e["k"] for e in events), "clusters", len(clusters))
    (FX / "uncovered-units.json").write_text(json.dumps({"schema": "sprite-order-real-route-uncovered/v1", "clusterGapFrames": CLUSTER_GAP, "classes": classify(all_clusters)}, indent=1) + "\n")


if __name__ == "__main__":
    main()
