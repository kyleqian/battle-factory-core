#!/usr/bin/env python3
"""opl4: the game-loop checks of a frame catcher run (tools/frame-catcher/README.md), read from the ROM side's set-up log.

For every round and battle the ROM played: the deal (its six set ids and first opponent from the engine's cursor, and the level, streak and
rents the ROM's deal read against the engine's carry), the select screen's six as the ROM built them (set ids, IVs, and level / experience /
stats before any patch), each trainer roll (the ROM's own roll from the engine's cursor gave the engine's trainer and sets, or not), each
opponent party as the ROM built it (IVs, level / experience / stats before the patch), the player's three at every battle start (after a swap
too: personality, species, ability, gender, level, HP, stats), the battle-start transition, and the Factory Head's party. Pure python3.

  python3 tools/openlevel/catcherChecks.py RUN_DIR [RUN_DIR ...]      (RUN_DIR = OUTDIR/<trace name> of tools/frame-catcher/run.sh)
"""
import json, sys
from pathlib import Path


def checks(run):
    tl = json.loads((Path(run) / "rom" / "timeline.json").read_text())
    eng = json.loads((Path(run) / "engine" / "timeline.json").read_text())
    st = tl["staging"]
    c = {"rentals built": [0, 0], "rental IVs": [0, 0], "deal set ids": [0, 0], "deal first opponent": [0, 0], "deal carry": [0, 0],
         "select screen set ids": [0, 0], "trainer rolls (ROM's own roll)": [0, 0], "foe IVs": [0, 0], "foe built": [0, 0],
         "foe party at battle start": [0, 0], "player party at battle start": [0, 0], "transition": [0, 0], "Factory Head party": [0, 0]}
    bad = []

    def tick(key, ok, row):
        c[key][0 if ok else 1] += 1
        if not ok:
            bad.append((key, row))
    for x in st:
        w = x.get("what")
        if w == "rental":
            if "sameOwnBuild" in x:
                tick("rentals built", x["sameOwnBuild"], x)
            if "sameIvs" in x:
                tick("rental IVs", x["sameIvs"], x)
        elif w == "deal: rentals":
            tick("deal set ids", x["same"], x)
            if "sameCarry" in x:
                tick("deal carry", x["sameCarry"], x)
        elif w == "deal: first opponent":
            tick("deal first opponent", x["same"], x)
        elif w == "select screen":
            tick("select screen set ids", x["romSetIds"] == x["engineSetIds"], x)
        elif w == "trainer roll":
            tick("trainer rolls (ROM's own roll)", True, x)
        elif w == "trainer roll missed; trainer and sets written":
            tick("trainer rolls (ROM's own roll)", False, x)
        elif w == "enemy party member":
            tick("foe IVs", x["sameIvs"], x)
            if "sameOwnBuild" in x:
                tick("foe built", x["sameOwnBuild"], x)
        elif w == "opponent party is not the engine's at battle start":
            tick("foe party at battle start", False, x)
        elif w == "player party is the engine's at battle start":
            tick("player party at battle start", True, x)
        elif w == "player party is not the engine's at battle start":
            tick("player party at battle start", False, x)
        elif w == "transition started":
            tick("transition", x["same"], x)
        elif w == "Factory Head party":
            tick("Factory Head party", x["same"] and x.get("rentalsSame") is not False, x)
    battles = sum(1 for x in st if x.get("what") == "battle rng")
    # a battle start with no "opponent party is not the engine's" row is a match
    c["foe party at battle start"][0] = battles - c["foe party at battle start"][1]
    return {"run": Path(run).name, "level": eng["facts"].get("level", "50"), "startStreak": eng["facts"].get("startStreak", 0),
            "rounds": tl.get("rounds"), "battles": battles, "anchors": f"{tl['anchorsMatched']}/{tl['anchorsTotal']}", "stop": tl["stop"],
            "frames": [eng["frames"], tl["frames"]], "checks": c, "bad": bad}


def main():
    total = {}
    for run in sys.argv[1:]:
        r = checks(run)
        print(f"{r['run']}: level {r['level']}{' streak ' + str(r['startStreak']) if r['startStreak'] else ''}, {r['rounds']} round(s), "
              f"{r['battles']} battles, menus followed {r['anchors']}, stop {r['stop']}, frames ours / ROM {r['frames'][0]} / {r['frames'][1]}")
        for k, (ok, no) in r["checks"].items():
            if ok or no:
                print(f"   {k}: {ok} same" + (f", {no} DIFFERENT" if no else ""))
                t = total.setdefault(k, [0, 0])
                t[0] += ok
                t[1] += no
        for k, row in r["bad"][:8]:
            print(f"   ! {k}: {json.dumps(row)[:400]}")
    if len(sys.argv) > 2:
        print("all runs:")
        for k, (ok, no) in total.items():
            print(f"   {k}: {ok} same" + (f", {no} DIFFERENT" if no else ""))


if __name__ == "__main__":
    main()
