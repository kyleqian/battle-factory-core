#!/usr/bin/env python3
"""Live audit 22 target 3 (docs/live-audit-22.md): land87's post-KO send-out allocator reseed through the words-unit occupancy shadow, with
OTHER species and a SECOND KO in the same pending chain. reseed85Probe.py's machinery unchanged (words57Probe.py scenarios: explicit lab
seed 305419897 = ISSUES #154, mon(), one FIGHT turn per step; the KO's "fainted" text consumes the next turn's inputs), only the win-*
probes (flat77Probe.py: activation RAM + RGB frames), A and B in one batch in separate fresh mGBA processes.
  single KO, other species: the slow player SLOWPOKE 79 (speed IV 0) Swift-KOs a frail, faster words-unit lead (SPEAROW 21 L18 Sand-Attack /
    Mud-Slap, PSYDUCK 54 L15 Rain Dance); the send-out mon is the allocator consumer (CHANSEY 113 Protect, MR_MIME 122 Reflect), or the
    player's lead holds it (Light Screen, cursor RIGHT on the consumer turn);
  ko2: TWO KOs in one pending chain: words unit -> Swift KO -> send-out -> a second words unit -> Swift KO -> send-out -> the consumer
    (player Protect / Reflect, or the opponent's third mon's Protect if the Factory AI sends it last). The three opponent species are
    DISTINCT (PIDGEY 16 L15, PSYDUCK L12 / L15, SPEAROW L18): the fixture derivation detects a KO by the target's species change, so a
    same-species send-out hides the KO (a first run with 3x PSYDUCK did exactly that).
  fl: land87's Flatter 260 route (Flatter -> KO -> send-out), one and two KOs; SLOWPOKE's ability slot 1 (Own Tempo) blocks the confusion.
usage (from workspace/, PYTHONPATH = the libmgba-py checkout): audit22ReseedProbe.py <out-dir> [--jobs J=12]
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, "tools/integration")
import reseed85Probe as R
import words57Probe as W
from words57Probe import mon

SLOWPOKE, SPEAROW, PSYDUCK, PIDGEY, CHANSEY, MR_MIME = 79, 21, 54, 16, 113, 122
SA, MS, RD, FLATTER, SWIFT, LEER, PROTECT, REFLECT, LSCREEN = 28, 189, 240, 260, 129, 43, 182, 115, 113
BENCH_P = R.BENCH_P


def ply(*moves, own_tempo=False):
    lead = mon(SLOWPOKE, moves=(SWIFT, *moves) if moves else (SWIFT,) * 4, speed_iv=0)
    if own_tempo:  # SLOWPOKE ability slot 1 = OWN_TEMPO: a Flatter cannot confuse it (no self-hit replaces the KO Swift)
        lead["abilitySlot"] = 1
    return [lead] + BENCH_P


ONE_KO_OPP, ONE_KO_PLY = [None, None], [None, None, "RIGHT"]
TWO_KO_PLY, TWO_KO_OPP = [None, None, None, None, "RIGHT"], [None, None, None, None]
JOBS = [
    ("a22rs-sa-opp-spearow-chansey-protect", SA, "opponent", "ko", ply(),
     [mon(SPEAROW, 18, (SA,) * 4), mon(CHANSEY, moves=(PROTECT,) * 4), mon(CHANSEY, moves=(PROTECT,) * 4)], ONE_KO_OPP),
    ("a22rs-rd-opp-psyduck-mrmime-reflect", RD, "opponent", "ko", ply(),
     [mon(PSYDUCK, 15, (RD,) * 4), mon(MR_MIME, moves=(REFLECT,) * 4), mon(MR_MIME, moves=(REFLECT,) * 4)], ONE_KO_OPP),
    ("a22rs-ms-ply-slowpoke-lightscreen", MS, "opponent", "ko", ply(LSCREEN, LSCREEN, LSCREEN),
     [mon(SPEAROW, 18, (MS,) * 4), mon(CHANSEY, moves=(LEER,) * 4), mon(CHANSEY, moves=(LEER,) * 4)], ONE_KO_PLY),
    ("a22rs-ko2-sa-ply-slowpoke-protect", SA, "opponent", "ko", ply(PROTECT, PROTECT, PROTECT),
     [mon(SPEAROW, 18, (SA,) * 4), mon(PIDGEY, 15, (SA,) * 4), mon(PSYDUCK, 12, (SA,) * 4)], TWO_KO_PLY),
    ("a22rs-ko2-rd-ply-slowpoke-reflect", RD, "opponent", "ko", ply(REFLECT, REFLECT, REFLECT),
     [mon(PSYDUCK, 15, (RD,) * 4), mon(PIDGEY, 15, (RD,) * 4), mon(SPEAROW, 18, (RD,) * 4)], TWO_KO_PLY),
    ("a22rs-ko2-ms-opp-spearow-chansey-protect", MS, "opponent", "ko", ply(),
     [mon(SPEAROW, 18, (MS,) * 4), mon(SPEAROW, 18, (MS,) * 4), mon(CHANSEY, moves=(PROTECT,) * 4)], TWO_KO_OPP),
    # land87's Flatter 260 route (FLATTER -> KO -> send-out), SLOWPOKE with Own Tempo
    ("a22rs-fl-opp-spearow-chansey-protect", FLATTER, "opponent", "ko", ply(own_tempo=True),
     [mon(SPEAROW, 18, (FLATTER,) * 4), mon(CHANSEY, moves=(PROTECT,) * 4), mon(CHANSEY, moves=(PROTECT,) * 4)], ONE_KO_OPP),
    ("a22rs-fl-ply-slowpoke-reflect", FLATTER, "opponent", "ko", ply(REFLECT, REFLECT, REFLECT, own_tempo=True),
     [mon(SPEAROW, 18, (FLATTER,) * 4), mon(CHANSEY, moves=(LEER,) * 4), mon(CHANSEY, moves=(LEER,) * 4)], ONE_KO_PLY),
    ("a22rs-ko2-fl-ply-slowpoke-protect", FLATTER, "opponent", "ko", ply(PROTECT, PROTECT, PROTECT, own_tempo=True),
     [mon(SPEAROW, 18, (FLATTER,) * 4), mon(PIDGEY, 15, (FLATTER,) * 4), mon(PSYDUCK, 12, (FLATTER,) * 4)], TWO_KO_PLY),
]

if __name__ == "__main__":
    argv = sys.argv[1:]
    out = Path(argv[0])
    jobs = int(argv[argv.index("--jobs") + 1]) if "--jobs" in argv else 12
    for job in JOBS:
        W.scenario(out, job)
    with ThreadPoolExecutor(jobs) as ex:
        results = list(ex.map(R.run, [(out, j, "win", r) for j in JOBS for r in ("A", "B")]))
    missing = [f"win-{i}-{r}" for i, k, r, ok in results if not ok]
    same = [i for i, k, r, ok in results if r == "A" and ok
            and (out / "raw" / f"win-{i}-A.json").read_bytes() == (out / "raw" / f"win-{i}-B.json").read_bytes()]
    print(len(results), "probe runs;", "missing:", missing or "none", ";", len(same), "of", len(JOBS), "probe pairs A == B")
