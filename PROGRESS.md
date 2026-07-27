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
## 515 — [SUPERVISOR 2026-07-27 ~13:20] round 6 verified + merged; ISSUES #47 CLOSED and deleted; final round dispatched

- **State:** master green at **252 files / 3446 tests**, build clean, census
  **100/214 effects, 201/355 moves, 162/276 Factory-L50, 2206/2957 weighted
  (74.6%)**. Round 6 landed: NEGATIVEDAMAGE + TRYSETREST (entry 513) ∥ §12
  wiring (entry 514; supervisor reran compares live: turn6-featherdance
  90/90, turn5-faint 110/110) ∥ side §27.5 (merged from
  `worker/side-20260727-120806`, cleaned; verify script rerun in-worktree
  ALL PASS): AI_CV_RainDance live-verified as a writes-conditionally
  PREDECESSOR in a controlled A/B pair — **shipped model CONFIRMED both
  directions**.
- **ISSUES #47 deleted (supervisor decision, this commit):** the engine's
  per-slot funcResult value model is implemented for all 22 CV handlers
  (entry 511) and live-validated across all three write classes — 
  writes-never, writes-always (§27.4), and writes-conditionally (§27.5) — 
  5 dedicated fixtures + 2 net-score reproductions, zero contradictions.
  The 6 conditional predecessors not individually staged are recorded in
  §27.5 as optional validation breadth with the exact recipe, not open
  debt.
- **Final round (dispatched, shortened caps):** main → next census set
  `B_SCR_OP_JUMPIFSTAT`+`PLAYSTATCHANGEANIMATION` (5 effects, 45 weighted,
  entry 513's handoff) ∥ side → §24.5 recipe-only relay sites 5/6/7 (as
  many as fit).
- **Next:** verify final round, wind-down (deadline 15:28): animation-main
  fold check, final union verify, session summary.

---
## 514 — [BOUNDED WORKER 2026-07-27 ~13:35] §12.3 wiring landed: turn6-featherdance.json kickoff text sourced from kernel events, via a new opponent-target/two-sourceLabel bridge

