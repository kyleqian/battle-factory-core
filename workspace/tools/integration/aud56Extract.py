#!/usr/bin/env python3
"""aud56 (ISSUES #156): verdicts for every general / hit / stat animation unit from one aud56Probe.py batch.

usage: aud56Extract.py <probe-out-dir> <audit.json>
Every job's two fresh runs must be byte-identical (A == B); only A is read. Script intervals with sAnimMoveIndex 0 are keyed by
their script label (KEYS: production unit name <- ROM label); HIT_ANIMATION is keyed by the SpriteCB_HitAnimHealthoxEffect window.
Late changes (8 frames after cleanup) are owned as in prep52Extract.py: the next animation script, or the healthbox hit effect.
Verdicts (docs/allocator-net-zero-audit.md definition):
  NET-ZERO      >= 1 complete instance per side starting from the known entry; EVERY complete instance has baseline == end,
                created == destroyed, no unowned late change, and tiles / palette tags / matrices equal at baseline and end;
                hit windows also release before the next animation script activates.
  NOT NET-ZERO  some complete instance violates that (survivors / freed listed).
  NOT REACHED   no complete instance (stays unaudited: production invalidates).
"""
import hashlib, json, sys
from pathlib import Path

KNOWN_ENTRY = [0, 1, 2, 6, 8, 60, 61, 62, 63]
HIT = ["sInvisibleSpriteTemplate", "SpriteCB_HitAnimHealthoxEffect"]
# production unit (liveSpriteOrderHost.ts event naming) <- ROM script label of the interval (sAnimMoveIndex 0)
KEYS = {
    "STATS_CHANGE": "General_StatsChange",
    "HELD_ITEM_EFFECT": "General_HeldItemEffect",
    "HAIL_CONTINUES": "Move_HAIL",              # General_Hail: goto Move_HAIL
    "SANDSTORM_CONTINUES": "Move_SANDSTORM",    # General_Sandstorm: goto Move_SANDSTORM
    "RAIN_CONTINUES": "General_Rain",
    "SUN_CONTINUES": "Move_SUNNY_DAY",          # General_Sun: goto Move_SUNNY_DAY
    "LEECH_SEED_DRAIN": "General_LeechSeedDrain",
    "WISH_HEAL": "General_WishHeal",
    "INGRAIN_HEAL": "General_IngrainHeal",
    "TURN_TRAP_WHIRLPOOL": "Status_Whirlpool",  # General_TurnTrap: jumpargeq ... (AnimTask_GetTrappedMoveAnimId)
    "TURN_TRAP_FIRE_SPIN": "Status_FireSpin",
    "TURN_TRAP_SAND_TOMB": "Status_SandTomb",
    "TURN_TRAP_BIND": "Status_BindWrap",
    "ITEM_KNOCKOFF": "General_ItemKnockoff",
    "FOCUS_BAND": "General_FocusBand",
    "ITEM_STEAL": "General_ItemSteal",
    "FUTURE_SIGHT_HIT": "General_FutureSightHit",
    "CASTFORM_CHANGE": "CastformChangeContinue",  # General_CastformChange: ... goto CastformChangeContinue
    "FOCUS_PUNCH_SETUP": "General_FocusPunchSetUp",
}
# Emitted by the kernel but never reached / not stageable here: they stay unaudited (production invalidates).
UNREACHED = {
    "SUBSTITUTE_FADE": "plans51: no staging shows General_SubstituteFade (sf-* jobs); not re-staged",
    "SNATCH_MOVE": "no Factory set has Snatch (battle-frontier-mons.json)",
    "DOOM_DESIRE_HIT": "no Factory set has Doom Desire",
    "TURN_TRAP": "Clamp / other wrapped moves (General_TurnTrap -> Status_Clamp): the cl-* staging never showed the trap turn",
    "WEATHER_VAR": "playanimation_var with an argument other than 12 / 13",
    "SCENE_OFF_ATTACK_PAUSE": "scene-off attackanimation pause, not an animation script",
}
out, dest = Path(sys.argv[1]), Path(sys.argv[2])
jobs = json.loads((out / "jobs.json").read_text())


def late_owner(change, later_starts):
    if any(s <= change["frame"] for s in later_starts):
        return "next action: next animation script"
    if change["added"] and all(v == HIT for v in change["added"].values()) and not change["removed"]:
        return "next action: healthbox hit effect"
    return "unowned"


def lead_species(job):
    sc = json.loads((out / "scenarios" / f"{job[1]}.json").read_text())
    return {side: sc["overrides"]["parties"][side][0]["species"] for side in ("player", "opponent")}, sc["seed"]


