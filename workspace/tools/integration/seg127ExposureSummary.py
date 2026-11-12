#!/usr/bin/env python3
# Classifies seg127Exposure.ts output into tools/integration/fixtures/seg127/exposure.json (seg268: restored from 54c5686f0^; run seg127Exposure.ts first).
"""seg127: classify every census status-animation receipt (seg127Exposure.ts output) by WHAT PRECEDES IT in its resolution segment
(docs/seg127-status-se-gate.md §2) and project the IsBattleSEPlaying gate (seg127 rule, fixtures/seg127/rule.json) onto it.

usage: seg127ExposureSummary.py <dir-with-e*.jsonl> <exposure.json> [<rule.json>]
Per receipt (ctx = the segment's compact events before it; seg127Exposure.ts):
  path      turn-start (the print right before it is the source's "is asleep / frozen / paralyzed / confused / in love" message) /
            end-turn tick (poison / burn / curse / nightmare damage message) / infliction (everything else: the infliction message follows)
  cls       infliction: hit-secondary (a MOVE_ANIMATION + effectiveness SE precede it, no status animation in between, the next message is
            the plain infliction string) / contact-ability (the next message is an ability "...BY" string: PKMNWASPARALYZEDBY,
            PKMNPOISONEDBY, PKMNBURNEDBY, PKMNMADESLEEP, PKMNSXINFATUATEDY, with no other status animation since the move) / synchronize
            (a "...BY" string right after another battler's status animation) / thrash-fatigue (PKMNFATIGUECONFUSION) / yawn
            (PKMNFELLASLEEP after a print or an effectiveness SE since the last move animation: ENDTURN_YAWN; no Gen 3 damaging move
            inflicts plain sleep) / status-move (no effectiveness SE since the move animation);
            turn-start and end-turn keep their path as class.
  se        the songId of the last effectivenesssound (`play-se` 12 / 13 / 14) in the segment, or null; `open` = no message event between
            that SE and the receipt (the only shape the gate can be nonzero in, §0d); `drain` = |from - to| of the last hp-change after
            that SE (the HP bar rows, 1 HP per row for max HP >= 48: healthboxAssembly.ts battleHealthBarAnimationFrames).
  tail      open receipts: the compact events from the last print before the SE to the receipt (exposure.json openReceipts; the
            module test replays them through seg127StatusSeGateFromEvents).
  gate      (with <rule.json>) open receipts: clamp(seRows[se] - (fixedRows[class] + drain), 0, 29) (Cute Charm = the INFATUATION
            contact-ability receipts: fixedRows "cute-charm"); a class without fixedRows would be reported as unmeasured (none left);
            every closed receipt: 0.
"""
import collections, glob, json, os, sys

src, out = sys.argv[1], sys.argv[2]
rule = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
TURN_START = {"STRINGID_PKMNISCONFUSED", "STRINGID_PKMNFASTASLEEP", "STRINGID_PKMNINLOVE", "STRINGID_PKMNISPARALYZED", "STRINGID_PKMNISFROZEN"}
END_TURN = {"STRINGID_PKMNHURTBYPOISON", "STRINGID_PKMNHURTBYBURN", "STRINGID_PKMNAFFLICTEDBYCURSE", "STRINGID_PKMNLOCKEDINNIGHTMARE"}
BY = {"STRINGID_PKMNWASPARALYZEDBY", "STRINGID_PKMNPOISONEDBY", "STRINGID_PKMNBURNEDBY", "STRINGID_PKMNMADESLEEP", "STRINGID_PKMNSXINFATUATEDY"}


def classify(a):
    ctx, prev, nxt = a["ctx"], a["prevMessage"], a["nextMessage"]
    last_msg = max((i for i, t in enumerate(ctx) if t.startswith("msg:")), default=-1)
    last_mv = max((i for i, t in enumerate(ctx) if t.startswith("anim:MOVE_ANIMATION")), default=-1)
    ses = [i for i, t in enumerate(ctx) if t.startswith("se:")]
    last_se = ses[-1] if ses else -1
    se = int(ctx[last_se].split(":")[1]) if ses else None
    is_open = ses != [] and last_se > last_msg
    drains = [t for t in ctx[last_se + 1:] if t.startswith("hp:")] if ses else []
    sa_since_mv = any(t.startswith("sa:") for t in ctx[last_mv + 1:]) if last_mv >= 0 else False
    if ctx and ctx[-1] == f"msg:{prev}" and prev in TURN_START:
        path = cls = "turn-start"
    elif ctx and ctx[-1] == f"msg:{prev}" and prev in END_TURN:
        path = cls = "end-turn"
    else:
        path = "infliction"
        if nxt == "STRINGID_PKMNFATIGUECONFUSION":
            cls = "thrash-fatigue"
        elif nxt in BY:
            cls = "synchronize" if sa_since_mv else "contact-ability"
        elif nxt == "STRINGID_PKMNFELLASLEEP" and (last_msg > last_mv or last_se > last_mv):  # no Gen 3 hit inflicts plain sleep
            cls = "yawn"
        elif last_mv >= 0 and last_se > last_mv:
            cls = "hit-secondary"
        else:
            cls = "status-move"
    return path, cls, se, is_open, a.get("drain")