- **State:** tree green at **252 files / 3446 tests** (+3 over session start
  252/3443 — 3 new `presentationEventWindowBridge.test.ts` cases only; no
  new test files), `npm run build` clean. `executableFrontierRatchet.test.ts`
  unmoved (6/6, zero new barriers). Full `docs/presentation-seam-scout.md`
  §12.4 regression sweep run BEFORE this change (pristine `HEAD`, via `git
  stash`) matched every recorded count exactly (no pre-existing drift), then
  re-run AFTER byte-identically: `turn6-featherdance.json` 90/90 (twice, a
  determinism check), `turn6-rockslide-a.json` 255/255, `turn6-statfall.json`
  127/127, `turn6-feathers.json` 235/235, `turn6-menu.json` 44/44,
  `turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
  `turn4-doubleteam.json` 250/250.
- **Did:** executed §12.3's ordered wiring plan steps 1/2/5 (steps 3/4 named
  as out-of-this-trace's-scope prerequisites, not executed, exactly as the
  plan itself specified). (1) `presentationEventWindowBridge.ts` gained
  `resolveFeatherDanceKickoffPresentationWindowContent` — the first
  OPPONENT-target sibling to `resolveDoubleTeamKickoffPresentationWindowContent`,
  and the first to read from TWO `sourceLabel`s (`BattleScript_EffectStatDown`
  for the kickoff `message{STRINGID_USEDMOVE}` + ATK `stat-stage-change`
  pair, `BattleScript_StatDownPrintString` for the separately-labeled
  `STRINGID_DEFENDERSSTATFELL` message), returning `{message, statChange,
  statFellMessage}` (no `hp` field — this move deals no damage). (2)
  `turn6FeatherDancePresentationStaging.ts`'s own pre-wiring local extraction
  retired in favor of calling this bridge directly (same "stage the chain,
  call the shared bridge" shape entry 506/§11.5 established for turn 4);
  `resolveTurn6FeatherDanceKickoffLines` now reads `content.message.messageId`
  from the bridge instead of a hardcoded literal, closing the same doc/code
  gap class §11.5 closed. (3) `battleScene.ts`'s
  `drawTurn6FeatherDanceKickoffText` now draws a new
  `TURN6_FEATHERDANCE_KICKOFF_LINE1/2` constant (resolved once at module load)
  in its own FEATHERDANCE-text branch — every other part of that function
  (sprite choreography, stat-fall-banner gate, `atkFellStart` branch, ROCK_SLIDE
  handoff) and every OTHER turn's own repeat-FEATHER_DANCE call site (turns
  7/8/11) stayed byte-for-byte untouched, per the plan's own scope. **No
  literal died:** `TURN6_FEATHERDANCE_LINE1/2` and `TURN6_ATKFELL_LINE1/2`
  both stay defined and in active use elsewhere. **No mismatch found:** the
  two-`sourceLabel` bridge shape §12.2/§12.3 predicted fit the real staged
  event stream exactly, no rework needed.
- **Tests:** `presentationEventWindowBridge.test.ts` +3 cases (happy-path
  triad, plus 2 null-guard cases specifically exercising the new
  two-`sourceLabel` read). `turn6FeatherDancePresentationStaging.test.ts`'s
  final assertion updated to the bridge's return shape (mechanical, values
  byte-identical, test count unchanged).
- **Docs:** `docs/presentation-seam-scout.md` §12.5 completion note added,
  mirroring §11.5's format (what landed, what didn't die, acceptance
  numbers).
- **Next:** side lane's own next prep-scout pick (per the standing §8-§12
  cadence) — or, if this main lane continues the presentation-seam thread
  itself, §12.3 step 3 (the `TURN6_ATKFELL_LINE1/2` wiring) is now blocked on
  a real prerequisite: `resolveBattleStringLines`'s own straight-vs-curly
  apostrophe residual (§12.2) needs a charmap-aware post-process or a
  corrected `battle-message-templates.json` extraction FIRST, or wiring that
  line would regress the already-pixel-correct literal by one glyph — this
  trace's own 90/90 doesn't need it (out of captured range), so it wasn't
  fixed this pass.
- **Notes:** no PAPERCUT.

---
## 513 — [BOUNDED WORKER 2026-07-27 ~12:35] B_SCR_OP_NEGATIVEDAMAGE + B_SCR_OP_TRYSETREST registered; EFFECT_ABSORB/EFFECT_DREAM_EATER/EFFECT_REST executable end to end

- **State:** tree green at **252 files / 3443 tests** (+2 files / +21 tests
  over session start 250/3422: new `battleScriptNegativedamageOpcode.test.ts`
  11 tests, new `battleScriptTrysetrestOpcode.test.ts` 10 tests; plus one
  `alreadyStatusedMoveAttempt` field-list assertion updated in
  `battleScriptRulesContext.test.ts`), `npm run build` clean.
  `executableFrontierRatchet.test.ts` unmoved (0 new barriers —
  `battleScriptSwitchinOpcode.ts`'s existing `various`-dispatch barrier stays
  pinned at 8; widening its modeled id set with a new case is not a new
  barrier).
- **Did:** per entry 509's handoff, in ranked order: (1) registered
  `B_SCR_OP_NEGATIVEDAMAGE` (`Cmd_negativedamage`,
  `battleScriptNegativedamageOpcode.ts`) — `gBattleMoveDamage =
  -(gHpDealt/2)`, min-1 clamp; verified (not assumed) that
  `Cmd_datahpupdate`'s negative-damage HP-gain branch
  (`battleScriptHitChainOpcode.ts:1985-2010`) was already source-exact and
  already correctly omits `hpDealt` on that branch — nothing to fix there,
  the new opcode is a clean 15-line read-halve-write. (2) registered
  `B_SCR_OP_TRYSETREST` (`Cmd_trysetrest`, `battleScriptTrysetrestOpcode.ts`)
  — reassigns `selectorRoles.target = attacker` (source's `gBattlerTarget =
  gBattlerAttacker`, so the shared `BattleScript_PresentHealTarget` tail's
  `BS_TARGET` heal lands on the right battler), full-HP fail jump,
  status1 unconditionally REPLACED (not OR'd) with `STATUS1_SLEEP_TURN(3)` —
  Rest cures any other status in the same write — synced to the party mirror
  + `set-battler-status-data` event exactly like `SetMoveEffect`'s own sleep
  write. Investigating the "already-asleep-under-Rest" fail nuance the brief
  flagged surfaced a real finding: choosing Rest directly while already
  asleep never reaches `BattleScript_RestIsAlreadyAsleep` — the script's own
  leading `attackcanceler` (`AtkCanceler_UnableToUseMove`'s `CANCELER_ASLEEP`
  case, `battle_util.c:2015-2058`) redirects to `BattleScript_MoveUsedIsAsleep`
  first, since Rest is neither Snore nor Sleep Talk — proven live in an
  isolated-dispatch test rather than assumed. `BattleScript_RestIsAlreadyAsleep`
  itself is real (only reachable via `Cmd_jumptocalledmove`, e.g. Sleep Talk
  picking Rest — unregistered, out of scope) and is exercised directly:
  widened the already-registered `various`-dispatch barrier
  (`battleScriptSwitchinOpcode.ts`) with `VARIOUS_SET_ALREADY_STATUS_MOVE_ATTEMPT`
  (23), backed by a new `alreadyStatusedMoveAttempt` rules-context field, so
  `setalreadystatusedmoveattempt` no longer halts.
- **Tests:** both new files pin exact rounding via isolated dispatch (even
  halving, odd truncation, the 0/1→-1 min-clamp, full-HP fail still writing
  `battleMoveDamage`/reassigning `target` per source's unconditional writes,
  the Poison→cured-by-Rest status1 replacement) AND full committed-script
  walks to genuine terminal ends: EFFECT_ABSORB/EFFECT_DREAM_EATER drain
  (target HP clipped to a small value so `gHpDealt` is deterministic
  regardless of the raw damage roll, pinning `floor(5/2)`/`floor(7/2)`
  end-to-end), EFFECT_DREAM_EATER-vs-awake-target (no negativedamage reached
  at all), EFFECT_REST success/cures-status/full-HP-fail, the
  attackcanceler-intercepts-first finding, and `BattleScript_RestIsAlreadyAsleep`
  itself. All real RNG ledgers (Rest draws none; Absorb/Dream Eater draw
  whatever damagecalc's own pipeline needs).
- **Census (before → after):** 97/214 → **100/214** effects, 195/355 →
  **201/355** moves, 157/276 → **162/276** Factory-L50 unweighted, 2108/2957
  → **2206/2957** weighted (+98, exactly NEGATIVEDAMAGE's 49 + TRYSETREST's
  49). Doc regenerated (`npx tsx tools/report/executable-frontier-census.ts`)
  and committed with the code. New top blocker:
  `B_SCR_OP_JUMPIFSTAT`/`B_SCR_OP_PLAYSTATCHANGEANIMATION` (5 effects —
  EFFECT_TICKLE/COSMIC_POWER/BULK_UP/CALM_MIND/DRAGON_DANCE, 45 weighted).
- **Next:** continue kernel census breadth: `B_SCR_OP_JUMPIFSTAT` +
  `B_SCR_OP_PLAYSTATCHANGEANIMATION` (45 weighted, 5 effects) is the
  regenerated doc's new top-ranked set. Stopped here deliberately (bounded
  worker, time budget) rather than start a 5-effect set without room to land
  it with the same full-committed-script-per-effect rigor.
- **Notes:** no PAPERCUT.

