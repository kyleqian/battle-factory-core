# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 973 — [bounded MAIN worker, 2026-08-06] battle-message pacing holds bound — #81 4b CLOSED 57/57, #78's 1256-1407 message-pacing window byte-exact

- **State:** master `13a368a3`, clean. Typecheck green; `npm run test:smoke`
  **347/347**; touched test file 35/35. Full `npm test` NOT run (worker rule —
  supervisor runs it after merge); build run green.
- **Did (bind the two hold classes; `docs/battle-message-pacing-ground-truth.md`**
  **is the measured target, verify script PASS):** (1) Class 2 — added
  `STRINGID_BUTITFAILED` + `STRINGID_BUTNOTHINGHAPPENED` to
  `WAITMESSAGE_LONG_MESSAGE_IDS` (holdFrames 64, the ButItFailed/Splash script
  tails' `waitmessage B_WAIT_TIME_LONG`). (2) Class 1 — route-scoped
  `STRINGID_USEDMOVE` post-print hold for the failed/no-anim path: the source
  runs `pause B_WAIT_TIME_SHORT` (32)+~6 dispatch / the SPLASH controller span
  with NO waitmessage, measured 38 (torment) / 39 (SPLASH). The orchestrator
  carries `usedMessageHoldFrames` and applies it to every command presentation
  it installs (incl. the fresh handoff at the next command boundary, so the
  turn-2 switch resolution gets it); the route hold counts from print
  completion (`minimumFrames: 0`, exact printable length — the 23-glyph
  "…used SPLASH!" clears at +62 not +63). Default 0 keeps the standard hit
  chain untouched.
- **Verified:** `fight-menu-chrome-torment-off` **55/57 → 57/57** (frames
  1100/1200 green, #81 remainder 4b closed). New dense spec
  `mid-battle-switch-pacing-b-off` **148/152**: the **1256-1398 message-pacing
  window is byte-exact** (M1 "…used SPLASH!" typing + 39-hold, M2 "But nothing
  happened!" typing + 64-hold). Named residual, the #78 turn-boundary
  menu-chrome class (NOT trimmed, NOT chased per brief): **1399/1400** = app's
  box text clears 2 frames late (its separate `turn-end` command persists the
  M2 text past the oracle's 1399 clear — the 64+10 turn-end tail seam, not the
  message hold), **1406/1407** = action-menu/fight-menu redraw chrome (the #78
  window's own binding target). Regressions unchanged:
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **221/221**, `postwin-record-off` **204/204**. New Tier-1 pins in
  `tests/battleResolutionPresentation.test.ts` (the two WAITMESSAGE_LONG ids
  resolve to the shared 64-hold object; the route hold fires with
  `usedMessageHoldFrames` and does NOT fire by default) — red-verified by
  reverting the src (1/2 pins fail), restored green.
- **Next:** #78's 1399-1407 box-clear + action-menu redraw binding; then per
  the ordered list: #80 rank 6, lobby walkable + REST guard.
- **Notes:** no PAPERCUTS. The verify script's `_verify-*` scratch dirs and the
  two pacing spec fixtures are the same battle (identical segments/parties,
  different capture windows). B_WAIT_TIME_MED (48) still unexercised.

## 972 — [bounded MAIN worker, 2026-08-06] postwin RECORD-YES + RETIRE-YES routes bound from the banked ground truth

- **State:** master `4b02c245`, clean. Typecheck green; `npm run test:smoke`
  **347/347**; new Tier-1 pins green. Full `npm test` + `npm run build` NOT
  run (worker rule — supervisor runs them after merge).
- **Did:** bound the YES routes the 8286ba97 up-a probes ground-truthed.
  (1) Cursor: UP/DOWN on the held YES/NO window moves the cursor (logical
  move at the press edge, one-VBlank display handoff → oracle-visible
  edge+2; record probe cursor visible 6717, retire 6718). (2) RECORD-YES →
  SaveBattle: window clears +2, question box holds through the save-SE span
  (box clears +23), then "{PLAYER}'s battle was recorded / on the FRONTIER
  PASS." types from +24..+72 and holds. (3) RETIRE-YES → WarpToLobbyLost:
  window clears +2, WARP_FADE_OUT palette fade +4..+18 (BG 1-tick ahead of
  OBJ), black hold +19..+37, then the Lobby arrival fade-in +38 renders via
  the existing factoryTerminal LOSS presentation (age = delay + 76). New
  dense specs `postwin-record-yes-off` **125/125** and `postwin-retire-yes-off`
  **125/125** full-window byte-exact. New Tier-1 pins in `tests/postwin.test.ts`
  (cursor swap timing, RECORD save/recorded phase, RETIRE warp clocks,
  NO-dismiss unchanged), red-verified by breaking `acceptPostwinQuestionYes`.
- **Verified:** regressions unchanged — `postwin-record-off` **204/204**,
  `postwin-retire-off` **211/211**, `win-go-on-scout-off` **143/143**.
  Probes rerun byte-identical (record/retire up-a, 125/125 manifest shas).
  The recorded message's apostrophe is U+2019 (charmap has no U+0027).
- **Next:** #81 remainder 4b (message pacing at 1100/1200), then per the
  ordered list: #80 rank 6, lobby walkable + REST guard, #78's 1256-1407
  window.
- **Notes:** no PAPERCUTS. The retire fade is the shared WARP_FADE_OUT
  palette fade (not the battle fast-fade), matching pixel-for-pixel.

## 971 — [bounded MAIN worker, 2026-08-06] #81 remainder 4a: route-scoped idle-bounce freeze schedule bound — torment 55/57, no regressions

- **State:** master `e1decfff`, clean. Typecheck green; `npm run test:smoke`
  **347/347**; Tier-1 pins green. Full `npm test` + `npm run build` NOT run
  (worker rule — supervisor runs them after merge).
- **Did:** implemented the SALVAGED VALIDATED model from the prior
  cap-killed worker as `BattleCommandBounceSchedule` — a phase-keyed offset
  table on `BattleCommandPresentationState.bounceSchedule`, supplied ONLY by
  the torment staging context (`TORMENT_ROUTE_BOUNCE_SCHEDULE` in
  `tools/compare/appTrace.ts`); all other `createBattleCommandPresentation`
  callers (battle-1 march, adapters, live orchestrator) default to the
  all-zero battle-1 schedule. Offsets in `idleBounceElapsed` terms:
  fight-opening +3 (736), fight-menu +1 (740-766, flips only 766), rejection-
  message 0, rejection-reopen −1 (977); the reopened fight-menu suppresses
  the first-window +1 (`bounceFightMenuReopened`) so 986 stays at 0. Applied
  in `renderGeneratedBattleCommandPresentation` (battleScene.ts) via
  `battleCommandBounceAgeOffset`.
- **Verified:** `fight-menu-chrome-torment-off` **55/57** (was 52/57; only
  the out-of-scope message-pacing 1100/1200 red). Regressions:
  `battle-command-generated-off` **128/128** (unchanged),
  `mid-battle-switch-dense-a-off` **221/221** (unchanged). New Tier-1 pin
  `tests/fightMenuBounceSchedule.test.ts` drives the fixture's exact frame
  walk and asserts each phase-boundary pose incl. 986 at offset 0 +
  battle-1 default all-zero; red-verified by reverting the src (3/4 red),
  restored green. Docs §8.1 appended with the bind.
- **Next:** #81 remainder (4b) — the message-pacing class at 1100/1200 (the
  real printer types/holds slower than the app's 1 glyph/frame); then per
  PROGRESS 969/970's ordered list: postwin RECORD-YES/RETIRE-YES binds,
  #80 rank 6, lobby walkable + REST guard, #78's 1256-1407 window.
- **Notes:** no PAPERCUTS. The two rejection-reopen freezes the probe doc
  described land as a single −1 offset over the whole reopen span (pose-
  stable 239-247), and the first-window-only fight-menu regime required one
  extra state flag beyond a bare per-phase table — documented in code.

## 970 — [supervisor WIND-DOWN, 2026-08-06] Orientation only; stopped before worker dispatch at user request

- **State:** master at this entry's commit, clean. This Codex supervisor did
  not launch a worker, and it changed no production code. `animation-main` had
  no commits absent from master, so no fold was required. DEFERRED.md has no
  open entries.
- **Verified:** read the supervisor guide, AGENTS.md, and the authoritative S8
  and S10 executable-frontier resets. The Battle Scene OFF oracle reports the
  expected v5 contract and 45,000-frame cap. The freshness guard's failure is
  the known docs/tooling-only false positive: harness commit `2328682` changes
  only `_template` commit-attribution hooks and tests. The direct full suite
  showed no failures before the execution host terminated it at three minutes;
  a follow-up shard completed **189 files / 1546 tests** green. A second shard
  was manually stopped, without observed failures, when the user requested
  early wind-down. The build was not rerun; PROGRESS 969's same-commit full
  **754 files / 7141 tests / 1 skipped** and build remain the last complete
  baseline.
- **Next (unchanged):** (1) #81 route-scoped fight-menu freeze schedule and
  message pacing; (2) bind postwin RECORD-YES/RETIRE-YES through the generic
  terminal presentation seam; (3) #80 cursor/ball/selection/fade; (4) lobby
  walkability + REST guard; (5) #78's 1256-1407 fight-menu window. Do not
  resume the retired canonical Battle-2 turn march after tick 33331.
- **Notes:** a separate, concurrent Claude supervisor owned active main and
  side workers at wind-down; this session did not modify or stop them. No new
  papercut or deferred decision.

## 969 — [supervisor WIND-DOWN, 2026-08-06] Session summary: 6 workers / 3 rounds — #78 switch window CLOSED 221/221, #80 rank 5 bound, postwin RECORD/RETIRE bound 204/204+211/211 incl. the YES/NO window, #81 freeze question ANSWERED (route-dependent), #82 filed

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **754 files / 7141 passed / 1 skipped** (+9 tests today),
  `npm run build` green.
  Compare specs re-verified by supervisor this session:
  `mid-battle-switch-dense-a-off` **221/221** (was 95), `postwin-record-off`
  **204/204** (new), `postwin-retire-off` **211/211** (new),
  `battle-command-generated-off` **128/128**, `win-go-on-scout-off`
  **143/143**, `party-menu-status-item-off` banked red baseline
  9234-9306px/frame. `animation-main`: nothing to fold at orient or
  wind-down. No worker worktrees/branches left. DEFERRED.md: no open
  entries. Oracle-freshness FAIL at orient was again the documented
  docs-only false positive.
- **Did (6 DeepSeek workers: 3 main, 3 side; 4 cap-kills, all salvaged to
  zero loss):** MAIN — (967) #80 rank 5: status + held-item icons per the
  banked §7 plan, target bboxes glyph-exact, level-text suppression;
  (968a `fdb49a4d`) postwin RECORD/RETIRE question branches
  (dismiss=default-NO re-ask, cursor handoff, specs initially 192/188 with
  the question-hold excluded); (968b `2f579d21`+`8286ba97`) the exclusion
  was explained: the oracle DRAWS a held YES/NO window (supervisor
  pixel-check vs doc §3's over-general "not visible" claim) — bound by
  reusing the Lobby prompt machinery, specs extended to FULL coverage, and
  the during-hold UP+A probe proved YES IS REACHABLE (RECORD-YES →
  SaveBattle; RETIRE-YES → WarpToLobbyLost; ground truth banked, nothing
  bound). SIDE — (#78) two-worker chain: salvage `c8aecf8c` (particle
  destroy-tick model + emerge acc-58 render gate) then `490197ab`+
  `87165ead`+`7dc9cfff`: ball-throw window byte-exact (RAM throw table +
  spin matrix + 1-tick lag + terrain clip), particle alive-set boundary +
  stolen-tick freeze, spec widened 95→221 all-match; (#81 probe
  `505fca40`) battle-1 freeze schedule measured RAM+pixel cross-validated:
  verdict (b) ROUTE-DEPENDENT (battle-1 = 0-frame opening / 2-frame
  submenu-open / two 1-frame B-close freezes — not torment's 4/1/1), so
  the shared constant stays; verify script PASS twice + supervisor rerun.
- **Supervisor corrections this session:** PROGRESS 965/966's #78 residual
  lists were understated (the 1140-1185 ball-throw band was red and
  unlisted — fresh differential-vs-stash measurement before rebriefing);
  ISSUES #80 item (5) was marked CLOSED in place by a worker (now
  removed); doc §3's "no YES/NO window" over-generalization corrected in
  place (§3a). Legacy `compare:factory-terminal-loss` family found
  desynced 0/210 wholesale — proven pre-existing (identical at
  session-start commit), filed as **ISSUES #82** (superseded by modern
  specs; retarget-or-retire is a bounded future step).
- **Next (ordered):** (1) #81's 3 phase-boundary frames via a route-scoped
  freeze schedule per the probe doc (+ the 2 message-pacing frames);
  (2) postwin RECORD-YES/RETIRE-YES binds from the banked `8286ba97`
  ground truth (RETIRE-YES reuses the existing loss-lobby flow per the
  standing user decision); (3) #80 rank 6 (cursor/ball/selection + fade;
  note the cursor-open rule + Lv50 ink findings in PROGRESS 967);
  (4) lobby walkable + REST guard (scout brief drafted this session, not
  launched); (5) #78's 1256-1407 fight-menu window (overlaps #81 pacing).
- **Notes:** DeepSeek cap economics this session: 60-min caps were killed
  at the suite/docs tail 4-of-5 times while the work itself was green and
  committed — the standing salvage recipes (verify-from-JSONL + fresh
  reruns; commit-tail suite-run) recovered all four at ~10-20 min each.
  Consider 45-min caps with an explicit "no full suite, supervisor runs
  it" clause for DeepSeek next session. Vitest contention: my background
  full suite overlapped a worker's own suite once and pushed it past its
  10-min shell timeout — keep supervisor suites off the box while any
  worker is in its finish phase. No DEFERRED entries; no PAPERCUTS added.

## 968 — [bounded MAIN worker, 2026-08-06] postwin RECORD/RETIRE question window bound 204/204 + 211/211; during-hold YES ground truth banked

Covers the prior step (fdb49a4d, its PROGRESS entry was lost to a cap-kill)
plus this step (2f579d21 + 8286ba97).

- **State:** master `8286ba97`, clean. Typecheck green; `npm run test:smoke`
  **347/347**. `postwin-record-off` **204/204**, `postwin-retire-off`
  **211/211** (both extended from 192/192 / 188/188 to the full fixture
  capture sets), `win-go-on-scout-off` **143/143** — all unchanged regressions.
- **Did (fdb49a4d, prior step):** bound the postwin RECORD/RETIRE question
  branches (dismiss = default-NO re-ask) — continuation cursor one-VBlank
  display handoff, question phase at 1 glyph/tick from edge+5 with
  wait-cursor/YES-NO hold, dismiss-A resolves default NO and re-enters the
  ReadyFor2ndOpponent reprint. Tier-1 pins in `tests/postwin.test.ts`.
  Specs green at 192/192 / 188/188 **excluding** the question-hold frames
  (record 6711-6722, retire 6712-6734) because the app drew no YES/NO window.
- **Did (this step, Part 1 — `2f579d21`):** measured the held window on the
  oracle (compare `--capture-range`): appears **fully-formed in one frame** at
  canonical **6711** (record) / **6712** (retire), bbox **(161,65)-(206,110)**
  = the Lobby record prompt's 4×4 std-window at tile (20,8), cursor on **NO**
  (default), **1828 px/frame stable**; teardown clears with the message box
  (record gone 6723, retire gone 6735). Reused that shared machinery in
  `renderPostwinState` (`drawStandardWindowFrame(fb,160,64,4,4)` + YES/NO text
  + cursor at 168,89) gated on `postwinQuestionWindowVisible` with teardown
  `dDelay<=1` — the app's existing `POSTWIN_QUESTION_WINDOW_DELAYS` constants
  already land on the oracle's appear frames. Extended both specs to the full
  fixture sets: **204/204 + 211/211**. New Tier-1 render pin (window appears
  with cursor on NO; dismiss clears it) red-verified via stash.
- **Did (this step, Part 2 — `8286ba97`, ground truth only, no binding):**
  two scratch probes (`scratch-postwin-{record,retire}-up-a-probe.json`):
  verbatim prefixes + UP ~4 frames into the hold + A two frames later, dense
  captures over ~125 frames, **each twice-run byte-identical**. Verdict: **UP
  during the hold DOES move the cursor to YES** (record visible 6717, retire
  6718); **A-on-YES takes a genuinely new path** — RECORD → `SaveBattle`
  (save-SE hold 6721-6741, then "{PLAYER}'s battle was recorded / on the
  FRONTIER PASS."), RETIRE → `WarpToLobbyLost` (fade-to-black 6724-6738,
  black hold, lobby arrival typing the LostChallenge "Thank you for
  participating!" chain = the LOSS-ending flow the app already renders).
- **Docs:** `docs/postwin-record-retire-ground-truth.md` §3 gains a dated
  correction subsection (§3a): the window IS visible during the hold
  (over-generalization corrected; §3's no-window claim holds only
  post-dismiss), citing the measured appear/teardown frames + the probe
  verdict. ISSUES.md untouched (supervisor owns the related trims).
- **Next:** the RECORD YES (save) and RETIRE YES (lobby warp) routes are now
  ground-truthed but unbound — decide whether to bind them (RETIRE YES
  converges on the existing LOSS lobby flow); then per PROGRESS 966's ordered
  list: #80 rank 6 cursor/ball/fade, lobby walkable + REST guard.
- **Notes:** full `npm test` + `npm run build` NOT run this step (cap); smoke
  + typecheck + the three specs are the last verified tiers. PAPERCUT: none.
