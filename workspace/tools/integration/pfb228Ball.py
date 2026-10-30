#!/usr/bin/env python3
"""pfb228: the ROM faint-replacement ball arc (SpriteCB_PlayerMonSendOut_2) per window: stepY vs the species-keyed formula, and the (x2, y2) sequence vs a reference window.
usage: pfb228Ball.py <json dir> id=B ..."""
import json, sys
from pathlib import Path

# --- simulation of pokeball.c SpriteCB_PlayerMonSendOut_1/_2 (+ InitAnimArcTranslation / AnimTranslateLinear) from the mon's sprite y ---
import re
_trig = (Path(__file__).resolve().parents[2] / "reference/pokeemerald/src/trig.c").read_text()
_t = _trig[_trig.index("gSineTable[]"):]
SINE = [int(float(x) * 256) for x in re.findall(r"Q_8_8\((-?[0-9.]+)\)", _t[:_t.index("};")])]


def ball_arc(mon_y, battler=0, base=(24, 68), x_target=72):
    """(x2, y2) per _2 callback tick for a player send-out ball whose target is the battler's pic coord (mon sprite y) + 32 - ... (data[4] = monY + 24 + 8)."""
    d = [25, 0, 0, 0, 0, -30, 0, 0]
    d[2], d[4] = x_target, mon_y + 32
    x, y = base
    aff = battler
    dx, dy = d[2] - x, d[4] - y
    xd, yd = (abs(dx) << 8) // d[0], (abs(dy) << 8) // d[0]
    xd = xd | 1 if dx < 0 else xd & ~1
    yd = yd | 1 if dy < 0 else yd & ~1
    d[1], d[2], d[3], d[4] = xd, yd, 0, 0
    d[6] = 0x8000 // d[0]
    sin = lambda i, a: (a * SINE[i & 255]) >> 8
    out = []; x2 = y2 = 0
    for _ in range(200):
        hib = (d[7] >> 8) & 0xFF
        if 35 <= hib < 80:
            if (aff & 0xFF00) == 0:
                r6, r7 = d[1] & 1, d[2] & 1
                d[1] = ((d[1] // 3) & ~1) | r6; d[2] = ((d[2] // 3) & ~1) | r7
            r4 = d[0]
            x2, y2, d = _lin(d)
            d[7] += d[6] // 3  # sBattler is data[6]
            y2 += sin((d[7] >> 8) & 0xFF, d[5])
            aff += 0x100
            d[0] = r4 if (aff >> 8) % 3 != 0 else r4 - 1
            if ((d[7] >> 8) & 0xFF) >= 80:
                r6, r7 = d[1] & 1, d[2] & 1
                d[1] = ((d[1] * 3) & ~1) | r6; d[2] = ((d[2] * 3) & ~1) | r7
        else:
            if d[0] == 0: return out
            x2, y2, d = _lin(d)
            d[7] += d[6]
            y2 += sin((d[7] >> 8) & 0xFF, d[5])
        out.append((x2, y2))
    return out


def _lin(d):
    v1, v2, x, y = d[1] & 0xFFFF, d[2] & 0xFFFF, d[3] & 0xFFFF, d[4] & 0xFFFF
    x = (x + v1) & 0xFFFF; y = (y + v2) & 0xFFFF
    x2 = -(x >> 8) if v1 & 1 else x >> 8
    y2 = -(y >> 8) if v2 & 1 else y >> 8
    d[3], d[4] = x, y; d[0] -= 1
    return x2, y2, d





def main():
    if sys.argv[1] == "--arc":  # pfb228Ball.py --arc <monY>: print the arc as JSON [[x2, y2], ...]
        print(json.dumps(ball_arc(int(sys.argv[2])))); return
    D = Path(sys.argv[1]); seqs = {}
    for spec in sys.argv[2:]:
        wid, B = spec.split("="); B = int(B)
        d = json.loads((D / f"{wid}-on.json").read_text()); rows = {int(k): v for k, v in d["rows"].items()}
        seq = []; step = None
        for e in range(B, B + 50):
            r = rows.get(e)
            if not r: continue
            for s in r["sp"]:
                if s[6].startswith("SpriteCB_PlayerMonSendOut"):
                    seq.append((e - B, s[3], s[4])); step = (s[10][1], s[10][2]) if step is None and s[6].endswith("_2") else step
        mon = next(r["b"][0] for e, r in sorted(rows.items()) if e >= B + 47 and not r["b"][0]["inv"])
        dy = mon["y"] - 36; formula = ((dy << 8) // 25) & ~1
        sim = ball_arc(mon["y"]); rom = [(a, b) for _, a, b in seq]
        k = min(range(4), key=lambda k: sum(1 for t in range(len(sim)) if t + k >= len(rom) or rom[t + k] != sim[t]))
        mism = sum(1 for t in range(len(sim)) if t + k >= len(rom) or rom[t + k] != sim[t])
        print(f"{wid:9s} sim(monY): {len(sim)} ticks, best tick offset {k}, mismatching ticks {mism}")
        print(f"{wid:9s} B={B} monY={mon['y']} data[1],data[2]@first_2={step} formula stepY={formula} first={seq[0]} last={seq[-1]} n={len(seq)}")
        seqs[wid] = seq
    ref = next(iter(seqs))
    for w, s in seqs.items():
        dd = [(a[0], a[1] - b[1], a[2] - b[2]) for a, b in zip(s, seqs[ref]) if (a[1], a[2]) != (b[1], b[2])]
        print(f"{w} vs {ref}: {len(dd)} differing ticks; max |dy2|={max([abs(x[2]) for x in dd] or [0])}")




def sim_vs_rom(rom_seq, mon_y):
    sim = ball_arc(mon_y)
    return sim, [sum(1 for t in range(len(sim)) if t + k >= len(rom_seq) or rom_seq[t + k] != sim[t]) for k in range(4)]


if __name__ == "__main__":
    main()