instances = {k: [] for k in [*KEYS, "HIT_ANIMATION"]}
scen, not_identical = [], []
for job in jobs:
    a, b = out / "raw" / f"{job[1]}-A.json", out / "raw" / f"{job[1]}-B.json"
    same = a.exists() and b.exists() and a.read_bytes() == b.read_bytes()
    species, seed = lead_species(job)
    scen.append({"job": job[1], "purpose": job[0], "base": job[2], "ops": job[3], "seed": seed, "leads": species, "identicalAB": same,
                 "rawSha256": hashlib.sha256(a.read_bytes()).hexdigest() if a.exists() else None})
    if not same:
        not_identical.append(job[1]); continue
    r = json.loads(a.read_text())
    starts = [x["activation"] for x in r["bodies"]]
    for x in r["bodies"]:
        if x["moveIndex"] != 0:
            continue
        unit = next((u for u, lab in KEYS.items() if lab == x["script"]), None)
        if unit is None:
            continue
        side = "player" if x["attacker"] in (0, 2) else "opponent"
        row = {"job": job[1], "activation": x["activation"], "side": side, "species": species[side]}
        if "error" in x:
            row["incomplete"] = x["error"]
        else:
            later = [s for s in starts if s > x["activation"]]
            late = [{"frame": c["frame"], "owner": late_owner(c, later)} for c in x["lateChanges"]]
            row.update({"cleanup": x["cleanup"], "baseline": x["baseline"], "end": x["end"], "created": x["created"], "destroyed": x["destroyed"],
                        "survivors": x["survivors"], "freed": x["freed"], "late": late, "gfxNetZero": x["gfxNetZero"],
                        "netZero": x["baseline"] == x["end"] and x["created"] == x["destroyed"] and x["gfxNetZero"]
                        and all(c["owner"] != "unowned" for c in late)})
        instances[unit].append(row)
    for h in r["hits"]:
        side = {0: "player", 1: "opponent"}.get(h.get("battler"), "unknown")
        row = {"job": job[1], "activation": h["created"], "side": side, "species": species.get(side)}
        if "error" in h:
            row["incomplete"] = h["error"]
        else:
            row.update({"cleanup": h["released"], "lifetime": h["lifetime"], "slot": h["slot"], "baseline": h["baseline"], "end": h["end"],
                        "created": h["createdInWindow"], "destroyed": h["destroyedInWindow"], "nextScriptActivation": h["nextScriptActivation"],
                        "releasedBeforeNextScript": h["releasedBeforeNextScript"], "gfxNetZero": h["gfxNetZero"],
                        "netZero": h["netZero"] and h["releasedBeforeNextScript"] and h["gfxNetZero"]})
        instances["HIT_ANIMATION"].append(row)

units = []
for unit, rows in instances.items():
    complete = [r for r in rows if "incomplete" not in r]
    known = {s: sum(1 for r in complete if r["side"] == s and r["baseline"] == KNOWN_ENTRY) for s in ("player", "opponent")}
    bad = [r for r in complete if not r["netZero"]]
    verdict = ("NOT REACHED" if not complete else "NOT NET-ZERO" if bad
               else "NET-ZERO" if known["player"] and known["opponent"]
               else f"NET-ZERO ({'player' if known['player'] else 'opponent'} battler only)")
    units.append({"unit": unit, "key": "SpriteCB_HitAnimHealthoxEffect window" if unit == "HIT_ANIMATION" else KEYS[unit], "verdict": verdict,
                  "completeInstances": len(complete), "incompleteInstances": len(rows) - len(complete), "fromKnownEntry": known,
                  "species": sorted({r["species"] for r in complete if r["species"] is not None}),
                  "createdPerInstance": sorted({r["created"] for r in complete}),
                  "lifetimes": sorted({r["lifetime"] for r in complete}) if unit == "HIT_ANIMATION" else None,
                  "lateOwners": sorted({c["owner"] for r in complete for c in r.get("late", [])}),
                  "notNetZero": bad, "jobs": sorted({r["job"] for r in rows}), "instances": rows})
for unit, why in UNREACHED.items():
    units.append({"unit": unit, "verdict": "UNAUDITED", "reason": why})
receipt = {"schema": "aud56-net-zero-audit/v1", "knownEntry": KNOWN_ENTRY, "jobs": len(jobs), "runs": 2 * len(jobs),
           "allIdenticalAB": not not_identical, "notIdenticalAB": not_identical,
           "probeSha256": hashlib.sha256(Path("tools/integration/aud56NetZeroProbe.py").read_bytes()).hexdigest(),
           "units": units, "scenarios": scen}
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(receipt, indent=1, sort_keys=False) + "\n")
for u in units:
    if "completeInstances" in u:
        print(f'{u["verdict"]:<12} {u["unit"]:<22} n={u["completeInstances"]:>3} (+{u["incompleteInstances"]} incomplete) known-entry ply/opp={u["fromKnownEntry"]["player"]}/{u["fromKnownEntry"]["opponent"]} species={u["species"]} created={u["createdPerInstance"]} late={u["lateOwners"]}')
    else:
        print(f'{u["verdict"]:<12} {u["unit"]:<22} {u["reason"]}')
print("jobs", len(jobs), "A==B all:", not not_identical, not_identical)
