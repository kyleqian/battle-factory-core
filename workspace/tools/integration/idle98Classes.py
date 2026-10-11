#!/usr/bin/env python3
"""idle98: per command class, the frames production's ordinary timeline loses against the ROM around a move body, Scene ON and OFF.

usage: idle98Classes.py <compare-r1.json> <route-dir> <out-dir>
<route-dir>/b<battle>-{on,off}.json are idle94Route.ts outputs (production orchestrator, census battle <battle>, streak battle * 11 % 49).
ROM side (lab, idle98Compare.py): G = last screen change before F_att, attG = F_att - G, pre, E - A, post, F_es - F_after, spanOn and the
OFF span (35). Production side: for each lab move x side, the census route's move-animation commands of that move and attacker, paired
ON <-> OFF by (the preceding message's lines, its ordinal, the move-animation ordinal after it): ON duration D and the next command;
OFF counterpart duration prodOff (0 = no command). Anchor: production's move-animation command starts on the ROM frame G + 1 (the
frame after the final glyph), which the accepted OFF hit path fixes: its 1 + interveningInstructions + 32 equals the ROM's G + 1 ->
Cmd_hitanimation span (attG + 36) exactly (L_OFF = 0, checked per move where the attack string directly precedes the body).
L_ON = L_OFF + (spanOn - 35) - (D - prodOff): ROM spans differ between the scenes ONLY on attackanimation .. waitanimation
(idle98Compare: F_att - G and F_es - F_after are scene-independent on 37 / 37 bodies). For a no-hit body (status, two-turn charge)
production OFF has no command, L_OFF = (attG - 1) + 35 + k where k (frames from F_after to the next production anchor) is not fixed
here: L_ON - L_OFF is reported.
"""
import collections, json, os, sys

cmp_path, rdir, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
C = json.load(open(cmp_path))["scenarios"]
ROUTES = {(2, 0): 268, (2, 1): 718, (94, 0): 398, (94, 1): 2, (44, 0): 2, (44, 1): 19, (89, 0): 6, (89, 1): 4, (24, 0): 27,
          (24, 1): 201, (13, 0): 201, (13, 1): 250, (352, 0): 0, (352, 1): 19, (223, 0): 527, (223, 1): 7, (339, 0): 154, (339, 1): 398}


def route_bodies(b, mv, atk):
    """ON move-animation commands of (mv, atk). A hit-path command (next = hit-animation) is paired with the OFF move-animation command
    of the same attacker and the same ordinal among that attacker's hit-path commands (OFF has a move-animation command only on the hit
    path, and its moveId is -1); a no-hit command has prodOff 0. ordinalAfterMessage counts this move's commands since the last
    non-empty message (multi-hit later bodies follow an empty EMPTYSTRING3 message)."""
    on = json.load(open(os.path.join(rdir, f"b{b}-on.json")))["rows"]
    off = json.load(open(os.path.join(rdir, f"b{b}-off.json")))["rows"]
    dur = lambda rows, i: rows[i + 1]["frame"] - rows[i]["frame"] if i + 1 < len(rows) else None
    off_hits = [dur(off, i) for i, r in enumerate(off) if r["type"] == "move-animation" and r.get("attacker") == atk]
    res, hit_ordinal, seen = [], 0, 0
    for i, r in enumerate(on):
        if r["type"] == "message" and r.get("lines") not in (None, "[]"):
            seen = 0
        if r["type"] != "move-animation" or r.get("attacker") != atk:
            continue
        nxt = on[i + 1]["type"] if i + 1 < len(on) else None
        po = 0
        if nxt == "hit-animation":
            po = off_hits[hit_ordinal] if hit_ordinal < len(off_hits) else None
            hit_ordinal += 1
        if r.get("moveId") == mv:
            seen += 1
            res.append({"D": dur(on, i), "next": nxt, "live": r.get("live"), "ordinalAfterMessage": seen, "prodOff": po})
    return res


