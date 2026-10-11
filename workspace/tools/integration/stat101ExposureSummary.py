#!/usr/bin/env python3
"""stat101: summarize stat101Exposure.ts shards (census seeds 0..999) into the General_StatsChange exposure BY VARIANT.

usage: stat101ExposureSummary.py <exposure-dir> <out.json>
animArg classes per AnimTask_StatsChange (battle_anim_status_effects.c:482): 15..21 up1, 22..28 down1, 39..45 up2, 46..52 down2,
55 / 56 / 57 / 58 multiple up1 / up2 / down1 / down2; sharply = up2 / down2 / 56 / 58. ROM active frames 75 (non-sharp) / 89 (sharply)
and script span (playanimation -> next instruction) 77 / 91 from fixtures/stat101/receipts/stat-anim.json. Behind a Substitute
(STATUS2_SUBSTITUTE before the segment, or the displayed doll) the ROM plays nothing (TryHandleLaunchBattleTableAnimation).
Elevated = gEnemyMonElevation != 0 for an opponent-side battler (reference/pokeemerald enemy_mon_elevation.h).
"""
import collections, glob, json, os, re, sys

src, out = sys.argv[1:3]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ids = {m.group(1): int(m.group(2)) for m in re.finditer(r"#define (SPECIES_\w+)\s+(\d+)\b", open(os.path.join(ROOT, "reference/pokeemerald/include/constants/species.h")).read())}
elev = {ids[m.group(1)]: int(m.group(2)) for m in re.finditer(r"\[(SPECIES_\w+)\]\s*=\s*(\d+)", open(os.path.join(ROOT, "reference/pokeemerald/src/data/pokemon_graphics/enemy_mon_elevation.h")).read()) if m.group(1) in ids}
names = {v: k[len("SPECIES_"):] for k, v in ids.items()}


def cls(arg):
    if 15 <= arg <= 21: return "up1"
    if 22 <= arg <= 28: return "down1"
    if 39 <= arg <= 45: return "up2"
    if 46 <= arg <= 52: return "down2"
    return {55: "multiple-up1", 56: "multiple-up2", 57: "multiple-down1", 58: "multiple-down2"}.get(arg, f"other-{arg}")


SHARP = {"up2", "down2", "multiple-up2", "multiple-down2"}
battles = [json.loads(l) for f in sorted(glob.glob(os.path.join(src, "shard-*.jsonl"))) for l in open(f)]
c = collections.Counter
by_cls, by_arg, by_side, by_species, sub, castform, elevated = c(), c(), c(), c(), c(), c(), c()
played = {"nonSharp": 0, "sharply": 0}
total_frames = sum(b["frames"] for b in battles)
anims = [(b, a) for b in battles for a in b["anims"]]
for b, a in anims:
    k = cls(a["arg"])
    by_cls[k] += 1
    by_arg[str(a["arg"])] += 1
    by_side["player" if a["battler"] == 0 else "opponent"] += 1
    behind = a["doll"] or a["status2Sub"]
    sub["behindSubstitute" if behind else "visible"] += 1
    if a["castform"]:
        castform[str(a["castform"])] += 1
    if a["battler"] == 1 and elev.get(a["species"], 0):
        elevated[names.get(a["species"], str(a["species"]))] += 1
    by_species[names.get(a["species"], str(a["species"]))] += 1
    if not behind:
        played["sharply" if k in SHARP else "nonSharp"] += 1
stat_commands = sum(b["statCommands"] for b in battles)
add_active = played["nonSharp"] * 75 + played["sharply"] * 89
res = {
    "battles": len(battles), "budgetEnded": sum(b["end"] != "terminal" for b in battles), "totalFrames": total_frames,
    "statCommands": stat_commands, "battlesWithStatCommands": sum(b["statCommands"] > 0 for b in battles),
    "statsChangeEvents": len(anims), "battlesWithStatsChange": sum(bool(b["anims"]) for b in battles),
    "byClass": dict(by_cls.most_common()), "byArg": dict(sorted(by_arg.items(), key=lambda kv: int(kv[0]))), "bySide": dict(by_side),
    "substitute": dict(sub), "castformForms": dict(castform), "elevatedOpponentSpecies": dict(elevated.most_common()),
    "elevatedOpponentEvents": sum(elevated.values()), "topSpecies": dict(by_species.most_common(15)),
    "played": played,
    "romActiveFramesPlayed": add_active,
    "romScriptSpanFramesPlayed": played["nonSharp"] * 77 + played["sharply"] * 91,
    "productionStatCommandFrames": stat_commands * 2,
    "missingFramesLowerBound": add_active - stat_commands * 2,
    "missingShareOfCensus": round((add_active - stat_commands * 2) / total_frames, 4),
}
json.dump(res, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(json.dumps(res, indent=1)[:2500])
