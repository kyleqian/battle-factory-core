#!/usr/bin/env python3
"""Build tools/integration/fixtures/wall-family-<move>-source-receipt.json.

usage: wallFamilyReceipt.py <move-name> <move-id> <rawdir> <rawdest> <out.json>
Reads <rawdir>/<move-name>-{player,opponent}-{clock,calls}-{0,1}.json (from
wallFamilyRunAll.sh), requires each fresh pair to be byte-identical, derives the
allocator plan per orientation, copies the raw files' compact projections is NOT
done: the raw clock files (small) are copied to <rawdest>; the call files are
reduced to the in-window calls recorded in the receipt.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

name, move, rawdir, rawdest, out = sys.argv[1], int(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), Path(sys.argv[5])
ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "reference/pokeemerald"
SOURCES = ["data/battle_anim_scripts.s", "data/battle_scripts_1.s", "src/battle_anim.c", "src/sprite.c",
           "src/battle_anim_psychic.c", "src/battle_anim_effects_1.c", "src/battle_anim_effects_2.c",
           "src/battle_anim_effects_3.c", "src/battle_anim_mons.c", "src/battle_script_commands.c"]


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def label(ev):
    v = ev["after"] or ev["before"]
    return v["templateNames"][0] if v["templateNames"] else v["template"]


def derive(side):
    clock = [json.loads((rawdir / f"{name}-{side}-clock-{i}.json").read_text()) for i in (0, 1)]
    calls = [json.loads((rawdir / f"{name}-{side}-calls-{i}.json").read_text()) for i in (0, 1)]
    ident = {
        "clockPairIdentical": (rawdir / f"{name}-{side}-clock-0.json").read_bytes() == (rawdir / f"{name}-{side}-clock-1.json").read_bytes(),
        "callsPairIdentical": (rawdir / f"{name}-{side}-calls-0.json").read_bytes() == (rawdir / f"{name}-{side}-calls-1.json").read_bytes(),
        "clockSha256": [sha(rawdir / f"{name}-{side}-clock-{i}.json") for i in (0, 1)],
        "callsSha256": [sha(rawdir / f"{name}-{side}-calls-{i}.json") for i in (0, 1)],
    }
    if not (ident["clockPairIdentical"] and ident["callsPairIdentical"]):
        raise SystemExit(f"{name} {side}: fresh pair differs")
    c, k = clock[0], calls[0]
    act = c["activationFrame"]
    end = c["cleanupFrame"] if c["cleanupFrame"] is not None else c["endCommandFrame"]
    window = [e for e in c["allSpriteEvents"] if act - 4 <= e["frame"] <= end + 2 and e["kind"] != "replace"]
    # sprites: pair each create with the next destroy of the same slot
    sprites, open_ = [], {}
    for e in window:
        if e["kind"] == "create":
            rec = {"slot": e["slot"], "template": label(e), "callback": (e["after"]["callbackNames"] or [e["after"]["callback"]])[0],
                   "createFrame": e["frame"], "createAge": e["frame"] - act}
            sprites.append(rec)
            open_[e["slot"]] = rec
        elif e["kind"] == "destroy" and e["slot"] in open_:
            rec = open_.pop(e["slot"])
            rec["destroyFrame"] = e["frame"]
            rec["destroyAge"] = e["frame"] - act
            rec["lifetime"] = e["frame"] - rec["createFrame"]
    script = [s for s in sprites if not s["template"].startswith(("sInvisible", "gMultiuse"))]
    post = [s for s in sprites if s["template"].startswith(("sInvisible", "gMultiuse"))]
    wall = script[0]  # first script sprite: the wall (Protect: the shield)
    for s in sprites:
        s["ageFromWall"] = s["createFrame"] - wall["createFrame"]
    in_window_calls = []
    for call in k["calls"]:
        if act - 4 <= call["traceFrame"] <= end + 2:
            in_window_calls.append({
                "traceFrame": call["traceFrame"], "kind": call["kind"], "caller": call["caller"],
                "template": (call["template"] or {}).get("names", [None])[0] if call["template"] else None,
                "slotArgument": call["slotArgument"], "returnedSlot": call.get("resultSlot"),
                "occupiedBefore": call["occupiedBefore"], "occupiedAfter": call.get("occupiedAfter")})
    for e in window:  # every table change must be attributed to an allocator call
        want = "CreateSprite" if e["kind"] == "create" else "DestroySprite"
        if not any(x["traceFrame"] == e["frame"] and x["slotArgument"] == e["slot"] and x["kind"].startswith(want)
                   or x["traceFrame"] == e["frame"] and x["returnedSlot"] == e["slot"] and x["kind"].startswith(want)
                   for x in in_window_calls):
            raise SystemExit(f"{name} {side}: no allocator call for {e['kind']} slot {e['slot']} at frame {e['frame']}")
    reused = sorted({s["slot"] for s in script if sum(1 for t in script if t["slot"] == s["slot"]) > 1})
    return {
        "firstAnimationIsThisMove": c["firstAnimationIsThisMove"],
        "animationActivations": c["animationActivations"],
        "scenario": c["scenario"],
        "activationFrame": act, "scriptEndCommandFrame": c["endCommandFrame"], "cleanupFrame": c["cleanupFrame"],
        "activeFlagStuckAtTraceEnd": c["activeAtTraceEnd"],
        "scriptPointerTrace": c["scriptPointerTrace"],
        "liveAgeOffset": wall["createFrame"] - act,
        "wall": wall,
        "scriptSprites": script,
        "postScriptSprites": post,
        "slotsReusedWithinScript": reused,
        "baselineOccupied": c["baselineOccupied"], "endOccupied": c["endOccupied"],
        "netZeroVsPreMoveBaseline": c["baselineOccupied"] == c["endOccupied"],
        "windowAllocatorCalls": in_window_calls,
        "freshPairs": ident,
    }


payload = {
    "schema": "wall-family-source-receipt/v1",
    "move": move, "name": name,
    "referenceSha256": {n: sha(REF / n) for n in ("pokeemerald.gba", "pokeemerald.elf", "pokeemerald.map")},
    "sourceSha256": {n: sha(REF / n) for n in SOURCES if (REF / n).is_file()},
    "toolSha256": {n: sha(ROOT / "tools/compare" / n) for n in
                   ("wallFamilyClockProbe.py", "wallFamilyAllocatorCallProbe.py", "wallFamilyScenarios.py",
                    "wallFamilyRunAll.sh", "lightScreenAllocatorCallProbe.py")},
    "profile": "battle-scene-on (same probe profile as the Light Screen receipts)",
    "orientations": {side: derive(side) for side in ("player", "opponent")},
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(payload, indent=1) + "\n")
rawdest.mkdir(parents=True, exist_ok=True)
for side in ("player", "opponent"):
    for i in (0, 1):
        shutil.copy(rawdir / f"{name}-{side}-clock-{i}.json", rawdest / f"{name}-{side}-clock-{i}.json")
print("wrote", out)
