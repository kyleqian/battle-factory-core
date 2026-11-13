"""parity-mac fourth pass: the one-line summary of a romReplayWide.sh battle (docs/parity-mac/wide-compare.md).
  python3 tools/audio/romReplaySummary.py PREFIX ID SYMBOLS   reads PREFIX.{engine,drive,cmp}.json [PREFIX.tl.json], prints the summary JSON.
`match` is true when the engine finished without error, every engine state (HP x2, gRngValue, last moves) is in the ROM timeline in order, the ROM drive stopped at
the battle outcome having used every decision, both sides name the same winner (gBattleOutcome), and no wide state differs at any decision point.
`class` names the first thing that failed:
  engine-error | legality (the ROM refused a decision, took a refused one, or showed a menu the engine had no decision for) | drive (watchdog / frame cap) |
  state (the HP / RNG / last-move timeline) | outcome (who won) | wide (a wide field at a decision point).
`finalNotes` lists what differs in the state AFTER the deciding blow. It does not fail the match: the ROM goes on with the rest of that turn (the driver waits
for the end-turn handler), the engine stops at the outcome, and the Factory restores the party after every battle; the winner is what carries over."""
import json, sys
from pathlib import Path

LEGALITY = {"rom-refused-decision", "rom-accepted-refused-decision", "rom-refused-switch", "unplanned-action-menu", "unplanned-move-menu", "unplanned-party-menu"}


def summarize(prefix, battle_id, symbols):
    e, d, c = (json.loads(Path(f"{prefix}.{k}.json").read_text()) for k in ("engine", "drive", "cmp"))
    dr = d["drive"]
    reason = (dr.get("error") or {}).get("reason")
    tl = Path(f"{prefix}.tl.json")
    wide = c.get("wide")
    decisions = e["decisions"]
    out = {
        "id": battle_id, "seed": e["seed"], "scene": e["scene"], "policy": e.get("policy", "census"), "symbols": int(symbols),
        "engineError": e["error"], "engineDecisions": len(decisions), "playerStats": e.get("playerStats"),
        "voluntarySwitches": sum(1 for x in decisions if x.get("voluntary")), "probes": sum(1 for x in decisions if x["kind"].endswith("-refused")),
        "drive": {**{k: dr[k] for k in ("stop", "frames", "decisionsConsumed", "decisionsTotal", "outcome")}, "errorReason": reason},
        "frozenTimelineEqualsDrive": dr["timeline"] == json.loads(tl.read_text())["rows"] if tl.exists() else None,
        "matched": c["matched"], "engineStates": c["engineRows"] - 1, "divergence": c["divergence"],
        "outcome": {"engine": e.get("battleOutcome"), "rom": dr["outcome"]},
        "wide": None if wide is None else {k: wide[k] for k in ("compared", "engineStates", "romStates", "diffPoints", "first", "fields", "unreadRomPartyMembers")},
        "finalNotes": None if wide is None else wide["final"],
    }
    state_ok = e["error"] is None and c["divergence"] is None and c["matched"] == c["engineRows"] - 1
    drive_ok = dr["stop"] == "outcome" and dr["decisionsConsumed"] == dr["decisionsTotal"]
    wide_ok = wide is not None and wide["diffPoints"] == 0 and wide["engineStates"] == wide["romStates"]
    outcome_ok = e.get("battleOutcome") == dr["outcome"]
    if e["error"] is not None:
        cls = "engine-error"
    elif reason in LEGALITY:
        cls = "legality"
    elif not state_ok:
        cls = "state"
    elif not drive_ok:
        cls = "drive"
    elif not outcome_ok:
        cls = "outcome"
    elif not wide_ok:
        cls = "wide"
    else:
        cls = None
    out["class"] = cls
    out["match"] = cls is None
    return out


def write_facts(prefix, summary):
    """The engine's record of a matching battle, for the tally: what was decided, the state at every decision, and every turn's events."""
    import gzip
    e = json.loads(Path(f"{prefix}.engine.json").read_text())
    setup = json.loads(Path(f"{prefix}.setup.json").read_text())
    facts = {"id": summary["id"], "seed": summary["seed"], "policy": summary["policy"], "symbols": summary["symbols"], "scene": summary["scene"],
             "outcome": summary["outcome"]["rom"], "mode": setup["descriptor"].get("mode"), "challengeNum": setup["descriptor"].get("challengeNum"), "trainerId": setup["descriptor"].get("trainerId"),
             "decisions": [{k: v for k, v in d.items() if k in ("kind", "slot", "partyIndex", "forced", "voluntary", "source")} for d in e["decisions"]],
             "wide": e["wide"], "finalWide": e["finalWide"], "turnEvents": e.get("turnEvents", []),
             "parties": {side: [{k: m[k] for k in ("species", "ability", "item", "moves", "types")} for m in setup["snapshot"]["parties"][side]] for side in ("player", "opponent")}}
    with gzip.open(f"{prefix}.facts.json.gz", "wt") as f:
        json.dump(facts, f, separators=(",", ":"))


if __name__ == "__main__":
    result = summarize(sys.argv[1], sys.argv[2], sys.argv[3])
    if result["match"]:
        write_facts(sys.argv[1], result)
    print(json.dumps(result))
