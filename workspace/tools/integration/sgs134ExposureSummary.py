#!/usr/bin/env python3
"""sgs134: classify every census receipt of a gated OTHER controller request (sgs134Exposure.ts output: kernel `animation` =
HandleBattleAnimation / HandleMoveAnimation, `status-icon-update` = HandleStatusIconUpdate; HIT_ANIMATION is HandleHitAnimation, NOT
gated: excluded) that follows an effectivenesssound in its resolution segment, and project the IsBattleSEPlaying gate onto it
(seg127's rule: gate = clamp(seRows[songId] - (fixedRows[class] + drain), 0, 29); docs/sgs134-se-gate-other-requests.md).

usage: sgs134ExposureSummary.py <dir-with-e*.jsonl> <exposure.json> <fixed-rows.json>
  open      no message between the SE and the receipt EXCEPT STRINGID_EMPTYSTRING3 (the multi-hit loop's printstring + waitmessage 1, which
            does not outlast the SE; every other print is followed by waitmessage B_WAIT_TIME_LONG = 64 rows -> seAge > 88 -> gate 0), and
            no animation script in between (a MOVE_ANIMATION / B_ANIM_* / status animation: its Cmd_end waits until IsSEPlaying is FALSE,
            battle_anim.c:476-503, so the SE is drained before the receipt; HIT_ANIMATION is a sprite blink, not a script); closed
            receipts are counted by the first closer (NOTVERYEFFECTIVE / SUPEREFFECTIVE / CRITICALHIT / other print / animation script).
  class     stats-change-target / stats-change-attacker (B_ANIM_STATS_CHANGE right after a `stat-stage-change` = SetMoveEffect's
            ChangeStatBuffs, next print DEFENDERSSTATFELL: BattleScript_StatDown on the target / ATTACKERSSTATROSE: StatUp on the attacker;
            on census 0..999 exactly the receipts on the target / on the attacker = the battler of the last MOVE_ANIMATION) /
            stats-change-attacker-psca (Overheat / Psycho Boost / Superpower self-drops) / stats-change-all-stats-up (AncientPower /
            Silver Wind) / speed-boost (next print PKMNRAISEDSPEED) / stats-change-other, multi-hit (MOVE_ANIMATION of the same move as the last one with EMPTYSTRING3 in between: the 2nd+ hit),
            move-animation-other (open: a two-turn move's charge turn, whose opener print is EMPTYSTRING3), held-item
            (B_ANIM_HELD_ITEM_EFFECT), status-icon, anim:<id> (any other playanimation).
  drain     sum of |from - to| over the hp-change events between the SE and the receipt (the HP bar rows, 1 HP / row for max HP >= 48).
  fixed     <fixed-rows.json> {"seRows": {...}, "cap": 29, "fixedRows": {class: rows}} (a class without fixedRows = unmeasured: gate
            null, and `bound` = the gate at the smallest measured fixedRows (44, the secondary path right after the hit: every other path
            after a hit runs at least that far) = an UPPER bound on that receipt's gate).
"""
import collections, glob, json, os, sys

src, out, rules = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
EMPTY = "msg:STRINGID_EMPTYSTRING3"
CLOSERS = {"msg:STRINGID_NOTVERYEFFECTIVE": "not-very-effective", "msg:STRINGID_SUPEREFFECTIVE": "super-effective",
           "msg:STRINGID_CRITICALHIT": "crit"}


SELF_DROP_PSCA = {"315", "354", "276"}  # Overheat / Psycho Boost (BattleScript_SAtkDown2), Superpower (BattleScript_AtkDefDown): playstatchangeanimation
ALL_STATS_UP = {"246", "318"}  # AncientPower / Silver Wind (BattleScript_AllStatsUp: jumpifstat .. setbyte .. playstatchangeanimation)


def classify(r):
    t = r["tok"]
    if t.startswith("icon:"):
        return "status-icon"
    _, aid, a0, b = t.split(":")
    nxt = r["nextMessage"]
    if aid == "STATS_CHANGE":
        # SetMoveEffect's ChangeStatBuffs (`stat-stage-change`) right before the request = BattleScript_StatDown / StatUp (a hit's
        # secondary); the playstatchangeanimation paths (Overheat / Superpower / AncientPower) animate before their stat change.
        stat_first = bool(r["tail"]) and r["tail"][-1] == "stat-stage-change"
        if nxt == "STRINGID_PKMNRAISEDSPEED":
            return "speed-boost"
        if stat_first and nxt == "STRINGID_DEFENDERSSTATFELL":
            return "stats-change-target"
        if stat_first and nxt == "STRINGID_ATTACKERSSTATROSE":
            return "stats-change-attacker"
        return "stats-change-attacker-psca" if r["move"] in SELF_DROP_PSCA else "stats-change-all-stats-up" if r["move"] in ALL_STATS_UP \
            else "stats-change-other"
    if aid == "MOVE_ANIMATION":
        # the 2nd+ hit of a multi-hit move: same move, the loop's EMPTYSTRING3 in between, and not a two-turn move's charge turn (whose
        # next print is its "dug a hole" / "took in sunlight" string)
        return "multi-hit" if EMPTY in r["tail"] and r["move"] == a0 and not (nxt or "").startswith("STRINGID_PKMN") else "move-animation-other"
    if aid == "HELD_ITEM_EFFECT":
        return "held-item"
    return f"anim:{aid}"


