#!/usr/bin/env python3
"""off148: Scene OFF census delta of the no-hit pause remainder (docs/off148-scene-off-pauses-remainder.md).

usage: off148CensusDelta.py <base-off-dir> <final-off-dir> <out.json> [<base-on-dir> <final-on-dir>]
Each dir holds off108Route.ts shards (off-<k>.jsonl / on-<k>.jsonl). Per use (same seed / order / move / opener / u in both trees): the
final commands must equal the base's once the move-animation commands this change inserts at a no-hit SCENE_OFF_ATTACK_PAUSE receipt
are removed (inserted = present in final, absent in base). Every inserted pause is classified by off108's N class of the base route
(the first receipt after the attack receipt that is not PP / play-se), the move, and P. Also lists the no-hit SCENE_OFF_ATTACK_PAUSE bodies
still without a pause (by the same class). With the ON dirs: the ON shards must be byte-identical.
"""
import collections, filecmp, glob, json, os, sys

base_dir, final_dir, out_path = sys.argv[1:4]
on_dirs = sys.argv[4:6]


def load(d, scene="off"):
    res = []
    for f in sorted(glob.glob(os.path.join(d, f"{scene}-*.jsonl")), key=lambda p: int(p.rsplit("-", 1)[1].split(".")[0])):
        res += [json.loads(line) for line in open(f) if line.strip()]
    return res


def n_class(y):
    att = y["attack"]
    after = [r for r in y["follow"] if r[0] > att[0] and r[1] not in ("set-battler-pp-data", "play-se")]
    return (after[0][2] or after[0][1]) if after else "(none)"


def no_hit(y):
    return y["attack"] is not None and not y["hit"] and y["attack"][2] == "SCENE_OFF_ATTACK_PAUSE"


def paused(y):
    return any(c[0] == y["attack"][0] and c[1] == "move-animation" for c in y["commands"])


base, final = load(base_dir), load(final_dir)
key = lambda y: (y["seed"], y["move"], y["opener"], y["u"], y["attacker"])
res = {"schema": "off148-census-delta/v1", "uses": [len(base), len(final)], "useKeyMismatch": 0, "commandMismatch": 0,
       "mismatchExamples": [], "inserted": 0, "insertedFrames": 0, "insertedByClass": collections.Counter(),
       "insertedFramesByClass": collections.Counter(), "insertedByMoveClassP": collections.Counter(),
       "noHitWithoutPauseBase": collections.Counter(), "noHitWithoutPauseFinal": collections.Counter(),
       "noHitWithoutPauseFinalByMove": collections.Counter(), "pausesChanged": 0}
if [key(y) for y in base] != [key(y) for y in final]:
    res["useKeyMismatch"] = 1
for x, y in zip(base, final):
    if key(x) != key(y):
        continue
    cx, cy = x["commands"], y["commands"]
    ins = []
    if no_hit(y) and paused(y) and not paused(x):
        ins = [c for c in cy if c[0] == y["attack"][0] and c[1] == "move-animation"]
    rest = [c for c in cy if c not in ins]
    if rest != cx:
        res["commandMismatch"] += 1
        if no_hit(x) and paused(x):
            res["pausesChanged"] += 1
        if len(res["mismatchExamples"]) < 8:
            res["mismatchExamples"].append({"seed": x["seed"], "move": x["move"], "base": cx, "final": cy})
    if no_hit(x) and not paused(x):
        res["noHitWithoutPauseBase"][n_class(x)] += 1
    if no_hit(y) and not paused(y):
        res["noHitWithoutPauseFinal"][n_class(y)] += 1
        res["noHitWithoutPauseFinalByMove"][f"{y['move']} {n_class(y)}"] += 1
    if ins:
        p = sum(c[2] for c in ins)
        cls = n_class(x)
        res["inserted"] += len(ins)
        res["insertedFrames"] += p
        res["insertedByClass"][cls] += 1
        res["insertedFramesByClass"][cls] += p
        res["insertedByMoveClassP"][f"{x['move']} {cls} P={p}"] += 1
for k in ("insertedByClass", "insertedFramesByClass", "insertedByMoveClassP", "noHitWithoutPauseBase", "noHitWithoutPauseFinal",
          "noHitWithoutPauseFinalByMove"):
    res[k] = dict(res[k].most_common())
if on_dirs:
    a, b = on_dirs
    names = sorted(os.path.basename(p) for p in glob.glob(os.path.join(a, "on-*.jsonl")))
    same = [n for n in names if os.path.exists(os.path.join(b, n)) and filecmp.cmp(os.path.join(a, n), os.path.join(b, n), shallow=False)]
    res["sceneOn"] = {"shards": len(names), "byteIdentical": len(same), "uses": len(load(a, "on"))}
json.dump(res, open(out_path, "w"), indent=1)
json.dump({k: res[k] for k in ("uses", "useKeyMismatch", "commandMismatch", "pausesChanged", "inserted", "insertedFrames",
                                "insertedByClass", "insertedByMoveClassP", "noHitWithoutPauseBase", "noHitWithoutPauseFinal")}
          | ({"sceneOn": res["sceneOn"]} if on_dirs else {}), sys.stdout, indent=1)
print()
