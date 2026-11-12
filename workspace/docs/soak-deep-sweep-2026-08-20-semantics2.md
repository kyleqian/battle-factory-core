# `winning` deep sweep, 0:240 — 2026-08-20, new soak semantics (M-B step 3 re-run)

Re-measures `winning`-policy play depth at scale on the post-#104/#105 tree
(master `ef9723c9`), under the **new** OK/HANG semantics from `7621f810`:
**OK** = the seed's frame budget (1,000,000f) is reached while still
progressing (`endState: "budget"`), or `--max-rounds` is hit; **HANG** = 30,000
frames with zero progress. This supersedes every earlier `winning` depth
number measured under the OLD semantics (grace-expiry "OK" could mask a dead
end) — **only rows measured under the new semantics are comparable to each
other**; the pre-08-20 sweeps below are included for size/history context
only, not as a fair before/after.

## Command

Seeds 0:240, `--render-every 0`, run as three sequential batches of four
parallel foreground processes each (20-seed chunks, ≤4 concurrent per the
brief — this host is shared with other supervisors):

```
node --experimental-strip-types tools/soak/randomRoundSoak.ts --policy winning \
  --seeds <A:B> --render-every 0 --json <chunk.json>
```

12 chunks: `0:20 20:40 40:60 60:80 80:100 100:120 120:140 140:160 160:180
180:200 200:220 220:240`. Raw per-seed lines, in seed order, are in
`docs/soak-deep-sweep-2026-08-20-semantics2.log`. Wall clock: batch 1
(0:80) 8m12s, batch 2 (80:160) 7m57s, batch 3 (160:240) 8m32s — ≈24.7 min
total for 240 seeds at 4-way parallelism (~24.7-30s/seed serial cost,
matching the brief's estimate).

## Result: 238 OK / 2 CRASH / 0 HANG (240 seeds)

- **OK (budget):** 238/240 — every one reached the full 1,000,000-frame
  budget while still progressing; none hit `--max-rounds` (unset) or a
  genuine stall.
- **CRASH:** 2/240 — seeds 138, 203 (both new signatures/repros; triaged
  below).
- **HANG:** 0/240.

## Depth distribution

| threshold | count | % | seeds |
| --- | --- | --- | --- |
| carry ≥ 7  (challengeNum ≥ 1) | 240/240 | 100.0% | all |
| carry ≥ 14 (challengeNum ≥ 2) | 218/240 | 90.8% | (too many to list; see log) |
| carry ≥ 21 (challengeNum ≥ 3) | 48/240 | 20.0% | 15,16,24,33,35,36,40,46,47,48,50,57,58,61,63,69,71,77,78,79,90,92,94,102,113,121,124,125,126,129,136,143,144,145,148,153,162,167,179,188,190,192,199,217,218,222,225,233 |
| carry ≥ 28 (challengeNum ≥ 4) | 7/240 | 2.9% | 24, 63, 78, 92, 190, 222, 233 |

- **Deepest carry anywhere:** 28 — the 7 seeds above (none went deeper; all
  7 hit the frame budget still inside their post-28 round, none reached a
  29th win).
- **Deepest battle-depth anywhere:** 28 (tracks carry exactly at these
  seeds' peaks — see verbose confirmation below).

carry ≥ 28 (challengeNum 4, i.e. the AI-tier step-up starting the 5th
7-battle challenge) is reached by honest continuous play at **7/240 (2.9%)**
under the new semantics — up from the supervisor's own 0:60 sample
(1/60, seed 24) reported in PROGRESS 1369, consistent with a larger sample
turning up more of the same tail. No seed reached carry 29+ in this sweep;
all 7 carry-28 seeds were still mid-round (battle 1-3 of round 5) when the
1,000,000-frame budget expired — this is an instrument ceiling
(`--max-frames`/budget), not evidence of a hard wall at carry 28.

## Comparison table (same-semantics rows only truly comparable)

| sweep | policy | semantics | seeds | OK | CRASH | HANG | carry≥7 | carry≥14 | carry≥21 | carry≥28 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 08-19 `winning` 0:180 (`docs/soak-depth-measure-2026-08-19.md`) | winning | OLD (grace) | 180 | n/a | n/a | n/a | 35.6% | 5.6% | 0% | 0% |
| pre-#104 0:480 (`docs/soak-deep-sweep-2026-08-20-final.md`) | winning | OLD (grace) | 480 | n/a | n/a | n/a | 42.7% | 11.3% | 1.0% | 0% |
| supervisor 0:60 (PROGRESS 1369) | winning | **NEW** | 60 | 58 | 2 (#105, now fixed) | 0 | 100% | 93.3% | 21.7% | 1.7% (seed 24) |
| **this sweep, 0:240** | winning | **NEW** | 240 | 238 | 2 (#106, #102 repro) | 0 | 100% | 90.8% | 20.0% | **2.9%** |

Only the two **NEW**-semantics rows (supervisor 0:60 and this 0:240) are
directly comparable — both use the post-#104 continuous-play OK/HANG
definitions. The two OLD-semantics rows (08-19 and pre-#104 0:480) measured
a materially different, more lenient "OK" (a per-round grace budget that
could silently mask a `factoryTerminal` dead end as success — see #104,
PROGRESS 1367) and are shown only for historical sample-size context, not as
a fair before/after; their carry≥N percentages are NOT directly diffable
against the new rows. Within the two new-semantics rows, 240 seeds land
close to the 60-seed sample (carry≥14 90.8% vs 93.3%, carry≥21 20.0% vs
21.7%, carry≥28 2.9% vs 1.7%) — no regression, consistent variance at this
sample size.

## Deepest seeds, `--verbose` confirmation (not committed)

Ran `--seed 24 --verbose --render-every 0` and `--seed 63 --verbose
--render-every 0` (both carry 28, the sweep's deepest) to confirm the chain
is genuine continuous play, not an artifact. Output not committed (each is
~86k lines); quoting the tail only.

**Seed 24** — `seed 24 OK b3 t11 1000000f 23.0s budget carry<=28 depth<=28`.
Tail:
```
[f=999983 b3 t11] resolution advance
[f=999991 b3 t11] resolution advance
[f=999999 b3 t11] resolution advance
seed   24  OK     b3 t11  1000000f  23.0s  budget  carry<=28 depth<=28
=== depth distribution ===
carry >= 7  (challengeNum >= 1): 1/1
carry >= 14 (challengeNum >= 2): 1/1
carry >= 21 (challengeNum >= 3): 1/1
carry >= 28 (challengeNum >= 4): 1/1
```
carry 28 = 4 completed 7-battle challenges (28 wins); `challengeNum =
floor(28/7) = 4` — the "challenge-4" AI tier step-up the supervisor's
PROGRESS 1369 named. The budget expired mid-round-5, battle 3, turn 11 —
still resolution-advancing (not stalled), i.e. genuinely still playing when
the instrument's 1,000,000-frame ceiling hit, not a wall.

**Seed 63** — `seed 63 OK b3 t1 1000000f 23.3s budget carry<=28 depth<=28`.
Same challenge-4 tier (carry 28); budget expired mid-round-5, battle 3, turn
1 — again mid-resolution, not stalled.

Both confirm: the chain to carry 28 is genuine iterative play (draft → 4
full round wins → into a 5th round), and the ceiling both seeds hit is the
1,000,000-frame instrument budget, not a crash or hang.

## Triage

Two new CRASH signatures this sweep (next free ISSUES number: **#106**).

### Seed 138 — matches existing ISSUES #102 (now has a live repro again)

`seed 138 CRASH b5 t3 976153f [engine/tick] Error: Cmd_switchhandleorder:
battler 1 has no decided monToSwitchIntoId -- openpartyscreen must run
first  carry<=14 depth<=15`. Stack:
```
<anon> (src/engine/battleScriptSwitchinOpcode.ts:326)
stepBattleScriptMachine (src/engine/battleScriptMachine.ts:879)
runScriptToOwnEnd (src/engine/battleScriptFaintedActionsOrchestration.ts:285)
```
Last actions before the crash:
```
f=976102 b5 t2 resolution advance
f=976115 b5 t2 resolution advance
f=976124 b5 t2 resolution advance
f=976127 b5 t2 resolution advance
f=976137 b5 t2 resolution advance
f=976145 b5 t3 action menu intent: FIGHT
f=976145 b5 t3 action: FIGHT
f=976153 b5 t3 fight menu intent: slot 0 (move 185)
f=976153 b5 t3 fight: confirm slot 0
```
This is the **exact** stack and error string ISSUES #102 (opened
2026-08-20 from a since-shifted seed 154 repro, later marked
non-reproducing on HEAD). Repro:
`node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 138
--policy winning --verbose --render-every 0`. Not fixed here (docs-only
step, `src/` off-limits per the brief); ISSUES #102 updated in place with
this fresh repro instead of opening a new number, since the signature is
identical.

### Seed 203 — NEW signature, filed as #106

`seed 203 CRASH b1 t13 490300f  [engine/tick] Error: battleStringResolver:
STRINGID_PKMNATTACK references placeholder {B_BUFF1} with no resolver
supplied  carry<=14 depth<=18`. Stack:
```
resolveBattleStringLines (src/engine/battleStringResolver.ts:170)
messageLines (src/engine/battleResolutionPresentation.ts:3015)
projectBattleResolutionCommands (src/engine/battleResolutionPresentation.ts:3188)
```
Last actions before the crash:
```
f=490240 b1 t12 resolution advance
f=490263 b1 t12 resolution advance
f=490281 b1 t12 resolution advance
f=490294 b1 t13 action menu intent: FIGHT
f=490294 b1 t13 action: FIGHT
f=490300 b1 t13 fight menu intent: slot 0 (move 118)
f=490300 b1 t13 fight: confirm slot 0
```
Move 118 = `MOVE_METRONOME` (`reference/pokeemerald/include/constants/moves.h:122`).
`STRINGID_PKMNATTACK` = `"{B_BUFF1}'s attack!"`
(`reference/pokeemerald/src/battle_message.c:218,670`), printed only by
`BattleScript_EffectBeatUp`'s `BattleScript_BeatUpLoop`
(`reference/pokeemerald/data/battle_scripts_1.s:1946-1951`, right after
`trydobeatup`) — Beat Up prints one "`<party member>`'s attack!" per
participating party member, each needing `B_BUFF1` set to that member's
nickname. Leading theory (not verified against source this session):
Metronome called Beat Up and this port's Beat Up path never wires a
`B_BUFF1` resolver for `STRINGID_PKMNATTACK`, either generally or only via
the Metronome-invoked call path. Filed as **ISSUES #106**, not fixed here.
