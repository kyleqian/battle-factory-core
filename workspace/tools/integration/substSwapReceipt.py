#!/usr/bin/env python3
"""Write tools/integration/fixtures/subst-swap-live-receipt.json from two complete substSwapRun.sh passes.
usage: python3 tools/integration/substSwapReceipt.py <OUT1> <REC1> <OUT2> <REC2> <codeCommit> <srcTree> [gates.json]"""
import hashlib, json, sys
out1, rec1, out2, rec2, commit, tree = sys.argv[1:7]
gates = json.load(open(sys.argv[7])) if len(sys.argv) > 7 else None
def load(rec, n): return json.load(open(f"{rec}/{n}.json"))
def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
scen = sorted({r["probe"].rsplit("-r1.json", 1)[0] for n in ("exact-r1", "golem-player-r1", "golem-control-r1", "seismictoss-unproven-r1")
               for r in load(rec1, n)["results"]})
probes = {s: {"r1": sha(f"{out1}/{s}-r1.json"), "r2": sha(f"{out1}/{s}-r2.json"), "pass2": sha(f"{out2}/{s}-r1.json")} for s in scen}
assert all(v["r1"] == v["r2"] == v["pass2"] for v in probes.values()), "probe digests differ"
same = {n: open(f"{rec1}/{n}.json").read() == open(f"{rec2}/{n}.json").read()
        for n in ("exact-r1", "exact-r2", "golem-player-r1", "golem-player-r2", "golem-control-r1", "golem-control-r2", "neg-lag1", "neg-noIdle")}
assert all(same.values()), same
keep = ("probe", "side", "attacker", "target", "move", "startFrame", "endFrame", "rows", "productionDuration", "exactRows",
        "residualPixels", "swapRowsResidual", "bodyRowsResidual", "digest", "bodyPerRowDigest")
pick = lambda rs: [{k: r[k] for k in keep if k in r} for r in rs]
exact1, exact2 = load(rec1, "exact-r1")["results"], load(rec1, "exact-r2")["results"]
receipt = {
    "schema": "subst-swap-live-receipt/v1",
    "step": "S10A resume item 1: Substitute SWAP status animations (SUBSTITUTE_TO_MON / MON_TO_SUBSTITUTE) as live presentation around a subbed ATTACKER's proven body",
    "codeCommit": commit, "srcTree": tree, "base": "bb4dc2558",
    "countsUnchanged": "status animations, not accepted bodies: 250 scoped-exact + 13 faithful-random + 13 faithful-timing (census 276) unchanged",
    "source": "battle_controller_player.c / battle_controller_opponent.c *DoMoveAnimation (SUBSTITUTE_TO_MON when behindSubstitute && !flag_x8; MON_TO_SUBSTITUTE after the body when multihit < 2); battle_anim_mons.c AnimTask_SwapMonSpriteToFromSubstitute (x2 += (acc += 0x500) >> 8 away, u32 x + x2 + 32 > 304, LoadBattleMonGfxAndAnimate, back until x2 crosses 0)",
    "shadow": "an elevated opponent TARGET of a subbed player attacker: shadow hidden on composite rows 1..43 and every swap-back row (SpriteCB_EnemyShadow while gAnimScriptActive), row 0 keeps the idle latch (subswap-on-player-persian-golbat-bodyslam)",
    "model": "src/engine/liveSubstituteSwap.ts: player 42 script rows (x2 -5..-105, load row 21, back to 0 on row 42), opponent 40 (5..100, load row 20, 0 on row 40); display = task row - 2 (OAM latch); composite = swap-in script rows + idle row + body (activation .. first inactive) + swap-back script rows + its first inactive row = D + 85 / D + 81",
    "provenBodies": {"29": "HEADBUTT (48)", "34": "BODY_SLAM (107)", "73": "LEECH_SEED (141)"},
    "probes": {"runner": "OUT=<fresh> sh tools/integration/substSwapProbes.sh (prep37Probe.py, direct mGBA, each scenario twice from fresh processes, cmp r1 == r2; never the shared HTTP oracles)",
               "passes": 2, "sha256_16": probes},
    "checker": "POKEBENCH_LIVE_ORDER_INPUT=none node --experimental-strip-types tools/integration/substSwapLiveCheck.ts <probe:rgb>... (production renderBattleResolutionLiveView over liveAdapterFramebuffer.ts liveView + the production doll setter applySubstituteDollCommand; full 240x160 frames; window = Special_SubstituteToMon first row .. first inactive row after Special_MonToSubstitute)",
    "orderInput": "none: production lends no sprite order after these histories (the order tracker does not model Substitute); the proven bodies are exact without one",
    "exactWindows": {"count": len(exact1), "rows": sum(r["rows"] for r in exact1), "residualRun1": sum(r["residualPixels"] for r in exact1),
                     "residualRun2": sum(r["residualPixels"] for r in exact2), "windows": pick(exact1)},
    "golemPlayerAttribution": {"note": "GOLEM player Headbutt: swap rows 0 px; body rows carry 92 px (ages 15..38, rows 110..111) identical per row to the NON-subbed control (pre-existing Headbutt adapter limit for GOLEM's back sprite, outside the accepted ZIGZAGOON / ONIX scope), not introduced by the swap",
                               "swapWindows": pick(load(rec1, "golem-player-r1")["results"]), "controlWindows": pick(load(rec1, "golem-control-r1")["results"])},
    "negativeControls": {n: {"windows": len(load(rec1, "neg-" + n)["results"]), "residualPixels": sum(r["residualPixels"] for r in load(rec1, "neg-" + n)["results"])} for n in ("lag1", "noIdle")},
    "unproven": {"SEISMIC_TOSS": "body rows differ from body age 15 (whole field): stays declined", "BITE": "adapter window starts after activation (26 rows vs 40 ROM rows): cannot be framed, declined", "TOXIC": "adapter window 219 vs 230 ROM rows: declined"},
    "postWindowTail": "the first row after the swap-back window shows the doll 5 px out in the ROM (OAM latch; 600 px player / 679 px opponent vs settled); production draws it settled (the next command's first row)",
    "x2HistoryFix": "MOVE_SUBSTITUTE's target role = its own attacker (self-target); the other battler keeps its front idle rest (opponent ONIX x2 +1 through rows 157..1520 after GOLEM's Substitute, subswap-on-player-golem-onix-headbutt)",
    "receiptsByteIdenticalAcrossPasses": same,
    "route": "tests/substituteSwapPresentation.test.ts: generated rentals MEGANIUM seed 103 streak 28, slots [1 Substitute, 0 Leech Seed]: the 73 request presented live (226 composite rows, swap + body kinds), the next prompt opens with the doll shown, Scene ON/OFF boundaries / rules / RNG / facility state equal",
    "reproduce": ["OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/substSwapRun.sh", "a second pass with fresh OUT / REC; cmp the REC json files"],
}
if gates: receipt["gates"] = gates
json.dump(receipt, open("tools/integration/fixtures/subst-swap-live-receipt.json", "w"), indent=1)
open("tools/integration/fixtures/subst-swap-live-receipt.json", "a").write("\n")
print("wrote receipt:", len(exact1), "exact windows")
