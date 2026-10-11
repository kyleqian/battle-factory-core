#!/usr/bin/env python3
"""idle94: derive the ROM body anchors of the 16 scenarios (idle94Probe.py ON + OFF outputs) and compare with the committed predictions.

usage: idle94Compare.py <probe-dir> <out.json>     (<probe-dir>/<scenario>-{on,off}.json)
Per scenario (scenario-index.json): A / E (gAnimScriptActive edges of the body whose gCurrentMove / gBattlerAttacker are the scenario's),
X = the attackanimation byte (pointer on A minus 1), F_att / F_after (first frames on X / X+2) in ON and in OFF, pre = A - F_att,
post = F_after - E, the lead rows A .. A+N-1 against A-1 (screen, OAM, palette, IO registers), the last screen change before A and the
first after it, and L = (F_after - F_att) - D, the frames production's timeline loses per body (production's move-animation command
starts on the frame equivalent to F_att and lasts D, liveMoveAnimationDuration; the next command starts at age D).
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
probe_dir, out_path = sys.argv[1], sys.argv[2]
FX = os.path.join(ROOT, "tools/integration/fixtures/idle94")
index = json.load(open(os.path.join(FX, "scenario-index.json")))
pred = json.load(open(os.path.join(FX, "predictions.json")))
per = {int(k.split()[0]): v for k, v in pred["perMove"].items()}


def anchors(rows, move, battler, mode):
    f_on = None
    if mode == "on":
        A = next(r["f"] for i, r in enumerate(rows) if i and r["act"] and not rows[i - 1]["act"] and r["mv"] == move and r["atk"] == battler)
        E = next(r["f"] for r in rows[A:] if not r["act"])
        X = rows[A]["ptr"] - 1
        F_att = A
        while rows[F_att - 1]["ptr"] in (X, X + 1):
            F_att -= 1
        while rows[F_att]["ptr"] != X:
            F_att += 1
        F_after = next(r["f"] for r in rows[A:] if r["ptr"] == X + 2)
        return {"A": A, "E": E, "X": X, "F_att": F_att, "F_after": F_after}
    return None


out = {"schema": "idle94-compare/v1", "scenarios": {}, "summary": {}}
ok = {"L": 0, "pre": 0, "post": 0, "leadStatic": 0, "off35": 0, "n": 0}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    on = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    off = json.load(open(os.path.join(probe_dir, f"{stem}-off.json")))["rows"]
    move, battler = meta["move"], 0 if meta["attackerSide"] == "player" else 1
    p = per[move]
    a = anchors(on, move, battler, "on")
    X = a["X"]
    off_att = next(r["f"] for r in off if r["ptr"] == X and r["mv"] == move and r["atk"] == battler)
    off_after = next(r["f"] for r in off[off_att:] if r["ptr"] == X + 2)
    N, D = p["N"], p["D"]
    A, E = a["A"], a["E"]
    lead = list(range(A, A + N))
    ref = on[A - 1]
    io_at = lambda f: next(r["io"] for r in reversed(on[: f + 1]) if "io" in r)
    lead_rows = [{"f": f, "screenEqualsAminus1": on[f]["scr"] == ref["scr"], "oamEquals": on[f]["oam"] == ref["oam"],
                  "palEquals": on[f]["pal"] == ref["pal"], "ioEquals": io_at(f) == io_at(A - 1)} for f in lead]
    last_change_before = max(r["f"] for i, r in enumerate(on[: A]) if i and r["scr"] != on[i - 1]["scr"])
    first_change_after = min(r["f"] for i, r in enumerate(on) if i > A - 1 and r["scr"] != on[i - 1]["scr"])
    span_on, span_off = a["F_after"] - a["F_att"], off_after - off_att
    L = span_on - D
    rec = {**meta, **a, "pre": A - a["F_att"], "post": a["F_after"] - E, "E_minus_A": E - A, "N": N, "D": D,
           "trail": E - (A + N + D), "spanOn": span_on, "spanOff": span_off, "offAtt": off_att, "offAfter": off_after, "L": L,
           "leadRows": lead_rows, "leadAllStatic": all(x["screenEqualsAminus1"] for x in lead_rows),
           "leadOamChanged": [x["f"] for x in lead_rows if not x["oamEquals"]], "leadPalChanged": [x["f"] for x in lead_rows if not x["palEquals"]],
           "leadIoChanged": [x["f"] for x in lead_rows if not x["ioEquals"]],
           "lastScreenChangeBeforeA": last_change_before, "firstScreenChangeAtOrAfterA": first_change_after,
           "staticRunBeforeFirstChange": first_change_after - last_change_before,
           "predicted": {"L": p["L"], "pre": pred["general"]["pre"], "post": pred["general"]["post"], "E_minus_A": p["E_minus_A"]}}
    rec["match"] = {"L": L == p["L"], "pre": rec["pre"] == 3, "post": rec["post"] == 2, "E_minus_A": rec["E_minus_A"] == p["E_minus_A"],
                    "leadStatic": rec["leadAllStatic"], "off35": span_off == 35}
    ok["n"] += 1
    for k in ("L", "pre", "post", "leadStatic", "off35"):
        ok[k] += int(rec["match"][k])
    out["scenarios"][stem] = rec
    print(f"{stem:44s} A {A:3d} E {E:3d} E-A {E-A:3d} Fatt {a['F_att']:3d} Faft {a['F_after']:3d} pre {rec['pre']} post {rec['post']} "
          f"spanOn {span_on:3d} spanOff {span_off} D {D} L {L:2d} (pred {p['L']}) leadStatic {rec['leadAllStatic']} "
          f"oamChg {len(rec['leadOamChanged'])} palChg {len(rec['leadPalChanged'])} ioChg {len(rec['leadIoChanged'])} "
          f"lastChg<A {last_change_before} firstChg>=A {first_change_after}")
out["summary"] = ok
json.dump(out, open(out_path, "w"), indent=1)
print(json.dumps(ok))
