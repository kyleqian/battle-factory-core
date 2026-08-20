# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1368 — [main worker, 2026-08-20] **#105 FIXED: STRINGID_PKMNCHANGEDTYPE `messageLines` case added (Conversion/Conversion 2/Camouflage); soak seed 40 now runs to an honest OK (`1df9dcb6`)**

- **State:** `src/engine/battleResolutionPresentation.ts` +
  `src/engine/factoryBattleScriptFullTurnDecision.ts` (fix),
  `tests/presentationStringIssue105.test.ts` (new), `ISSUES.md` (#105
  deleted, fully fixed). Commit `1df9dcb6`. `npm test` 1080 files/10177
  passed (44/223 skipped, unchanged), `npm run build` and `npm run
  typecheck` green.
- **Did:** `BattleScript_EffectConversion`/`Conversion2`/`Camouflage`
  (`data/battle_scripts_1.s:664,1282,2805`) all print
  `STRINGID_PKMNCHANGEDTYPE` ("{B_ATK_NAME_WITH_PREFIX} transformed\ninto
  the {B_BUFF1} type!") after their own already-ported type-change opcode
  (`battleScriptTypeChangeOpcode.ts`, which already records the chosen type
  into `rulesContext.battleTextBuff1Type`); none reassign selectorRoles, so
  BS_ATTACKER stays the move's own still-current user. Wired the
  substitution in `factoryBattleScriptFullTurnDecision.ts`'s `prepareMessage`
  ternary (`TYPE_DISPLAY_NAMES[battleTextBuff1Type]`, the same
  `gTypeNames`-derived table `STRINGID_PKMNCHANGEDTYPEWITH`/Color Change
  already uses) and added the `messageLines` case. Pinned in
  `presentationStringIssue105.test.ts` (real player CONVERSION,
  red-verified via `git stash` — reproduced the exact soak crash string
  pre-fix). **Seed 40 (original repro): OK budget, 1,000,000f, 24.9s,
  carry<=21 depth<=21** — no crash. Neighbourhood `winning --seeds 38:44`:
  **OK 6, CRASH 0, HANG 0**.
- **Sibling check:** grepped all 4 real-source `PREPARE_TYPE_BUFFER(gBattleTextBuff1,
  ...)` call sites — `Cmd_tryconversiontypechange`,
  `Cmd_settypetorandomresistance` (2 sites), `Cmd_settypetoenvironment` all
  feed `STRINGID_PKMNCHANGEDTYPE` (now fixed); Color Change's
  `ABILITYEFFECT_ON_DAMAGE` branch (`battle_util.c:2761`) feeds
  `STRINGID_PKMNCHANGEDTYPEWITH`, which already had a resolver. No
  remaining gaps.
- **Emitter seed 40 hit:** verified in a throwaway worktree at the pre-fix
  parent commit — turn 24 crashes right after the player confirms FIRE
  BLAST (move 126); the type-change move that actually triggers
  `STRINGID_PKMNCHANGEDTYPE` belongs to the AI-controlled opposing trainer
  battler for that same turn, which the driver's verbose log does not name
  (it only echoes the player's own FIGHT confirmations). Not distinguished
  between Conversion/Conversion2/Camouflage specifically, but immaterial —
  all three funnel through the identical opcode + STRINGID + fix, confirmed
  by the seed rerunning clean.
- **Next:** #104 (engine half: stub continuation for terminal
  YES/cancel) is the next highest-value open item per 1367. A full honest
  0:60/0:20/0:60 gate re-sweep is still owed once that lands.
- **Notes:** no PAPERCUT. Landed inside the 30-min cap.

---

## 1367 — [main worker, 2026-08-20] **#104 driver half FIXED: per-round grace re-arm + honest HANG reporting; unmasked finding — the terminal record-YES/cancel dead end is near-universal, not a deep-chain rarity (`428ba1c4`)**

- **State:** `tools/soak/randomRoundSoakDriver.ts`/`randomRoundSoak.ts` +
  `tests/randomRoundSoak.test.ts` changed (`428ba1c4`); no `src/`. `npm test`
  10152/10152 (223 skipped), `npm run build`, `npm run typecheck` all green.
- **Did:** `terminalGrace` now re-arms on every `graceActive` falling edge (a
  genuine re-chain) instead of counting down a single cumulative 9,000-frame
  budget shared across every chained round; expiry with no lobby reached and
  no re-chain now returns `HANG` + `hangSurface: "factoryTerminal"` + the
  decided round's own `endState`, instead of a false `OK`. New describe
  "ISSUES #104 (driver)": (a) seed 328 `winning` @ 260k frames now honestly
  reports HANG (was the silent-OK carry-21 "wall" of PROGRESS 1365/1366); (b)
  seed 34 `winning` reaches carry 14 (2 full chained round wins) before its
  own dead end, proving re-arming doesn't cap chaining depth. Retargeted the
  pre-existing ISSUES #89 seed-27 pin to `stopAtFirstRoundDecision: true` —
  it now also hits a #104 dead end at its old 80k budget, unrelated to its
  own (Baton Pass) concern.
- **Finding (big):** brief's own pin-(b) premise (seed 4/5 "finish OK" per
  `docs/soak-depth-measure-2026-08-19.md`) was FALSE once measured honestly —
  BOTH dead-end on `recordChoice` (`"cancel"`/`"yes"`) with carry 0. Widened
  to small honest samples post-fix: **`winning` 15/15 HANG@factoryTerminal
  (seeds 0:15), `vanilla` 10/10 (seeds 0:10), `full` 10/10 (seeds 0:10)** —
  reduced ranges, not the brief's full 0:60/0:20/0:60, given the 40-min cap
  (each seed now runs to ITS OWN genuine dead end or the frame budget, not a
  quick artificial cutoff). The dead end is NOT winning-policy-specific or
  win-only: `advanceFactoryTerminalRecordPrompt` is shared machinery for
  lost rounds too (loss presentation carries the same `recordChoice` field),
  and the terminal's random A/B/UP/DOWN walk (shared across all 3 policies)
  lands on YES/cancel with near certainty given enough presses across enough
  rounds. Also confirmed structurally: `lobbyFreeRoam` is architecturally
  unreachable via decline under the driver's default `generated-orchestrator`
  route (continuous-play chaining always re-chains a "no" straight into a
  fresh draft, `core.ts:~837-843`) — so every historical non-milestone,
  non-`stopAtFirstRoundDecision` "OK" sweep result, at ANY policy, was always
  a grace-expiry artifact, never a genuine reach of the Lobby. ISSUES #104
  trimmed to its (now clearly-scoped, high-value) engine-half remainder.
