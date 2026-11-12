# `winning` depth probe at 4,000,000 frames — the 7 carry-28 seeds (2026-08-22, supervisor)

Tree: master `cd59eeec` (animation fold; engine identical to the 1370/1371 tree).
Command per seed: `node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed N --policy winning --render-every 0 --max-frames 4000000`
(4× the `winning` default of 1,000,000; PROGRESS 1371 "Next" item 3 asked whether the
1M budget was truncating the challenge-4+ tier).

| seed | result | end | max carry | max depth | wall-clock |
|---|---|---|---|---|---|
| 24 | OK budget | b2 t10 | 28 | 28 | 95 s |
| 63 | OK budget | b7 t3 | 28 | 28 | 96 s |
| 78 | OK budget | — | 28 | 28 | 100 s |
| 92 | OK budget | — | 28 | 28 | 101 s |
| 190 | OK budget | — | 28 | 28 | 96 s |
| 222 | OK budget | — | 28 | 28 | 99 s |
| 233 | OK budget | — | 28 | 28 | 95 s |

**Reading.** 7/7 OK, 0 CRASH, 0 HANG across 28M frames of continuous play, and no seed ever
exceeded carry 28 — i.e. none won a round at carry 28. `maxBattleDepth = carry + battleIndex`
stayed 28, so no seed even won **battle 1** of a carry-28 round. Carry 28 is `challengeNum 4`, the
tier where `GetAiScriptsInBattleFactory` (`battle_factory.c:900-911`) switches the opponent from
`CHECK_BAD_MOVE` alone to `CHECK_BAD_MOVE | TRY_TO_FAINT | CHECK_VIABILITY`, and opponent fixed IVs
reach 15. Seed 24's verbose transcript: rounds 1-4 won, round 5 lost at battle 1 after 7 turns
(all three player mons fainted); a later carry-28 round lost at battle 1 after 20 turns. These are
ordinary losses with normal move/forced-switch traffic — no engine anomaly on the end surface. So the
1M budget was NOT the limiter (the 1370 "instrument ceiling" caveat is withdrawn); the `winning`
policy's ceiling is the challenge-5 AI tier. Whether that tier is beatable by a stronger
arbitrary-but-legal policy is a policy question, not a crash-coverage one; M-B's bar/stretch stand.

**Caveat on every "carry ≥ 7" number to date.** The first round of every seed drafts from the
pinned anchor pool (`ANCHOR_SAVED_RENTAL_SET_IDS`, `factoryAnchorSession.ts`), so "carry ≥ 7 in
240/240" (1370) measures the anchor draft, not a generic challenge-0 round. Live-generated carry-0
rounds later in the same runs are won far less often (seed 24's transcript: well under half).
Deeper-carry rates are unaffected (those rounds are all live-generated).

**Determinism check.** Seed 63 at 1M frames ends `b3 t1 carry<=28` identically on (a) the 1370
tree, (b) master with the in-flight string-fix edits, (c) a clean `cd59eeec` worktree, and (d) the
same with `--verbose`; the 4M run's first 1M frames are the same trajectory. Transcript round tables
that key on "6 swap offers" cannot distinguish a 7th-battle loss from a round win — use the driver's
`maxCarriedWinStreak`, not a transcript count, for carry claims.

**Driver papercut found on the way.** The verbose `bN tM` label and `switchedAgainstOpponentIndices`
reset only when `battleIndex` changes; a battle-1 loss followed by a new round's battle 1 keeps the
old turn count (labels like `b1 t12` at a new battle's first turn) and the policy's switched-set leaks
into the next round (PAPERCUTS).
