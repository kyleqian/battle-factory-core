# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.


---
## 507 — [BOUNDED WORKER 2026-07-27 ~11:20] Kernel census breadth: B_SCR_OP_JUMPIFNEXTTARGETVALID + B_SCR_OP_SELECTFIRSTVALIDTARGET registered, EFFECT_EARTHQUAKE executable end to end; SETPROTECTLIKE/NEGATIVEDAMAGE/TRYSETREST not started

- **State:** tree green at **248 files / 3395 tests** (+1 file / +10 tests
  over session start 247/3385: new `battleScriptTargetIterationOpcode.test.ts`
  (8 tests), +1 EFFECT_EARTHQUAKE integration test, +1 new `Cmd_bicword`
  pass-through test), `npm run build` clean.
  `executableFrontierRatchet.test.ts`: +1 deliberate, named barrier
  (`battleScriptTargetIterationOpcode.ts`, 1 — the doubles-only
  `jumpifnexttargetvalid` next-target scan, reachability-tested).
- **Did:** registered the census's own named top blocker exactly as
  briefed: `Cmd_selectfirstvalidtarget` has no `BATTLE_TYPE_DOUBLE` branch
  in source at all (same skip-attacker/skip-absent loop for singles and
  doubles), so it registers (a) source-complete with zero barriers.
  `Cmd_jumpifnexttargetvalid` DOES branch on `BATTLE_TYPE_DOUBLE`
  (`battle_script_commands.c:6594`); its `else` arm (singles) is an
  unconditional fallthrough (never jumps), and the `if` arm's own
  incrementing next-target scan (continuing a multi-target spread-move
  loop to another battler slot) is a named (b) barrier, unreachable for
  Level-50 singles, reachability-tested with an explicit doubles fixture.
  **Hidden second blocker found and fixed:** the census's static walk
  marks `Cmd_bicword` "registered" (opcode present) without checking which
  *operand values* are modeled — EFFECT_EARTHQUAKE's real singles path
  (target not underground) hits `bicword gHitMarker,
  HITMARKER_IGNORE_UNDERGROUND`, which was still an existing (b) barrier
  (only `BattleScript_DamagingWeatherContinuesEnd`'s own 4-bit clear was
  modeled). Widened `Cmd_bicword` to also accept this exact sibling pair
  (the natural counterpart to `Cmd_orword`'s already-registered set of the
  same bit) — same 1 barrier call site in the file, narrower trigger
  (only `BattleScript_MoveUsedWokeUp`'s `HITMARKER_WAKE_UP_CLEAR` remains),
  so `PINNED_BARRIER_COUNTS` for that module is unchanged. Without this
  fix, Earthquake would have looked executable in the census but halted
  on every real singles run — worth flagging for the remaining ranked-table
  sets below: **a census "0 missing opcodes" is not proof of a live run;
  budget time to actually execute each flipped effect's full script.**
- **Tests:** `tests/battleScriptTargetIterationOpcode.test.ts` (new, 8
  tests: both opcodes' dispatch in isolation, singles + doubles, the
  doubles barrier's reachability, the "no valid target" invariant throw).
  `tests/battleScriptHitChainOpcode.test.ts` gained a full
  `EFFECT_EARTHQUAKE: full committed script` integration test — the real
  committed script from `BattleScript_EffectEarthquake` through to its own
  `end`, proving Earthquake's actual semantics (not just reachability):
  plain-hit damage lands, the exact 3-roll ground-truth ledger
  (accuracycheck, critcalc, adjustnormaldamage — no 4th
  `seteffectwithchance` roll, since Earthquake sets no secondary move
  effect), and `jumpifnexttargetvalid` genuinely falls through in
  singles rather than looping back.
- **Census re-run (before → after):** 94/214 → **95/214** effects,
  191/355 → **192/355** moves, 153/276 → **154/276** Factory-L50
  unweighted, **1900/2957 → 2047/2957** weighted (+147, exactly
  EFFECT_EARTHQUAKE's weight). EFFECT_EXPLOSION and EFFECT_MAGNITUDE both
  lost the two shared target-iteration opcodes from their own remaining
  blocker lists (still blocked on their own separate opcodes:
  TRYEXPLOSION/SETATKHPTOZERO, MAGNITUDEDAMAGECALCULATION respectively).
  Doc regenerated and committed with the code.
- **Next (ranked table, in order, none started):** `B_SCR_OP_SETPROTECTLIKE`
  (EFFECT_PROTECT/EFFECT_ENDURE, 61 weighted) — scoped and NOT a quick
  follow-up: needs a brand-new persistent per-battler `protectUses` field
  (currently explicitly untracked, see `battleScriptHitChainOpcode.ts`'s
  `cleareffectsonfaint` doc comment), which once modeled also turns
  `cleareffectsonfaint`'s existing "zero it on faint" behavior from a
  no-op into a real write needing its own test; `Cmd_setprotectlike` also
  needs `gBattleCommunication[MULTISTRING_CHOOSER]` message-table
  selection (verify that value's already-modeled printfromtable/message
  path actually covers `B_MSG_PROTECTED_ITSELF`/`B_MSG_BRACED_ITSELF`/
  `B_MSG_PROTECT_FAILED` before assuming it's free) and a decision on the
  `protectUses >= 4` OOB table read (structurally possible after 4
  consecutive successful Protects, vanishingly unlikely — likely its own
  named (b) barrier). Then `B_SCR_OP_NEGATIVEDAMAGE` (EFFECT_ABSORB/
  DREAM_EATER, 49) and `B_SCR_OP_TRYSETREST` (EFFECT_REST, 49), both
  entirely unexamined this session. Given this session's Earthquake
  experience, budget real time per set for a live end-to-end Tier-1 test,
  not just the opcode's own dispatch, since the census cannot see
  per-operand barriers on opcodes it already considers "registered."
- **Notes:** no PAPERCUT. Archived entry 504 to `PROGRESS-archive.md` to
  keep this ledger at 3 live entries (507/506/505).

---
## 506 — [BOUNDED WORKER 2026-07-27 ~10:25] §11.3's 5-step `turn4-doubleteam.json` kickoff wiring landed, 250/250 preserved, regression sweep clean

- **State:** tree green at **247 files / 3385 tests** (+4 over session start
  247/3381: 3 new `presentationEventWindowBridge.test.ts` cases + 1 new
  `turn4DoubleTeamPresentationStaging.test.ts` case), `npm run build` clean,
  `executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers).
- **Did:** executed `docs/presentation-seam-scout.md` §11.3's plan exactly
  (completion note at its new §11.5). (1) `presentationEventWindowBridge.ts`
  gained `resolveDoubleTeamKickoffPresentationWindowContent`, a genuinely
  new `{message, statChange}` shape (no `hp` field), keyed on
  `sourceLabel === "BattleScript_EffectStatUpAfterAtkCanceler"` for both the
  `STRINGID_USEDMOVE` message and the evasion `stat-stage-change` (§11.2's
  own proven co-located pair). (2) `turn4DoubleTeamPresentationStaging.ts`
  gained `resolveTurn4DoubleTeamWindowContent` (stages the real chain, calls
  the new bridge) and `resolveTurn4DoubleTeamKickoffLines` now reads
  `content.message.messageId` from that bridge instead of hardcoding the
  `"STRINGID_USEDMOVE"` literal directly — this closes a doc/code gap the
  module's own comment already claimed but the code didn't yet do.
  `battleScene.ts`'s `drawTurn4KickoffText` now draws
  `TURN4_DOUBLETEAM_KICKOFF_LINE1/2` (resolved once at module load) instead
  of the raw `TURN_KICKOFF_LINE1`/`LINE2` literals; `drawDoubleTeamClones`/
  `drawStatsBanner` choreography untouched, left ungated on `statChange`
  (scout named this optional; existing dispatch booleans already reproduce
  the pixels, gating adds risk with no pixel benefit). Steps 3/4 (steady HP
  overlays, PP-readout starting-PP assumption) left as named residuals per
  the plan, not touched.
- **No literal died:** `TURN_KICKOFF_LINE1`/`LINE2` (`battleMenu.ts:1086,1088`)
  stay defined, still used by turn 1's/turn 2's own kickoff text and
  `drawTurn4RockSlideWindow`'s own dead (unreachable in this trace)
  pre-`statRoseStart` branch — only `drawTurn4KickoffText`'s one call site
  stopped reading them directly.
- **Acceptance:** regression sweep run BEFORE the change matched every
  recorded count with zero pre-existing drift, then re-run AFTER with
  byte-identical results both times — `turn4-doubleteam.json` 250/250 (x2),
  `turn4-rockslide.json` 250/250, `turn1-rockslide.json` 256/256,
  `turn3-rockslide.json` 256/256, `turn3-endeavor.json` 192/192,
  `turn5-rockslide.json` 256/256, `turn5-faint.json` 110/110.
- **Next:** ISSUES #47's movesetIndex-1-3 remainder; §19.5 sites 3-6 /
  §24.5 recipe-only live staging (side); Rung 6/Rung 4 TAUROS is CLOSED
  (entry 502) — do not re-brief it.
- **Notes:** no PAPERCUT.

---
## 505 — [SUPERVISOR 2026-07-27 ~10:15] round 1 verified + merged; round 2 dispatched

- **State:** master green at **247 files / 3381 tests**, build clean, census
  byte-identical on the union. Round 1 both lanes landed and verified:
  main's #47 Channel 2 close (entry 504 below; CV verify script rerun ALL
  PASS by supervisor on the main tree) ∥ side's ENDTURN_ITEMS1
  `RESTORE_HP`/`RESTORE_PP` registration (merged from
  `worker/side-20260727-093552`, worktree/branch cleaned; endturn verify
  script rerun by supervisor in-worktree, 17/17 ALL PASS incl. the new live
  Sitrus fixture: hp 45≤57 gate at frame 4571, +30 heal at 4908 with zero
  new draws, berry consumed next frame). Side's named remainder:
  RESTORE_PP has Tier-1 + source pinning but no live fixture (2 carriers).
- **Round 2 (dispatched):** main → §11.3's 5-step `turn4-doubleteam.json`
  kickoff-phase wiring (new `{message, statChange}` bridge shape keyed on
  `BattleScript_EffectStatUpAfterAtkCanceler`, acceptance 250/250 preserved
  + the §11.4 regression sweep) ∥ side → §24.5 recipe-only CV draw sites,
  DRAW SITE 2 first (cheapest: opponent's own low HP, no mixed kit), then
  relay-pattern sites as cap allows.
- **Next:** verify round 2; then §19.5 sites / #47 movesetIndex-1-3
  remainder as later rounds. (Drift scrub: entry 504's carried "Rung 6/
  Rung 4 TAUROS" Next item is STALE — the Yawn/Thrash ladder closed 6/6 in
  entry 502, incl. Rung 4's TAUROS remainder; do not re-brief it.)