rows, totals, battles = [], collections.Counter(), 0
for f in sorted(glob.glob(os.path.join(src, "e*.jsonl"))):
    for line in open(f):
        b = json.loads(line)
        battles += 1
        for k, v in b["byKind"].items():
            totals[k] += v
        for r in b["open"]:
            if r["tok"].startswith("anim:HIT_ANIMATION"):
                continue
            closers = [x for x in r["tail"] if (x.startswith("msg:") and x != EMPTY) or x.startswith("sa:")
                       or (x.startswith("anim:") and not x.startswith("anim:HIT_ANIMATION"))]
            closer = closers[0] if closers else None
            is_open = closer is None
            # the attacker of the hit that played the SE: the battler of the last MOVE_ANIMATION before the receipt in the segment
            r["atk"] = int(r["attacker"]) if r.get("attacker") is not None else None
            cls = classify(r)
            drain = sum(abs(int(x.split(":")[2]) - int(x.split(":")[3])) for x in r["tail"] if x.startswith("hp:"))
            fixed = rules["fixedRows"].get(cls)
            gate = 0 if not is_open else (None if fixed is None else max(0, min(rules["cap"], rules["seRows"][str(r["se"])] - (fixed + drain))))
            lo = min(rules["fixedRows"].values())
            bound = 0 if not is_open else max(0, min(rules["cap"], rules["seRows"][str(r["se"])] - (lo + drain)))
            rows.append({"seed": b["seed"], "seg": r["seg"], "i": r["i"], "tok": r["tok"], "cls": cls, "se": r["se"], "open": is_open,
                         "closedBy": None if is_open else CLOSERS.get(closer, "other print" if closer.startswith("msg:") else "animation script"), "drain": drain, "move": r["move"],
                         "nextMessage": r["nextMessage"], "gate": gate, "bound": bound})
summary = {}
for cls in sorted({x["cls"] for x in rows}):
    rr = [x for x in rows if x["cls"] == cls]
    op = [x for x in rr if x["open"]]
    gated = [x for x in op if x["gate"]]
    summary[cls] = {"receiptsAfterSe": len(rr), "open": len(op), "openBySe": dict(collections.Counter(str(x["se"]) for x in op)),
                    "closedBy": dict(collections.Counter(x["closedBy"] for x in rr if not x["open"])),
                    "unmeasured": sum(x["gate"] is None for x in op),
                    "unmeasuredBound": {"receipts": sum(1 for x in op if x["gate"] is None and x["bound"]),
                                        "frames": sum(x["bound"] for x in op if x["gate"] is None)}, "gated": len(gated), "gateFrames": sum(x["gate"] for x in gated),
                    "bySide": {side: {"gated": sum(1 for x in gated if (int(x["tok"].split(":")[-1]) % 2) == s),
                                      "frames": sum(x["gate"] for x in gated if (int(x["tok"].split(":")[-1]) % 2) == s)}
                               for side, s in (("player", 0), ("opponent", 1))},
                    "byMove": dict(sorted(collections.Counter(f"{x['move']}:{x['gate']}" for x in gated).items())),
                    "openDrainMin": min((x["drain"] for x in op), default=None)}
res = {"schema": "sgs134-exposure/v1", "battles": battles, "receiptTotals": dict(sorted(totals.items())), "rules": rules,
       "summary": summary, "totalGated": sum(v["gated"] for v in summary.values()),
       "totalGateFrames": sum(v["gateFrames"] for v in summary.values()),
       "openReceipts": [x for x in rows if x["open"]]}
json.dump(res, open(out, "w"), indent=1)
for cls, v in summary.items():
    print(f"{cls:24s} afterSE {v['receiptsAfterSe']:5d} open {v['open']:4d} {v['openBySe']} closed {v['closedBy']} gated {v['gated']} "
          f"frames {v['gateFrames']} unmeasured {v['unmeasured']} bound {v['unmeasuredBound']} sides {v['bySide']}")
print(f"battles {battles}; gated {res['totalGated']} receipts, {res['totalGateFrames']} frames; unmeasured bound "
      f"{sum(v['unmeasuredBound']['receipts'] for v in summary.values())} receipts, {sum(v['unmeasuredBound']['frames'] for v in summary.values())} frames")
