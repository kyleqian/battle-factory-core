# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1075 — [MAIN worker, 2026-08-10] **#73 slice-2 assignment was mis-scoped: the player-sprite residual it targeted was already closed 2026-08-05; ISSUES.md's stale paragraph fixed so the next reader doesn't repeat this**

- **State:** no engine/controller/asset change — this step is a verification
  + docs correction. Confirmed live (oracle-backed, two fresh runs each):
  `loss-terminal-window-off` **1943/1943**, `win-terminal-window-off`
  **3590/3590**, `battle-command-generated-off` **128/128**, all
  byte-stable across both runs. `npm test`/`npm run build` unchanged
  (nothing to re-verify beyond the doc edit — run once at close per the
  brief's acceptance bar; see Notes for the exact counts).
- **Did:** the assigned step ("extract the oracle's REAL player object
  graphic... post-terminal LOSS Lobby window is exact through pages 0-2
  EXCEPT... the player sprite... oracle renders the bootstrapped save's
  actual player character (red-brown hat + red shirt)... committed windows
  350/350, 503/503, 128/128") described a state that predates a same-day
  fix already recorded in `ISSUES.md` #73: the **2026-08-04 "LOSS slice-2
  player-sprite residual CLOSED"** paragraph (immediately below the stale
  one the brief quoted) found the real cause was a wrong `+1px x2` OAM
  sub-pixel offset on the player object anchor, fixed it generically in
  `factoryTerminalRender.ts`, and got 0 diff using the **existing**
  extracted Brendan asset (`factory-lobby-terminal-npcs.json`) unmodified
  — explicitly retracting the "different player asset" theory. Everything
  from slice 3 (record prompt) through slice 5 (LOSS decline continuation,
  WIN GO-ON scouting/commentary/swap-offer/swap-screen) closed in the five
  sessions since, dated up to 2026-08-05 in `ISSUES.md`. Verified this is
  really true right now, not just on paper: ran `npm run compare` twice
  each on all three windows the brief named as the acceptance bar (see
  State) — all exact and far past the "350/503" checkpoint the brief cited
  as current. Per this run's protocol ("if blocked/mis-scoped, say why
  instead of improvising a different plan"), did **not** invent replacement
  work (e.g. the still-genuinely-open swap-screen ball-rocking RNG boundary
  or the walkable free-roam lobby feature, both already correctly named as
  open in `ISSUES.md` #73's tail and out of this step's charter either way).
  Deleted the stale "Residual classes (documented, honest checkpoint)"
  paragraph in `ISSUES.md` #73 (the one describing the red-brown-hat theory
  and the 350/503 checkpoint) since it sat un-pruned right next to its own
  retraction and is what produced this mis-scoped brief — replaced with a
  short pointer to the real closure paragraph plus this session's
  re-confirmation, per this run's "keep ISSUES.md pruned" mandate. Did not
  touch the record-prompt/slice-3 text the brief asked to preserve as
  "next territory," since that language was itself the stale part.
- **Next:** #73's only genuinely open remainders (both already documented,
  neither touched this step): the swap-screen ball-rocking restart's
  per-ball `Random()%5` ambient RNG boundary (tracked under #55, one frame
  past the current WIN swap-YES window's end at 10177), and the walkable
  free-roam Lobby feature (deliberately sequenced by the user behind
  play-test fixes #76-#81). Neither is slice-2/#73 core work. Suggest the
  supervisor re-derive the next MAIN-lane increment from `ISSUES.md`'s
  current tail rather than re-issuing #73 slice work.
- **Notes:** PAPERCUT — a step brief quoted a real ISSUES.md paragraph that
  was itself stale (superseded three paragraphs later, same file, same
  date-order) and the numbers cited (350/350, 503/503) as "the current
  committed baseline" were ~5x stale (actual 1943/3590 at time of
  assignment); ~20 min spent confirming the premise before writing anything,
  which is exactly the read-first discipline this docs fix is meant to save
  the next worker/supervisor. Full verification run at close: `npm test`
  and `npm run build`. Archived entry 1072 to `PROGRESS-archive.md` to keep
  the ledger at 3 live entries.

## 1074 — [supervisor, 2026-08-10 ~02:40] **S10 CLOSED: gates 2/3/4/6 ticked; Gate-6 family program complete**

- **State:** ROADMAP S10 and all six gates are checked (supervisor commit
  after entry 1073's audit fixes). Final manifest state: **296/300
  source-proven per-move hook-join rows on each axis** across ten families,
  plus the four dynamic-dispatch exception rows (`ASSIST`/`METRONOME`/
  `MIRROR_MOVE`/`SLEEP_TALK`, both axes). ISSUES #86 (renumbered from the
  worker's reused #82) records the `routeBranch` self-description
  enhancement as debt.
- **Did:** one-session family-level Gate-6 execution per the 2026-08-09
  user decision: worklist doc → five family receipt packs (side lane) →
  five wiring promotions (main lane) → soak artifact (vanilla 20/20, full
  60/60) + Noland scope note → read-only opus surge audit (8 seams: 5
  clean certifications, 3 defects) → same-session class fixes. Gate ticks
  carry dated completion notes citing every artifact.
- **Next:** per the user sequencing decision, the "playable round" polish
  milestone (#71, #73, session-trace-driven pacing fixes) is the next
  headline, BEFORE S11 audio. ISSUES #86 is optional manifest-hardening
  filler.
- **Notes (wind-down complete, ~03:00):** folded `animation-main`
  (Protect, Magic Coat, Role Play promoted exact tonight by the live
  animation supervisor; merge `f913d88a`). Final union is green: full
  suite **870 files / 8,379 passed / 1 skipped**, production build,
  animation coverage. Soak gates on the union: vanilla 0:20 = **20 OK /
  0 CRASH / 0 HANG**; full-policy 0:60 = **60 OK / 0 CRASH / 0 HANG**.
  DEFERRED.md remains empty — every choice tonight was decidable from
  the mission, roadmap, source, or receipts. The animation supervisor
  may still be live; any post-fold commits on `animation-main` fold next
  session. No engine behavior, controller interface, round outcome,
  barrier pin, or canonical window changed by the close-out itself.

## 1073 — [MAIN worker, 2026-08-10 night] **Gate-6 surge-audit fixes: dynamic-dispatch exception class completed (2→4 gaps/axis), "undefined" locators fixed, count wording corrected**

- **State:** tree is green: full suite **864 files / 8,347 passed / 1
  skipped**, production build, `npm run typecheck` clean.
  `docs/gate6-coverage-manifest.md`/`.json` regenerate byte-idempotent
  (identical `git diff --stat` before/after a fresh rerun of both
  generators on the unchanged tree) and now read **4 item join gaps / 4
  ability join gaps** (was **2 item / 2 ability** at entry 1072 — that
  headline was incomplete, not final, per tonight's supervisor-verified
  read-only audit). `grep -c "undefined" docs/gate6-coverage-manifest.md`
  and `.json` both **0** (were 8 md occurrences across 4 rows / matching
  json occurrences before this step).
- **Did:** fixed all three defects the audit named, each as a class fix,
  not a spot patch. **(1) Dynamic-dispatch exception class (the
  substantive fix):** mapped all five `gBattleScriptsForMoveEffects`
  dispatch sites in `battle_script_commands.c` (jump-semantics
  `gBattlescriptCurrInstr` assignments at `Cmd_jumptocalledmove` :5750,
  `Cmd_trymirrormove`'s two success arms :6664/:6672, `Cmd_metronome`
  :7919; call-semantics `BattleScriptPush` at `Cmd_moveend`'s
  `MOVEEND_NEXT_TARGET` :4474 and `Cmd_callenvironmentattack`/Nature Power
  :9114 — confirmed push-class moves are NOT exceptions, since
  `BattleScriptPush` returns control to the original script's own moveend
  tail after the pushed script ends, unlike a jump which abandons that
  tail). Found `MOVE_MIRROR_MOVE` and `MOVE_SLEEP_TALK` were still counted
  source-proven on both axes even though each row's static moveend route
  certificate was reachable only through its own ordinary-*failure* tail
  (Mirror Move: `orbyte gMoveResultFlags, MOVE_RESULT_FAILED` → `goto
  BattleScript_MoveEnd`, taken only when `Cmd_trymirrormove` finds no
  valid last-taken move; Sleep Talk: `goto BattleScript_ButItFailed`,
  taken only when not asleep or when `trychoosesleeptalkmove` finds all
  four moves unusable) — never through the actually-dispatched move,
  which on both moves' success arms reassigns `gBattlescriptCurrInstr`
  dynamically exactly like Assist/Metronome. Converted both to explicit
  dynamic-dispatch exception rows on **both axes**
  (`IMMUNITY_EXCEPTION_ROWS`/`ITEM_MOVE_END_EXCEPTION_ROWS` in
  `tools/extract/extract-level50-move-parameterization.ts`), each reason
  citing the exact success-branch reassignment site and the fact that the
  prior route certificate existed only via the failure tail. Immunity
  family: 99 candidates, promoted 97→**95**. Item-move-end family: 116
  candidates, promoted 114→**112**. `routeBranch` success/failure-tail
  self-description was **not** landed this step (honest-stop clause,
  session cap) — filed as `ISSUES.md` #86 with the full marker-set design
  (`BattleScript_ButItFailed`, `orbyte ... MOVE_RESULT_FAILED`,
  `*Prevents*` redirects) and the counter-argument for why most
  failure-tail routes (Roar/Whirlwind/Substitute-shaped, reaching
  `Cmd_moveend`'s unconditional post-move state loop on both branches)
  remain valid evidence regardless of branch. **(2) Undefined evidence
  locators:** `tools/report/gate6-coverage-manifest.ts`'s
  `sourceProvenHookEvidence` built citation locators from
  `proof.entryPath.graph.entryLabel`/`program.entryLabel` and a route
  terminal, both absent for the opcode-family shape (Rank-3/4
  item-/ability-manipulation, `auditExactScriptBlock`'s `{label, source,
  graph: {path, statements}, program: {path, statements}}` has no
  `entryLabel`/`route`), so those rows and the older Explosion/Damp rows
  emitted literal `"undefined"` in locators. Fixed with a fallback to
  `proof.entryPath.declaredEntryScript` for the entry label and to the
  word `"statements"` (instead of fabricating `"route"`) when
  `entryPath.graph.route` is absent; added a hard per-family assertion in
  `sourceProvenFamilies` that throws if neither `entryLabel` nor
  `declaredEntryScript` is a string, plus a blanket
  `JSON.stringify(manifest).match(/undefined/)` assertion in
  `assertManifest` as a second line of defense. Verified this also healed
  the six pre-existing Explosion/Damp occurrences (all three fix sites are
  general, not per-family special-cased). **(3) Count wording:**
  `tools/extract/extract-level50-move-parameterization.ts`'s ability-axis
  coverage note said "99-row Immunity status-cure family" when promoted
  membership was 97 (now 95) — the phrase described the candidate count,
  not the promoted count. Fixed to "95-row" (**not** the audit's literally
  quoted "97-row" — that number was accurate at the moment the audit was
  written but Rung 1's own exception-conversion fix supersedes it before
  Rung 3 is applied, per the brief's own THEN clause requiring re-pinned
  counts after membership changes; shipping "97-row" would have been a
  fresh overstatement one rung later). All touched reason/note strings
  across both extractor and report now say "4 remaining gaps" /
  "Assist/Metronome/Mirror Move/Sleep Talk" consistently (no lingering
  "two gaps" or bare "Assist/Metronome" text on either axis).
- **Next:** ISSUES #86 (`routeBranch` classifier) is the natural
  continuation — read-only sweep across all ~296 currently-promoted rows
  per axis for other failure-tail-only routes before deciding whether any
  need exception-row conversion. Otherwise the Gate-6 hook-family worklist
  is at its true final state: **4 item / 4 ability gaps**
  (`MOVE_ASSIST`/`MOVE_METRONOME`/`MOVE_MIRROR_MOVE`/`MOVE_SLEEP_TALK`,
  identical set on both axes), no further family-level promotion possible
  without a new engine capability (a runtime trace of the dynamically
  selected move).
- **Notes:** no engine, controller, round outcome, barrier pin, or
  canonical window changed — this step was extractor/report/docs/test
  fixes only, as scoped. Re-pinned counts in
  `tests/level50MoveParameterization.test.ts` (298→296 item/ability
  source-proven and hook-category counts, 2→4 unsupported both axes),
  `tests/gate6CoverageManifest.test.ts` (97→95 immunity, 114→112
  item-move-end, 2→4 unsupported per axis, 4→8 total gaps, 298→296
  source-proven, all markdown-regex assertions), `tests/statusImmunityHookJoinBatch.test.ts`
  and `tests/itemMoveEndHookJoinBatch.test.ts` (97→95/114→112 promoted,
  both new exception rows asserted with their reason text). Neither
  `tests/abilityManipulationHookJoinBatch.test.ts` nor
  `tests/ownTempoGuardHookJoinBatch.test.ts` (ability-manipulation/
  own-tempo-guard batches) changed membership — Mirror Move and Sleep Talk
  were never members of either family. Added a dated STATUS note to
  `docs/gate6-family-worklist.md` under the Rank 5 section (the audit's
  correction target) rather than rewriting the document's historical
  narrative. `src/engine/battleScriptLastMoveOpcode.ts` (Mirror Move) and
  `src/engine/battleScriptSleepTalkOpcode.ts` were read, not edited
  (already faithful; this was a report/extractor-side accounting gap, not
  an engine bug). Full acceptance run this step: `npm run
  test:smoke` (375/375), `npm run typecheck` (clean), full `npm test`
  (864 files / 8,347 passed / 1 skipped), `npm run build` (green, one
  pre-existing unrelated chunk-size warning). Moved entry 1070 to
  `PROGRESS-archive.md` to keep the ledger at 3 live entries.
