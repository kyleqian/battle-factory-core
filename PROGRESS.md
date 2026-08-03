# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 889 — [bounded MAIN worker, 2026-08-03] typeref slice 1 LANDED (Family S dead-parameter cut); slice 2 blocked, documented

- **State:** master `7ca03a17`. Full `npm test`: **649 files / 6,488 passed /
  1 skipped** (unchanged from baseline). `npm run build` green (tsc -b +
  vite). `compare:differential --base 4fe0e206 --summary` over the full §2.5
  turn 5-15 window list + `turn5-menu`/`turn5-rockslide` + insurance
  `battle-command-generated-off.json` (49 traces): **PASS — 7,466/7,466
  captures byte-identical**. `tests/executableFrontierRatchet.test.ts` green,
  untouched.
- **Did:** landed `docs/battlescene-turnN-typeref-retirement-design.md` §4
  slice 1 exactly as scoped: cut the turn5-13 predecessor-handoff parameters
  from `drawTurn6FightSubmenuWindow`..`drawTurn15FightSubmenuWindow` (10
  functions) and `drawFightSubmenuChrome`'s 9 void-marked turn5-13 slots
  (keeping its turn1-4/moveset/resolution params); truncated the ~14
  literal-null call sites in `drawLatestCompletedCommandWindow`'s dispatch
  ladder and inside each of the 10 functions' own chrome calls accordingly;
  deleted the now-dead `import type { TurnNCompletedResolutionNextCommandHandoff }`
  lines for N=5..13 (9 import refs — re-grepped each before deleting, matching
  the doc's own N=5..13 range, not just N=6..12). Every one of these was
  already provably dead (§2.2/§2.4: production always passes a non-null
  `latest`, so the deleted params only ever fed the unreachable `else`
  fallback branch) — this was a pure mechanical cut, no behavior change.
  battleScene.ts ref count **152 → 80** (72 retired: 54 Family S + 9 Family Q
  dead chrome slots + 9 imports), re-run via the doc's own §1.1 census script.
- **Next:** typeref slice 2 (Family P+Q turn1-4 fold) is the next pick but
  needs a fresh, focused session — see Notes for exactly why this session
  didn't land it. Slices 3/4a/4b/5 remain after that.
- **Notes:** slice 2 (Family P+Q turn1-4 fold) did **not** land this session
  — invoked the step brief's own documented fallback rather than rush a
  "not one pixel may move" change. Investigation found the design doc's "24
  refs / 6 functions" framing undersells the entanglement: Family Q's
  remaining 6 functions (`drawMenuIdleBaseWithOpponentHp`,
  `drawActionMenuIdleContent`, `drawActionMenuIdleWindow`,
  `drawFightSubmenuChromeTurn1Through4PP`, `drawFightSubmenuChrome`,
  `drawFightSubmenuChromeFromCurrentOwner`) are called from far more than the
  in-scope `drawFightSubmenuWindow`/`drawActionMenuIdleWindow` —
  `drawActionMenuIdleContent` alone has 9+ call sites inside Family R
  (explicitly out of scope this session, slices 3/4a/4b), each passing a
  differently-shaped positional argument list (some just `turn1NextCommandHandoff`,
  some `null, null, turn3NextCommandHandoff.hp.player, turn3NextCommandHandoff`,
  some bare `null`). Changing Family Q's signatures to read `latest` directly
  forces edits to every one of those Family R call sites. Confirmed at least
  one real semantic nuance in the process (an HP-overlay guard inside
  `drawActionMenuIdleContent` that deliberately fires for turn 2/3 lifecycle
  but explicitly excludes turn 1 — not a plain "hp changed" check), meaning
  each call site needs individual verification, not a batch swap. The
  slice-2 precondition pin test (`tests/battleSceneFightCommandPresentationTurn1Through4.test.ts`,
  banked at `a76bb338`) is still green and still the right starting point for
  whoever picks this up. ISSUES #39 updated with the same detail. No
  PAPERCUT beyond the investigation time itself.

---
## 888 — [supervisor fold, 2026-08-03 ~10:30] species-dossier program CLOSED — slice-4 capstone folded from side lane

- **State:** master `bb64afc0` = merge of side branch
  `worker/side-20260803-093850` (`90e5a2b2`, dossier slice 4) into
  `633ac8a7` (entry 887). Post-merge `npm run build` + `npm run test:smoke`
  green (full union suite deliberately deferred to the end of the typeref
  round per the cross-lane contention rule; both parents carried
  worker-verified full green suites — 649 files / 6,488 and 648 / 6,477).
- **Did:** folded species-dossier slice 4, the capstone:
  `SceneOffTurnView` gained identity fields (opponent/player species,
  corners, battler, healthbox-content factory, moveset);
  `renderSceneOffTurnView` consumes `view.*` with a species-keyed asset
  lookup instead of closing over `kabutoFrontSprite`/`onixBackSprite`/ONIX
  literals; `SCENE_OFF_TURN_DEFAULT_IDENTITY` (single source of truth for
  today's ONIX/KABUTO values) populates `stagedBattleTurn.ts`'s new
  `sceneOffIdentity`, spread at `core.ts`'s two call sites. Worker-verified
  presentation-neutral: differential **144/144 byte-identical**
  (`battle2-off-turn1-staged` 16 + insurance `battle-command-generated-off`
  128, base `46190382`); supervisor spot-ran portability + presentation
  suites in the worktree pre-merge. **That closes
  `docs/species-render-entry-point-retirement-design.md` — all 7 slices
  landed**; #39's species render-entry-point family is retired.
- **Next:** typeref retirement slices 1-2 (`docs/battlescene-turnN-typeref-
  retirement-design.md` §4; the slice-2 precondition pin test is already
  banked at `a76bb338`), then 3/4a/4b/5. ISSUES #71 stays queued behind the
  typeref slices per its own sequencing note.
- **Notes:** paired-lane round (main resolver wiring ∥ side battleScene
  slice, file-disjoint) — 4 workers so far today, 0 lost. Entry 887 was
  appended out of ledger order by its worker (below 885); reordered in this
  commit, 885 archived.

---
## 887 — [bounded MAIN worker, 2026-08-03] ISSUES #70 CLOSED — STRINGID_INTROSENDOUT extractor-gap consumption wired

- **State:** master `49b8c323`. Full `npm test`: **649 files / 6,488 passed
  / 1 skipped**. `npm run build` green (tsc -b + vite). `compare:differential
  -- battle-command-generated-off.json --base 46190382 --summary`: **PASS —
  128/128 byte-identical**.
- **Did:** #70's last open item — wired the side lane's already-banked
  `src/data/battleIntroStrings.ts` hand-mapped table (commit `a76bb338`,
  STRINGID ids 0/1/2/5: `INTROMSG`/`INTROSENDOUT`/`RETURNMON`/`BATTLEEND`)
  into `messageLines` (`battleResolutionPresentation.ts`), the same shape as
  the existing `STRINGID_SWITCHINMON` (id 3) hand-port: a small local
  `resolveIntroStringEntry` segment-splice (text/placeholder/linebreak,
  mirroring `resolveBattleStringLines` for the subset these ids need) since
  none of the 4 ids live in the extracted table's `BY_SYMBOL` map.
  `B_TRAINER1_CLASS`/`B_TRAINER1_NAME`/`B_PLAYER_MON1_NAME`/
  `B_OPPONENT_MON1_NAME`/`B_BUFF1`/`B_LINK_OPPONENT1_NAME` all resolve from
  params `messageLines` already receives (`opponentTrainer`, `field`) — no
  new generic-substitution plumbing needed. Three new optional
  `battleScriptEvents.ts` message-payload fields (`introBattler`/
  `introHpScale`/`introOutcome`) carry the routing facts these ids need that
  the event shape doesn't otherwise carry (which side is being introduced/
  returned, the `RETURNMON` player-branch HP-scale bucket, the `BATTLEEND`
  win/lose/draw outcome — `introOutcome` reuses the existing `BattleOutcome`
  domain type rather than inventing a new one). `prepareMessage`
  (`factoryBattleScriptFullTurnDecision.ts`) needed **no change**: it is
  `Cmd_printstring`'s own substitution-builder, and none of these 4 ids are
  ever printed via `Cmd_printstring` even in the real game (`BufferStringBattle`
  dispatches them from a separate, non-script C routine) — structurally
  unreachable from that hook regardless of live-wiring status, so the step
  brief's anticipated `prepareMessage` work turned out not to apply.
- **Tests:** `tests/presentationStringIntro.test.ts`, 11 cases — one per
  `battleIntroStrings.ts` table entry (full coverage: `INTROMSG`'s one
  branch, `INTROSENDOUT`'s 2, `RETURNMON`'s 5, `BATTLEEND`'s 3), all via the
  direct resolver-branch idiom (synthetic event straight into
  `createBattleResolutionPresentation`, batch-3's zero-incidence pattern) —
  the only idiom available since no engine path emits these ids. Red-
  verified once via `git stash` on the two touched engine files: all 11
  threw `battleStringResolver`'s exact completeness-guard error
  (`unknown battle string id STRINGID_...`) pre-fix.
- **Next:** #70 is closed and deleted from ISSUES.md (its forensic history
  stays in git + this ledger/archive). ISSUES #71 (live send-out seam
  wiring — the counterpart program that would actually populate
  `introBattler`/`introHpScale`/`introOutcome` and make these 4 ids
  reachable) is the next natural pick for this thread, but is its own
  bounded step.
- **Notes:** scope was deliberately resolver-completeness only, per the
  step brief — no live emission wired (`battleScene.ts`/timing untouched).
  `tests/executableFrontierRatchet.test.ts` green, untouched, no new
  recording imports, no barrier-count changes.
