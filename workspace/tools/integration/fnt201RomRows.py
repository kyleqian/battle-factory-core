#!/usr/bin/env python3
"""fnt201: the ROM's faint-script anchors (docs/fnt201-faint-timing.md) from sub183RomFrames.py r1 outputs.
BattleScript_FaintTarget / BattleScript_FaintAttacker are `playfaintcry; pause B_WAIT_TIME_LONG; dofaintanimation; cleareffectsonfaint; printstring`
(script offsets +0 / +2 / +5 / +7 / +9). Per faint (frames are absolute trace frames):
  prevGlyph = first glyph of the last print run before the script (null if none),
  execIdle = first frame of the idle run (no controller busy / no animation) that ends at the cry,
  prev   = frame after the last screen change before the script (end of the preceding print / HP drain),
  cry    = playfaintcry executes (ptr at +0), pauseRows = frames the pause holds (ptr at +2),
  anim   = first frame the controller is busy in dofaintanimation (exec != 0), animRows = busy frames, oam = first OAM change after anim start,
  glyph  = first screen change once printstring (+9) has dispatched (ptr at +12) = the first glyph of "X fainted!".
usage: fnt201RomRows.py <rom r1 json...> > rom-rows.json"""
import bisect, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
syms = []
for line in open(os.path.join(ROOT, "reference/pokeemerald/pokeemerald.map")):
    m = re.match(r"\s+0x([0-9a-f]{8,16})\s+(BattleScript_Faint(?:Target|Attacker))\s*$", line)
    if m: syms.append((int(m.group(1), 16), m.group(2)))
syms.sort(); addrs = [a for a, _ in syms]
def off(p):
    i = bisect.bisect_right(addrs, p) - 1
    return (syms[i][1], p - syms[i][0]) if i >= 0 and p - syms[i][0] < 64 else None
out = {}
for path in sys.argv[1:]:
    rows = json.load(open(path))["rows"]
    chg = lambda k, f: f > 0 and rows[f][k] != rows[f - 1][k]
    faints, f = [], 0
    while f < len(rows):
        o = off(rows[f]["ptr"])
        if o and o[1] == 0:
            cry = f; name = o[0]
            g = f
            while g < len(rows) and (off(rows[g]["ptr"]) or (0, 99))[1] < 5: g += 1
            pauseEnd = g
            a = g
            while a < len(rows) and rows[a]["exec"] == 0: a += 1
            b = a
            while b < len(rows) and rows[b]["exec"] != 0: b += 1
            oam = next(x for x in range(a, b + 2) if chg("oam", x))
            scr = [x for x in range(a, b) if chg("scr", x)]
            p12 = next(x for x in range(b, len(rows)) if (off(rows[x]["ptr"]) or (0, 0))[1] >= 12)
            glyph = next(x for x in range(p12, len(rows)) if chg("scr", x))
            prev = max((x for x in range(cry) if chg("scr", x)), default=0) + 1
            hx = cry
            while hx > 0 and rows[hx - 1]["exec"] == 0 and rows[hx - 1]["act"] == 0: hx -= 1
            # the last print before the script (>= 24-row ptr run with >= 2 screen changes; sst200RomRows.py's print rule): F = its first glyph
            pf = None; x = 0
            while x < cry:
                y = x
                while y + 1 < cry and rows[y + 1]["ptr"] == rows[x]["ptr"]: y += 1
                ch = [z - x for z in range(x, y + 1) if chg("scr", z)]
                if len(ch) >= 2 and y - x + 1 >= 24: pf = x + ch[0]
                x = y + 1
            faints.append({"prevGlyph": pf, "script": name, "prev": prev, "execIdle": hx, "cry": cry, "pauseEnd": pauseEnd, "pauseRows": pauseEnd - cry - 1, "anim": a, "animRows": b - a,
                           "oam": oam, "scrFirst": scr[0] if scr else None, "scrLast": scr[-1] if scr else None, "glyph": glyph})
            f = glyph
        f += 1
    out[os.path.basename(path)] = faints
print(json.dumps(out, indent=1))
