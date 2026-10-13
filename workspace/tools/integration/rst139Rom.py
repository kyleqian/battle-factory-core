#!/usr/bin/env python3
"""rst139 ROM receipt (docs/rst139-ordinary-row-rest.md): reduces rst139Probe.py outputs to the rows outside any battle animation script.
A row is `anim` while gAnimScriptActive != 0, `menu` while battler 0's controller is HandleInputChooseAction / HandleInputChooseMove /
their *AfterDma3 setups, otherwise `ordinary` (messages, HP bars, hit blinks, status icons, send-outs, ...). Per scenario:
  runs        maximal runs of non-anim rows of one kind: [first, last, kind, opponent {x2, y2} values, player x2 values, sprite ids]
  nonAnimX2   every row outside anim where a battler's x2 / y2 changed from the previous row (and its sprite id did not), with both
              controllers: the only allowed non-anim writers are the send-out / drag-out paths (x2 never moves on message / menu rows)
  afterAnim   for every anim run: the opponent's / player's x2 on the anim run's last row + 1 (what the next ordinary row shows)
usage: rst139Rom.py <probe-dir> <scenario-index.json> <out.json>
"""
import glob, json, os, sys
pdir, idx, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
MENU = ("HandleInputChooseAction", "HandleInputChooseMove", "HandleChooseActionAfterDma3", "HandleChooseMoveAfterDma3")
res = {}
for p in sorted(glob.glob(os.path.join(pdir, "*.json"))):
    d = json.load(open(p)); name = os.path.basename(p)
    st, rows = {}, []
    for r in d["rows"]:
        for k in ("act", "c0", "c1", "b0", "b1"):
            if k in r: st[k] = r[k]
        kind = "anim" if st["act"] else ("menu" if st["c0"] in MENU else "ordinary")
        rows.append((r["f"], kind, st["c0"], st["c1"], list(st["b0"]), list(st["b1"])))
    runs, cur = [], None
    for f, kind, c0, c1, b0, b1 in rows:
        if cur is None or cur["kind"] != kind:
            if cur: runs.append(cur)
            cur = {"first": f, "last": f, "kind": kind, "opp": set(), "plyX2": set(), "ids": set()}
        cur["last"] = f
        cur["opp"].add((b1[3], b1[4])); cur["plyX2"].add(b0[3]); cur["ids"].add((b0[0], b1[0]))
    runs.append(cur)
    nonanim = []
    for (f0, k0, *_r0, p0, o0), (f1, k1, c0, c1, p1, o1) in zip(rows, rows[1:]):
        if k1 == "anim" or k0 == "anim":
            continue
        for side, a, b in (("player", p0, p1), ("opponent", o0, o1)):
            if a[0] == b[0] and (a[3] != b[3] or (side == "opponent" and a[4] != b[4])):
                nonanim.append([f1, side, [a[3], a[4]], [b[3], b[4]], c0, c1])
    after = []
    for i, r in enumerate(runs):
        if r["kind"] == "anim" and i + 1 < len(runs):
            n = runs[i + 1]
            row = next(x for x in rows if x[0] == n["first"])
            after.append({"animRows": [r["first"], r["last"]], "next": n["kind"], "opponentX2": [row[5][3], row[5][4]], "playerX2": row[4][3]})
    res[name] = {**idx[name], "frames": d["frameCount"],
                 "runs": [[r["first"], r["last"], r["kind"], sorted(map(list, r["opp"])), sorted(r["plyX2"]), sorted(map(list, r["ids"]))]
                          for r in runs if r["kind"] != "anim"],
                 "nonAnimX2": nonanim, "afterAnim": after}
json.dump(res, open(out, "w"), indent=1)
for k, v in res.items():
    multi = [r for r in v["runs"] if len(r[3]) > 1]
    print(f"{k}: {len(v['runs'])} non-anim runs, {len(multi)} with >1 opponent x2; non-anim x2 writes {len(v['nonAnimX2'])}; "
          f"after-anim opp x2 {[a['opponentX2'][0] for a in v['afterAnim']]}")
