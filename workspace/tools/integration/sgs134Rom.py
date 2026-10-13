#!/usr/bin/env python3
"""sgs134: the IsBattleSEPlaying gate of the OTHER gated controller requests in seg127Probe.py outputs (docs/sgs134-se-gate-other-requests.md):
playanimation / playstatchangeanimation (HandleBattleAnimation), attackanimation (HandleMoveAnimation), updatestatusicon
(HandleStatusIconUpdate). seg127Rom.py's machinery (instruction runs, label = battle-script symbol + offset, opcode = the ROM byte in
battle_script_commands.h enum order, IsSEPlaying on SE1 / SE2), per receipt:
  X / poll      the instruction's last row / the controller's first poll (X + 1);
  launch        the first gAnimScriptActive row at or after poll while the controller runs (none for updatestatusicon);
  delay         launch - poll (attackanimation: + PlayerDoMoveAnimation's case 0 -> 1 -> DoMoveAnim rows; playanimation: 0 + gate);
  seGate        the IsBattleSEPlaying TRUE polls from `poll` = min(29, end - poll) where end = the first row >= poll with no SE1 / SE2 playing;
  nextRow       the first row after poll with gBattleControllerExecFlags == 0 (the controller released: the script's next instruction);
  se            the last fresh SE1 / SE2 start before poll (song, start S, L, age = poll - S, hpDrain over both battlers since S, fixed =
                age - hpDrain) and ruleGate = clamp(L - age, 0, 29) (seg127's rule; ruleGate == seGate is the 0-residual check);
  base          delay - seGate (must be a per-opcode constant: the gate is exactly the extra delay).
usage: sgs134Rom.py <probe-dir> <scenario-index.json> <out.json>        (<probe-dir>/<stem>-on.json)
       sgs134Rom.py --one <probe.json>
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
GATED = {"playanimation", "playanimation_var", "playstatchangeanimation", "attackanimation", "updatestatusicon"}
PAUSE, TRACKS = 0x80000000, 0xFFFF


def lab(p):
    i = bisect.bisect_right(addrs, p) - 1
    return f"{syms[i][1]}+{p - syms[i][0]}" if i >= 0 and p - syms[i][0] < 1024 else hex(p)


def playing(r):  # IsSEPlaying (sound.c:606-613)
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
    out = []
    for f, g in runs(rows):
        o = op(rows[f]["ptr"])
        if o not in GATED:
            continue
        poll = g + 1
        if poll >= len(rows):
            continue
        h = poll
        while h < len(rows) and rows[h]["exec"]:
            h += 1
        launch = next((x for x in range(poll, h) if rows[x]["act"]), None)
        end = next((x for x in range(poll, len(rows)) if not playing(rows[x])), None)
        se_gate = None if end is None else min(29, end - poll)
        rec = {"label": lab(rows[f]["ptr"]), "op": o, "animId": ROM[rows[f]["ptr"] - 0x08000000 + 2] if o == "playanimation" else None,
               "X": g, "poll": poll, "launch": launch, "delay": None if launch is None else launch - poll, "seGate": se_gate,
               "base": None if launch is None or se_gate is None else launch - poll - se_gate, "nextRow": h, "controllerRows": h - poll,
               "atk": rows[g]["atk"], "mv": rows[g]["mv"], "mrf": rows[g]["mrf"], "se": None, "ruleGate": 0}
        starts = [x for x in range(1, poll) if rows[x]["s1"] == 0 and rows[x - 1]["s1"] != 0 or rows[x]["s2"] == 0 and rows[x - 1]["s2"] != 0]
        if starts:
            s = starts[-1]
            hdr = rows[s]["s1h"] if rows[s]["s1"] == 0 else rows[s]["s2h"]
            send = next((x for x in range(s + 1, len(rows)) if not playing(rows[x])), None)
            drain = sum(abs(rows[poll][k] - rows[s][k]) for k in ("hp0", "hp1"))
            rec["se"] = {"song": sym_by_addr.get(hdr, hex(hdr)), "start": s, "end": send, "L": None if send is None else send - s,
                         "age": poll - s, "hpDrain": drain, "fixed": poll - s - drain}
            if send is not None and send > poll:
                rec["ruleGate"] = max(0, min(29, send - poll))
        out.append(rec)
    return out


if sys.argv[1] == "--one":
    for r in analyse(json.load(open(sys.argv[2]))["rows"]):
        se = r["se"] or {}
        print(r["label"], r["op"], "animId", r["animId"], "X", r["X"], "delay", r["delay"], "seGate", r["seGate"], "rule", r["ruleGate"], "base", r["base"],
              "ctl", r["controllerRows"], "mv", r["mv"], "atk", r["atk"], "se", se.get("song"), "L", se.get("L"), "age", se.get("age"),
              "drain", se.get("hpDrain"), "fixed", se.get("fixed"))
    sys.exit(0)
probe_dir, index_path, out_path = sys.argv[1:4]
index = json.load(open(index_path))
out = {"schema": "sgs134-rom/v1", "scenarios": {}}
for name, meta in sorted(index.items()):
    stem = name[:-5]
    rows = json.load(open(os.path.join(probe_dir, f"{stem}-on.json")))["rows"]
    out["scenarios"][stem] = {**meta, "rows": len(rows), "requests": analyse(rows)}
reqs = [(k, a) for k, v in out["scenarios"].items() for a in v["requests"]]
res = [(k, a) for k, a in reqs if a["seGate"] != a["ruleGate"]]
out["residuals"] = [{"scenario": k, "X": a["X"], "label": a["label"], "seGate": a["seGate"], "ruleGate": a["ruleGate"]} for k, a in res]
bases = {}
for k, a in reqs:
    if a["base"] is not None:
        bases.setdefault(a["op"], set()).add(a["base"])
out["basesByOp"] = {k: sorted(v) for k, v in sorted(bases.items())}
json.dump(out, open(out_path, "w"), indent=1)
print(f"sgs134Rom: {len(out['scenarios'])} scenarios, {len(reqs)} gated requests, {sum(1 for _, a in reqs if a['seGate'])} with seGate > 0, "
      f"{len(res)} rule residuals, bases {out['basesByOp']}")