rows = []
for f in sorted(glob.glob(os.path.join(src, "e*.jsonl"))):
    for line in open(f):
        b = json.loads(line)
        for k, a in enumerate(b["anims"]):
            path, cls, se, is_open, _ = classify(a)
            ctx = a["ctx"]
            last_se = max((i for i, t in enumerate(ctx) if t.startswith("se:")), default=-1)
            hp = [t for t in ctx[last_se + 1:] if t.startswith("hp:")] if last_se >= 0 else []
            drain = sum(abs(int(t.split(":")[2]) - int(t.split(":")[3])) for t in hp)
            key = "cute-charm" if cls == "contact-ability" and a["anim"] == "INFATUATION" else cls
            gate = None
            if rule and is_open:
                fixed = rule["fixedRows"].get(key)
                gate = None if fixed is None else max(0, min(rule["cap"], rule["seRows"][str(se)] - (fixed + drain)))
            elif rule:
                gate = 0
            msgs = [i for i, t in enumerate(ctx[:last_se]) if t.startswith("msg:")] if last_se >= 0 else []
            rows.append({"seed": b["seed"], "k": k, "anim": a["anim"], "side": "player" if a["battler"] % 2 == 0 else "opponent",
                         "path": path, "cls": key, "se": se, "open": is_open, "drain": drain, "gate": gate,
                         "tail": ctx[msgs[-1] if msgs else 0:] if is_open else None, "next": a["nextMessage"]})
by = collections.Counter((r["cls"], r["anim"], r["side"]) for r in rows)  # cls: contact-ability INFATUATION is "cute-charm"
opens = collections.Counter((r["cls"], r["se"], r["anim"], r["side"]) for r in rows if r["open"])
summary = {"schema": "seg127-exposure/v1", "receipts": len(rows), "unclassified": sum(1 for r in rows if r["cls"] is None),
           "byClass": dict(sorted(collections.Counter(r["cls"] for r in rows).items())),
           "byClassAnimationSide": {"|".join(k): v for k, v in sorted(by.items())},
           "seOpenByClassSongAnimationSide": {"|".join(map(str, k)): v for k, v in sorted(opens.items(), key=lambda x: tuple(map(str, x[0])))},
           "seOpenByClass": dict(sorted(collections.Counter(r["cls"] for r in rows if r["open"]).items()))}
if rule:
    proj = {}
    for r in rows:
        if not r["open"]:
            continue
        k = f"{r['cls']}|{r['anim']}|{r['side']}"
        e = proj.setdefault(k, {"open": 0, "gated": 0, "frames": 0, "unmeasured": 0, "gates": {}})
        e["open"] += 1
        if r["gate"] is None:
            e["unmeasured"] += 1
            continue
        e["gated"] += r["gate"] > 0
        e["frames"] += r["gate"]
        e["gates"][str(r["gate"])] = e["gates"].get(str(r["gate"]), 0) + 1
    for e in proj.values():
        e["gates"] = dict(sorted(e["gates"].items(), key=lambda x: int(x[0])))
    summary["projection"] = dict(sorted(proj.items()))
    summary["openReceipts"] = [{k: r[k] for k in ("seed", "k", "anim", "side", "cls", "se", "drain", "gate", "tail", "next")} for r in rows if r["open"]]
    by_cls = collections.defaultdict(lambda: {"receipts": 0, "open": 0, "gated": 0, "frames": 0, "unmeasuredOpen": 0})
    for r in rows:
        c = by_cls[r["cls"]]
        c["receipts"] += 1
        c["open"] += r["open"]
        c["gated"] += bool(r["gate"])
        c["frames"] += r["gate"] or 0
        c["unmeasuredOpen"] += r["open"] and r["gate"] is None
    summary["projectionByClass"] = dict(sorted(by_cls.items()))
    summary["projectionTotal"] = {"gated": sum(c["gated"] for c in by_cls.values()), "frames": sum(c["frames"] for c in by_cls.values()),
                                  "unmeasuredOpen": sum(c["unmeasuredOpen"] for c in by_cls.values())}
json.dump(summary, open(out, "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("receipts", "unclassified", "byClass", "seOpenByClass", "projectionByClass", "projectionTotal") if k in summary}, indent=1))
