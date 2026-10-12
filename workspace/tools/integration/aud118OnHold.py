#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): the "But it failed!" hold after a REPEATED Light Screen 113 / Reflect 115 / Rain Dance 240, both
scenes. Source: the second use's setlightscreen / setreflect / setrain fails (MOVE_RESULT_MISSED / FAILED), then the
BattleScript_PrintReflectLightScreenSafeguardString / BattleScript_MoveWeatherChange attackanimation takes Cmd_attackanimation's MOVE_RESULT_NO_EFFECT branch = BattleScript_Pausex20 in Scene ON too (battle_script_commands.c
1793-1797; Scene OFF takes the HITMARKER_NO_ANIMATIONS branch = the same pause). ROM: off108Rom.py's second use of the -twice scenario
(the first glyph of "But it failed!", rows - G). Production: every off108Route.ts use of the move whose first message after the opener is
STRINGID_BUTITFAILED; its start in frames after G + 1 = the opener's holdFrames + every command between (minimumFrames + holdFrames).
residual = start - (glyph - 1). usage: aud118OnHold.py <rom-r1.json> <route-dir> [<route-dir> ...]   (one JSON line per route dir)"""
import collections, glob, json, os, sys

rom = json.load(open(sys.argv[1]))["scenarios"]
STEM = {113: "aud118-light-screen-twice-ply-primeape-onix", 115: "aud118-reflect-twice-ply-primeape-onix",
        240: "aud118-rain-dance-twice-ply-primeape-onix"}
WAITMESSAGE = {113: "BattleScript_PrintReflectLightScreenSafeguardString+7", 115: "BattleScript_PrintReflectLightScreenSafeguardString+7",
               240: "BattleScript_MoveWeatherChange+7"}


def glyph(stem, mode, move):
    u = [x for x in rom[stem][mode] if x["atk"] == 0][1]
    run = next(r for r in u["runs"] if r[0] == WAITMESSAGE[move])
    return run[5][0]


for rdir in sys.argv[2:]:
    out = {"routes": os.path.basename(os.path.normpath(rdir))}
    for scene in ("on", "off"):
        res = collections.defaultdict(collections.Counter)
        for f in sorted(glob.glob(os.path.join(rdir, f"{scene}-*.jsonl"))):
            for line in open(f):
                if not line.strip():
                    continue
                u = json.loads(line)
                if u["move"] not in STEM:
                    continue
                c = u["commands"]
                n = next((x for x in u["follow"] if x[1] == "message"), None)
                if n is None or n[2] != "STRINGID_BUTITFAILED":
                    continue
                start = c[0][3] or 0
                for x in c[1:]:
                    if x[0] == n[0]:
                        break
                    start += (x[2] or 0) + (x[3] or 0)
                res[u["move"]][start - (glyph(STEM[u["move"]], scene, u["move"]) - 1)] += 1
        out[scene] = {str(m): {"romGlyph": glyph(STEM[m], scene, m), "residuals": dict(sorted(res[m].items()))} for m in sorted(res)}
    print(json.dumps(out, sort_keys=True))
