#!/usr/bin/env python3
"""seg127: the IsBattleSEPlaying gate of every Scene ON status animation in seg127Probe.py outputs (docs/seg127-status-se-gate.md).

usage: seg127Rom.py <probe-dir> <scenario-index.json> <out.json>      (<probe-dir>/<stem>-on.json)
       seg127Rom.py --one <probe.json>                                 (print the receipts of one probe; used by the seed sweep)
Status-animation instruction runs exactly as sta123Rom.py (statusanimation / status2animation / chosenstatusanimation; label = battle
script symbol + offset from pokeemerald.map, opcode = the ROM byte in battle_script_commands.h enum order). Per receipt:
  X / poll         the instruction's last row and the first controller row (X + 1: the script emits and the controller polls
                   IsBattleSEPlaying in the same frame, BattleMainCB1 order);
  gate             rows from `poll` to the first gAnimScriptActive row (= the IsBattleSEPlaying TRUE polls; launch row = poll + gate);
  activeRows / controllerRows / nextRow   as sta123 (controllerRows = gate + activeRows + 1 on every receipt; nextRow = the release row);
  se               the last fresh SE1 / SE2 start (`s1` or `s2` == 0: m4aSongNumStart before its first tick) before `poll`:
                   song symbol, start row S, end row (first row after S where IsSEPlaying is FALSE: both PAUSEd, or no track bit), its
                   length L = end - S, age = poll - S (the rule's Delta), hpDrain = sum over both battlers of |gBattleMons.hp at poll -
                   hp at S| (the HP bar rows: 1 HP per row for max HP >= 48) and fixed = age - hpDrain (the class's constant rows);
  ruleGate         clamp(L - age, 0, 29) (the source rule; == gate is the 0-residual check);
  between          the battle-script labels executed from S to X (compact: first row of every pointer run) — the class shape.
"""
import bisect, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms, sym_by_addr = [], {}
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(\w+)\s*$", line)
    if m:
        a = int(m.group(1), 16)
        sym_by_addr[a] = m.group(2)
        if m.group(2).startswith("BattleScript_"):
            syms.append((a, m.group(2)))
syms.sort()
addrs = [a for a, _ in syms]
ROM = open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.gba"), "rb").read()
OPS = re.findall(r"^\s*B_SCR_OP_(\w+),", open(os.path.join(ROOT, "reference/pokeemerald/include/constants/battle_script_commands.h")).read(), re.M)
op = lambda p: OPS[ROM[p - 0x08000000]].lower() if 0x08000000 <= p < 0x08000000 + len(ROM) and ROM[p - 0x08000000] < len(OPS) else None
ANIM_OPS = {"statusanimation", "status2animation", "chosenstatusanimation"}
PAUSE, TRACKS = 0x80000000, 0xFFFF


def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 1024 else hex(p)


def playing(r):  # IsSEPlaying (sound.c:606-613) on the row's SE1 / SE2 status
    if (r["s1"] & PAUSE) and (r["s2"] & PAUSE):
        return False
    return bool((r["s1"] & TRACKS) or (r["s2"] & TRACKS))


def runs(rows):
    out, f = [], 0
    while f < len(rows):
        g = f
        while g + 1 < len(rows) and rows[g + 1]["ptr"] == rows[f]["ptr"]:
            g += 1
        out.append((f, g))
        f = g + 1
    return out


def analyse(rows):
    rr = runs(rows)
    out = []
    for i, (f, g) in enumerate(rr):
        if op(rows[f]["ptr"]) not in ANIM_OPS:
            continue
        poll = g + 1
        h = poll
        while h < len(rows) and rows[h]["exec"]:
            h += 1
        act = [x - poll for x in range(poll, h) if rows[x]["act"]]
        gate = act[0] if act else None
        rec = {"label": lab(rows[f]["ptr"]), "op": op(rows[f]["ptr"]), "X": g, "poll": poll, "gate": gate, "activeRows": len(act),
               "controllerRows": h - poll, "nextRow": h, "atk": rows[g]["atk"], "mv": rows[g]["mv"], "mrf": rows[g]["mrf"], "se": None,
               "ruleGate": 0}
        starts = [x for x in range(1, poll) if rows[x]["s1"] == 0 and rows[x - 1]["s1"] != 0 or rows[x]["s2"] == 0 and rows[x - 1]["s2"] != 0]
        if starts:
            s = starts[-1]
            hdr = rows[s]["s1h"] if rows[s]["s1"] == 0 else rows[s]["s2h"]
            end = next((x for x in range(s + 1, len(rows)) if not playing(rows[x])), None)
            between = [lab(rows[a]["ptr"]) for a, b in rr if s <= a <= g and rows[a]["ptr"] >= 0x08000000]
            drain = sum(abs(rows[poll][k] - rows[s][k]) for k in ("hp0", "hp1"))
            rec["se"] = {"song": sym_by_addr.get(hdr, hex(hdr)), "start": s, "end": end, "L": None if end is None else end - s,
                         "age": poll - s, "hpDrain": drain, "fixed": poll - s - drain, "between": between}
            if end is not None and end > poll:
                rec["ruleGate"] = max(0, min(29, end - s - (poll - s)))
        out.append(rec)
    return out


if sys.argv[1] == "--one":
    for r in analyse(json.load(open(sys.argv[2]))["rows"]):
        se = r["se"] or {}
        print(r["label"], "X", r["X"], "gate", r["gate"], "rule", r["ruleGate"], "act", r["activeRows"], "ctl", r["controllerRows"],
              "mrf", r["mrf"], "mv", r["mv"], "se", se.get("song"), "L", se.get("L"), "age", se.get("age"), "drain", se.get("hpDrain"), "fixed", se.get("fixed"))
    sys.exit(0)
probe_dir, index_path, out_path = sys.argv[1:4]
index = json.load(open(index_path))
out = {"schema": "seg127-rom/v1", "scenarios": {}}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    rows = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    out["scenarios"][stem] = {**meta, "rows": len(rows), "statusAnimations": analyse(rows)}
n = sum(len(v["statusAnimations"]) for v in out["scenarios"].values())
res = [(k, a) for k, v in out["scenarios"].items() for a in v["statusAnimations"] if a["gate"] != a["ruleGate"]]
out["residuals"] = [{"scenario": k, "X": a["X"], "label": a["label"], "gate": a["gate"], "ruleGate": a["ruleGate"]} for k, a in res]
json.dump(out, open(out_path, "w"), indent=1)
print(f"seg127Rom: {len(out['scenarios'])} scenarios, {n} status animations, {len(res)} rule residuals")