- **Next:** engine half of #104 (stub continuation for YES/cancel, RECORD is
  stub-only per the 2026-08-05 decision) is now the highest-value open item —
  fixing it should turn most of the sample above into genuine OKs at the
  Lobby (well, still capped by continuous-play chaining re-entering a draft
  instead — the decline path is unaffected, only yes/cancel gain a
  continuation). A full honest 0:60/0:20/0:60 gate re-sweep is still owed
  once that lands; today's reduced samples are real numbers, not a stand-in.
- **Notes:** no PAPERCUT. Time ran over the 40-min soft cap (~55 min) — the
  brief's pin-(b) seeds turned out to require live investigation (a wrong
  premise, not a typo) before an honest alternative could be written, and
  the full `npm test` run alone took ~3.3 min; landed everything green
  rather than cut the investigation short and risk a dishonest pin.

---

## 1366 — [supervisor fold, 2026-08-20] **Carry-21 "wall" is a driver-masked engine dead end (#104: terminal record-YES/cancel never continues; soak grace cumulative + expiry reported OK) — found by supervisor probe; switch lever C2 + #104-refutation test folded (`3fa78a98`)**

- **State:** master = 1365 sweep docs + side C2 (`5b31b1ea`: `winning`
  switches only out of a true-immunity wall with a ≥50%-HP bench answer;
  38/13/2 of 60 vs 36/10/0 decline-only, 30 switches) + side refutation
  pin (`bc8acc23`, end-turn skip claim REFUTED, later battler keeps its
  tick). Union: soak file + new test 33/33, smoke 444/444. PAPERCUTS bumped
  (`fdf46ebb`: absolute-path commit on master + reset --hard by a side
  worker; pinned-line census citations, incl. the supervisor's own hit).
- **Finding:** all three deepest 0:480 seeds (125/328/409) stop at
  `roundComplete carry<=21`. Probe (scratch print at grace expiry, reverted):
  `factoryTerminal.recordChoice:"yes"`, no `declineFarewellReleaseAge`, no
  re-chain; grace 9k→90k changes only the frame count. Driver's
  `terminalGrace` is set once and never re-armed → cumulative across
  re-chains (~1k each) → expiry reported OK. Filed **#104** (engine + driver
  halves). So "carry ≥ 28 not reached" (1365) is NOT evidence about the AI
  tier; the depth instrument was capped at ~3 re-chains since M-A.
- **Next:** main: driver half of #104 (per-round grace, HANG on stall) +
  pin; side: engine half (stub continuation for YES/cancel per the RECORD
  stub-only decision) + pin; then one more 0:480 sweep on the union for the
  carry ≥ 28 tier. Withheld: draft-by-strength (`e9a415a7`) pending n≥180.
- **Notes:** lesson banked — a sweep's "deepest seed stops at X" claim needs
  the END SURFACE of those seeds inspected before it is attributed to game
  difficulty; three sweeps attributed an instrument cap to the AI.

---

Older entries: see `PROGRESS-archive.md`.
