#!/usr/bin/env python3
"""rst139: ROM crops for the production comparator (docs/rst139-ordinary-row-rest.md). For every probe row OUTSIDE a battle animation
script (gAnimScriptActive 0 on the row and the row before) whose two battler sprites are visible and settled (player x2 0; opponent y2 0
and x2 in {0, 1}: no send-in / drag-out / faint motion; both sprite states identical on the row before, since the screen shows the previous
row's OAM; no DoHitAnimBlinkSpriteEffect controller: the blink rows are the hit effect's, not ordinary rows), crops the opponent rect x 136..215 y 0..79 and the player rect x 32..111 y 40..111 (the message box starts at
y 112) and stores unique crops once. Also lists the anim runs (first row, last row, both controllers) and the opponent sprite-id changes
(send-ins) the comparator replays through production's x2 tracker. Switch / faint spans are not ordinary rows (production draws them
through its switch-in / switch-out / faint paths): the opponent's non-anim x2 / y2 motion rows are clustered (gaps <= 16 rows); a row is
dropped inside a cluster (+-1), from a drag-out (an anim run ending with |opponent x2| >= 64) or a faint sink (a cluster whose first move
is y2 down) through the end of the next send-in cluster after it (or the trace end). A cluster is a sink when the opponent's controller on its first
row is a faint step (*Faint*), a send-in when it is SwitchIn_* . Rows whose player y2 is not 0 (the action-menu bounce
before its reset) are kept as `bounce` rows; the 2 rows after an anim run are dropped (the screen shows the previous row's OAM, and an
elevated opponent's shadow re-shows one row late: sar131's postBodyShadowHidden, a separate mechanism) (the comparator checks their opponent rect only, as on menu rows).
usage: rst139NpzToRaw.py <probe-dir> <dump-dir> <out-dir>      # <out>/<scenario>.crops (uint8) + <scenario>.json
"""
import glob, hashlib, json, os, sys
import numpy as np
pdir, ddir, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
MENU = ("HandleInputChooseAction", "HandleInputChooseMove", "HandleChooseActionAfterDma3", "HandleChooseMoveAfterDma3")
for p in sorted(glob.glob(os.path.join(pdir, "*.json"))):
    d = json.load(open(p)); stem = os.path.basename(p)[:-5]
    frames = np.load(os.path.join(ddir, stem + ".npz"))["frames"]
    # pass 1: opponent motion clusters and dead spans
    st, seq = {}, []
    for r in d["rows"]:
        for k in ("act", "b1", "c1"):
            if k in r: st[k] = r[k]
        seq.append((r["f"], st["act"], st["b1"][3], st["b1"][4], st["c1"]))
    motion, dead, pend = [], [], None
    for (f0, a0, x0, y0, _c0), (f1, a1, x1, y1, c1) in zip(seq, seq[1:]):
        if not a0 and not a1 and (x0, y0) != (x1, y1):
            if motion and f1 - motion[-1][1] <= 16:
                motion[-1][1] = f1
            else:
                motion.append([f1, f1, "sink" if "Faint" in c1 else "send-in" if c1.startswith("SwitchIn") else "move"])
    next_send_in = lambda f: next((c[1] + 1 for c in motion if c[0] > f and c[2] == "send-in"), seq[-1][0])
    for c in motion:
        dead.append([c[0] - 1, c[1] + 1])
        if c[2] == "sink":
            dead.append([c[0], next_send_in(c[0])])
    for (f0, a0, x0, y0, _c0), (f1, a1, x1, y1, _c1) in zip(seq, seq[1:]):
        if a0 and not a1 and abs(x0) >= 64:
            dead.append([f1, next_send_in(f1)])
    isdead = lambda f: any(a <= f <= b for a, b in dead)
    sendins = [[c[0], c[2]] for c in motion if c[2] == "send-in"]
    anim_end = [f1 for (f0, a0, *_), (f1, a1, *_) in zip(seq, seq[1:]) if a0 and not a1]
    recent = lambda f: any(0 <= f - e < 2 for e in anim_end)
    st, rows, anims, crops, seen = {}, [], [], [], {}
    pa, cur, prev_sid, prev_b = 0, None, None, None
    for r in d["rows"]:
        for k in ("act", "c0", "c1", "b0", "b1", "m"):
            if k in r: st[k] = r[k]
        f = r["f"]
        if st["act"] and not pa:
            cur = [f, f, st["c0"], st["c1"]]; anims.append(cur)
        if st["act"]:
            cur[1] = f
        pa = st["act"]
        prev_sid = st["b1"][0]
        b0, b1 = st["b0"], st["b1"]
        settled = prev_b == (b0, b1, 0) and "DoHitAnimBlinkSpriteEffect" not in (st["c0"], st["c1"])
        prev_b = (list(b0), list(b1), st["act"])
        if not settled or isdead(f) or recent(f) or st["act"] or b0[5] or b1[5] or b0[3] != 0 or b1[4] != 0 or b1[3] not in (0, 1):
            continue
        img = frames[f]
        c = np.concatenate([img[0:80, 136:216].reshape(-1), img[40:112, 32:112].reshape(-1)])
        h = hashlib.sha256(c.tobytes()).hexdigest()
        if h not in seen:
            seen[h] = len(crops); crops.append(c)
        rows.append([f, "menu" if st["c0"] in MENU else "bounce" if b0[4] != 0 else "ordinary", seen[h], b1[3], b0[4], st["m"][0], st["m"][1]])
    np.concatenate(crops).astype(np.uint8).tofile(os.path.join(out, stem + ".crops"))
    json.dump({"rows": rows, "anims": anims, "sendIns": sendins, "dead": dead, "crops": len(crops)}, open(os.path.join(out, stem + ".json"), "w"))
    print(stem, len(rows), "rows", len(crops), "unique crops", len(anims), "anims", len(sendins), "send-ins")