table, per_class = [], collections.defaultdict(list)
for stem, v in sorted(C.items()):
    side = 0 if v["attackerSide"] == "player" else 1
    k_by_mv = collections.Counter()
    for b in v["bodies"]:
        own = b["mv"] == v["move"] and b["atk"] == side
        if not own:
            continue  # the targets' Tackle bodies: ROM-only (no Tackle in the census routes)
        k = k_by_mv[b["mv"]]
        k_by_mv[b["mv"]] += 1
        hit = b["F_es"] is not None
        cls = {"hit": "hit", "ko": "hit (KO)", "multi-hit": f"multi-hit body {k + 1}", "two-turn": "two-turn charge" if k == 0 else "two-turn strike",
               "status-control": "status (no hit)"}[v["class"]]
        battle = ROUTES[(b["mv"], side)]
        rb = route_bodies(battle, b["mv"], side)
        # the route body matching this lab body: multi-hit by ordinal after the message, else the first
        want = (k + 1) if v["class"] == "multi-hit" else 1
        cand = [r for r in rb if r["ordinalAfterMessage"] == want and (hit == (r["next"] == "hit-animation"))]
        r = cand[0] if cand else None
        row = {"scenario": stem, "move": b["mv"], "side": v["attackerSide"], "class": cls, "battle": battle, "attG": b["attMinusG_on"], "pre": b["pre"],
               "E_minus_A": b["E_minus_A"], "post": b["post"], "esMinusAfter": b["esMinusAfter_on"], "spanOn": b["spanOn"],
               "spanOff": b["off"]["span"], "preRowsStatic": b["preRowsStatic"], "rowAEqualsPre": b["rowAEqualsPre"],
               "postRowsEqualE": b["postRowsEqualE"]}
        if r:
            D, po = r["D"], r["prodOff"]
            row.update({"D": D, "prodNext": r["next"], "prodOff": po, "live": r["live"]})
            if hit:
                row["romOffG1ToHit"] = b["attMinusG_on"] + 35 + b["esMinusAfter_on"]
                # the G + 1 anchor is the attack string's final glyph only for a body right after "X used Y!" (a later multi-hit body's
                # G is the previous hit's last change; a two-turn strike's attack string is printed on the strike turn: anchor holds)
                row["L_off"] = row["romOffG1ToHit"] - po if r["ordinalAfterMessage"] == 1 else None
                l_off = row["L_off"] if row["L_off"] is not None else 0
                row["L_on"] = l_off + (b["spanOn"] - 35) - (D - po)
                row["L_onDecomposed"] = {"offCommandMinus36": po - 36,
                                         "pre": b["pre"], "N+trail+1": b["E_minus_A"] - D + 1, "post": b["post"], "effectivenesssound": b["esMinusAfter_on"]}
                row["residualAfterPre3Post2"] = row["L_on"] - 5
            else:
                row["L_onMinusL_off"] = (b["spanOn"] - 35) - (D - po)
        table.append(row)
        per_class[cls].append(row)
# Misses (no body): production's "X used Y!" -> "X's attack missed!" command durations, ON vs OFF, on every route.
misses = []
for b in sorted({v for v in ROUTES.values()}):
    seqs = {}
    for sc in ("on", "off"):
        rows = json.load(open(os.path.join(rdir, f"b{b}-{sc}.json")))["rows"]
        seqs[sc] = [(rows[i - 1].get("lines"), rows[i]["frame"] - rows[i - 1]["frame"], rows[i + 1]["frame"] - rows[i]["frame"])
                    for i, r in enumerate(rows) if "attack missed" in (r.get("lines") or "") and i + 1 < len(rows)]
    misses.append({"battle": b, "on": seqs["on"], "off": seqs["off"], "identical": seqs["on"] == seqs["off"]})
json.dump({"schema": "idle98-classes/v1", "rows": table, "misses": misses}, open(os.path.join(out, "classes.json"), "w"), indent=1)
cols = ["scenario", "move", "side", "class", "battle", "attG", "pre", "E_minus_A", "post", "esMinusAfter", "spanOn", "spanOff", "D", "prodNext",
        "prodOff", "romOffG1ToHit", "L_off", "L_on", "L_onMinusL_off", "residualAfterPre3Post2", "preRowsStatic", "rowAEqualsPre", "postRowsEqualE"]
with open(os.path.join(out, "classes.tsv"), "w") as f:
    f.write("\t".join(cols) + "\n")
    for row in table:
        f.write("\t".join(str(row.get(c, "")) for c in cols) + "\n")
print(f"misses: {sum(len(m['on']) for m in misses)} on {len(misses)} routes, ON == OFF on {sum(m['identical'] for m in misses)} / {len(misses)} routes")
for row in table:
    print("  ".join(f"{c}={row.get(c, '')}" for c in cols[1:]))
