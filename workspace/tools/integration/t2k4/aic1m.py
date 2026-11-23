#!/usr/bin/env python3
# aic1m: ROM phases of one faint leg, press (SE 5) -> SE 114, from a probe.sh cmp.txt (hcr3mCmp output). Names the script that printed the faint, the weather-loop
# iterations between the faint's return and GiveExp, and the TryChoose+0 -> SendOutNew+0 frames (the AI choice's CPU time, fch1's 6 + extra).
# usage: aic1m.py CMP.txt [SE16_FRAME_FROM_COMMIT ...]   (default: every SE_FAINT in the file)
import re, sys

def rows(path):
    out = []
    for line in open(path):
        m = re.match(r"^\s*(-?\d+) ROM  (.*)$", line.rstrip())
        if m:
            out.append((int(m.group(1)), m.group(2).split()[0] if not m.group(2).startswith("SE ") else " ".join(m.group(2).split()[:2])))
    return out

def main():
    rs = rows(sys.argv[1])
    for i, (t, w) in enumerate(rs):
        if w != "SE 16":
            continue
        press = next((u for u, x in rs[i + 1:] if x == "SE 5"), None)
        if press is None:
            continue
        after = [(u, x) for u, x in rs if u >= press]
        def first(prefix, frm=press):
            return next((u for u, x in after if u >= frm and x.startswith(prefix)), None)
        faint = next((x.split("+")[0] for u, x in rs[:i + 12] if u >= t and x.startswith("BattleScript_Faint")), "?")
        ret = next((u for u, x in after if x.startswith("BattleScript_" + faint.replace("BattleScript_", "")) and u > press), None)
        give, hand, tc, so = (first("BattleScript_GiveExp"), first("BattleScript_HandleFaintedMon"), first("BattleScript_FaintedMonTryChoose"), first("BattleScript_FaintedMonSendOutNew"))
        s114 = first("SE 114")
        iters = sum(1 for u, x in after if press <= u <= (give or press) and x.startswith("BattleScript_DamagingWeatherLoop+0x0 "))
        loop = [x.split("+")[0].replace("BattleScript_", "") for u, x in after if press < u <= (give or press) and x.startswith("BattleScript_DamagingWeather")]
        print(f"{faint} SE16 {t} press {press} (+{press - t}) -> end {ret and ret - press} GiveExp {give and give - press} Handle {hand and hand - press} TryChoose {tc and tc - press} SendOutNew {so and so - press} SE114 {s114 and s114 - press}; "
              f"weather rows {len(loop)} ({' '.join(loop)}); TryChoose->SendOut {so - tc if so and tc else None}; GiveExp-end {give - ret if give and ret else None}")

main()
