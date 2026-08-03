# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 883 — [supervisor wind-down, 2026-08-03 ~02:30] species-dossier 6/7 + three same-night user-bug fixes + #70 batch-1; final union green

- **State:** master `70c58ae2` = final animation fold (front flip +
  ANIM_GLOW_BLUE + horizontal pivot families). Final union verified by
  supervisor: full `npm test` **6,424 passed / 1 skipped**, `npm run build`
  green. DEFERRED.md: no entries. Open backlog: **#70 batch-2** (31
  unranked ids + INTROSENDOUT extractor gap), **#39** (shrunk: dossier 6/7
  + typeref design banked), **#55** (parked). #56 settled, #62/#68/#69
  deleted-as-fixed this session.
- **Session (15 workers: 9 main + 6 side, 1 cap-kill salvaged, 0 lost):**
  dossier slices 1+2/3/5/6/7 presentation-neutral (slice 4 capstone
  DEFERRED to next session — §4 row 4); typeref retirement design banked
  (6-slice plan; 1+2 landable, 3/4b's dossier-7 gate now lifted); #62
  CLOSED (route divergence); #56 audit caught + same-night fixed the
  MAGNETON 703→702 stallLag regression, then SETTLED; live user play
  reports triaged→probed→fixed same-night: #68 TORMENT string (+ #70
  class discovered via its insurance sweep), #69 banner cadence
  (74.6→90.6 f/banner vs ROM 92; RNG exonerated 25/25); #70 batch-1
  (15 STRINGIDs + scriptingBattler event field + end-of-turn cure-name
  gap, 8 staged repro tests).
- **Next session (ordered):** (1) #70 batch-2 reachable-string mappings
  (docs/issue70-stringid-reachability.md rows below top-8); (2) dossier
  slice 4 capstone; (3) typeref slices 1-2 (dead-cut + P/Q fold), then
  3/4a/4b/5. All briefs re-derivable from the banked design docs.
- **Notes:** play-preview worktree (`.worktrees/play-preview`, port 5199)
  serving `70c58ae2` — INTENTIONAL, exclude from stale sweeps.
  `animation-main` remains a moving branch (live animation supervisor +
  nested worker `worker/animation-20260803-014242` at wind-down) — fold at
  next orient. Ledger-race rule adopted after one bite: never stage
  ISSUES.md/PROGRESS.md in the main tree while a main-lane worker is live.
  One app-differential temp worktree may linger under /var/folders —
  `git worktree prune` at next orient if present.

---
## 882 — [bounded MAIN worker, 2026-08-03] ISSUES #70 batch 1 — ranked top-8 presentation-string rows (15 STRINGIDs) FIXED

- **State:** master `fba78340` (one commit on top of `5b2cddf4`). Full
  `npm test`: **635 files / 6,390 passed / 1 skipped** (+8 from this step's
  new suite). `npm run build` green (tsc -b + vite).
- **Did:** ported the ranked top-8 rows of `docs/issue70-stringid-
  reachability.md`'s crash-risk table (15 `STRINGID_*` ids) into
  `messageLines` (`battleResolutionPresentation.ts`), mirroring #65/#68's
  resolver shape: `PKMNENERGYDRAINED`, `PKMNPROTECTEDITSELF`,
  `PKMNAVOIDEDATTACK`, `AVOIDEDDAMAGE`, `PKMNMAKESGROUNDMISS`,
  `PKMNPOISONEDBY`, `PKMNBURNEDBY`, `PKMNWASPARALYZEDBY`,
  `PKMNSITEMCUREDPROBLEM`, `PKMNENDUREDHIT`, `SUBSTITUTEDAMAGED`,
  `PKMNRAISEDDEF`, `PKMNRAISEDSPDEF`, `PKMNCOVEREDBYVEIL`, `HITXTIMES`.
  Three of these needed real data plumbing beyond a messageLines branch,
  added to `prepareMessage` (`factoryBattleScriptFullTurnDecision.ts`): (1) a
  new `scriptingBattler` field on the message event (source
  `gBattleScripting.battler` at print time), letting `B_SCR_ACTIVE_
  NAME_WITH_PREFIX` resolve generically for the on-contact-ability status
  ids; (2) ability-id→display-name substitutions for `B_DEF_ABILITY`
  (Wonder Guard/Levitate) and `B_SCR_ACTIVE_ABILITY` (Static/Poison
  Point/Flame Body/Effect Spore); (3) `rulesContext.multiHitStringCounter`
  surfaced as `HITXTIMES`'s `{B_BUFF1}`. Also closed a real reducer gap:
  `battleEndTurnOrchestration.ts`'s end-of-turn `HOLD_EFFECT_CURE_STATUS`/
  `CURE_ATTRACT` branches never captured `battleTextBuff1Status` before
  clearing the status bits (only the mid-battle post-hit sibling in
  `battleScriptMoveEndOpcode.ts` did), which would have left
  `PKMNSITEMCUREDPROBLEM`'s `{B_BUFF1}` unresolved for the more common
  end-of-turn Lum Berry/Mental Herb cure trigger.
- **Tests:** `tests/presentationStringBatch1.test.ts`, 8 scenarios (one per
  ranked row) through the production kernel (`createFactoryFullTurnBattleState`
  / `submitFactoryFullTurnDecision`) + `createBattleResolutionPresentation`,
  using the constrained-AI staging idiom and a small seed-search helper for
  the RNG-gated triggers (accuracy rolls, 30%-chance contact abilities).
  Red-verified once via `git stash` on the six touched engine files: every
  scenario threw battleStringResolver's exact completeness-guard error
  pre-fix; all 8 green post-fix, asserting the resolved banner text against
  the source-cited templates. `STRINGID_PKMNAVOIDEDATTACK` (part of ranked
  row 2) is mapped but not independently repro'd — its own trigger
  (`isDoubleAvoided`, `battleScriptHitChainOpcode.ts:1212-1213`) is
  `BATTLE_TYPE_DOUBLE`-gated, structurally unreachable in this engine's
  singles-only scope, matching the reachability doc's own row-31 note.
  The new `scriptingBattler` message-event field is exposed unconditionally
  (mirroring `actionSnapshot`), which surfaced 2 pre-existing exact-payload
  assertions (`tests/factoryBattleScriptWakeUpFullTurn.test.ts`,
  `tests/battleScriptTryswapitemsOpcode.test.ts`) — updated both to include
  the new (real, correct) field rather than narrowing the field's exposure.
- **Verified:** `npm run test:smoke` green mid-step (339/339, including
  `abilityItemParityCensus` after adding the new `ABILITY_DISPLAY_NAME_BY_ID`
  constant to that census tool's `ENGINE_INFRA_SPELLINGS` allowlist — a
  table name, not an ability member, same class as the pre-existing
  `ABILITY_NAME_BY_ID` entry). `npm run compare:differential -- turn5-
  rockslide.json battle-command-generated-off.json --base 5b2cddf4
  --summary` (post-commit, base = this commit's parent): **PASS — 384/384
  captures byte-identical across both traces** — neither standing window
  triggers any of the 15 fixed strings, exactly as expected.
- **Next:** ISSUES #70 batch 2 — the 31 remaining unranked ids + the
  `STRINGID_INTROSENDOUT` extractor gap (both scoped in the trimmed #70
  entry). Species-dossier slice 4 (capstone `renderSceneOffTurnView`
  convergence) is still the last ROADMAP slice.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes. Diff stays additive in
  `messageLines`/`prepareMessage`; no timing constants touched (kept clear
  of #69's STAT_TIMING/MESSAGE_TIMING surface per the brief).

---
## 881 — [bounded MAIN worker, 2026-08-03] ISSUES #69 — Scene-OFF stat/message banner cadence FIXED (missing 64-frame post-print hold)

- **State:** master `bb198d16` (one commit on top of `8c78c807`). Full
  `npm test`: **634 files / 6,382 passed / 1 skipped** (+1 from this step's
  new pin). `npm run build` green (tsc -b + vite).
- **Did:** `battleResolutionCommandDuration`'s `"message"` case
  (`battleResolutionPresentationRender.ts`) now adds a `holdFrames` term (0
  by default, 64 for the six stat-change STRINGIDs — `ATTACKERSSTATROSE/
  FELL`, `DEFENDERSSTATROSE/FELL`, `STATSWONTINCREASE/DECREASE`, the
  exhaustive contents of source's `gStatUpStringIds`/`gStatDownStringIds`,
  `reference/pokeemerald/src/battle_message.c:1006-1022`) **after** the
  print-time floor/length term, modeling `BattleScript_StatUp`/`StatDown`'s
  own `printfromtable ...; waitmessage B_WAIT_TIME_LONG`
  (`reference/pokeemerald/data/battle_scripts_1.s:511-514,556-560`;
  `AllStatsUp`'s five per-stat blocks, `:3458-3483`; hold value
  `include/constants/battle.h:324`) as a genuine post-print hold phase, not a
  fudge on print speed. `BATTLE_RESOLUTION_STAT_CHANGE_FRAMES`/`STAT_TIMING`
  drop from the uncited 50/32 placeholder to **2** — the oracle-measured
  silent RAM-write-to-box-clear gap, identical across all 5 omniboost
  banners (`docs/issue69-omniboost-off-ground-truth.md` §2: 283→285,
  375→377, 468→470, 559→561, 652→654) — since the hold is a `message`
  property in source (`waitmessage` follows `printfromtable`, not
  `statbuffchange`), not a `stat` one.
- **Verified:** `tools/compare/issue69OmniboostAppWindow.ts` (the same
  production `battleResolutionCommandDuration` the real render loop calls,
  over the real 5-banner Silver Wind proc sequence) — **before: 373 frames
  total, 74.6 frames/banner** (matches the ISSUES #69 doc exactly); **after:
  453 frames total, 90.6 frames/banner** — closing in on the oracle's
  measured 473 total / ~92/banner (doc §2/§4), from -21%/-19% off to only
  ~-4%/-1.6% off. Residual characterized honestly: the ROM's own last banner
  (SPDEF, transitioning into RATTATA's next move) measures an anomalously
  long ~103-frame gap vs the other four's 89-91 — not a stat-change-script
  property, more likely turn-transition overhead out of this fix's scope;
  the other four land within 1-3 frames of their measured cycle lengths
  (92/93/91/93). `npm run compare -- tools/compare/fixtures/issue69-
  omniboost-dense-seed8.json --summary` (the brief's literal acceptance
  command) does **not** run: that fixture is a raw `mechanicLab`
  scenario (`bin/oracle lab` format — `segments`/`captureFrames` nested
  under a `trace` key), not a compare-tool trace, and no named `appStage`
  exists to replay this exact BUTTERFREE/RATTATA/seed-8 party through the
  compare CLI's oracle-vs-app pixel pipeline (building one is real
  infrastructure work, out of this bounded step — flagged as a PAPERCUT
  below rather than attempted). Used the doc's own established methodology
  instead (the app-window script above), which calls the identical
  production function the real render loop invokes every frame.
- **No-regression sweep:** full Tier-1 suite green (634/634, 6382 tests).
  `battleTurnPortability.test.ts`'s pre-existing real oracle-derived
  kernel-route ONIX/KABUTO SAND-ATTACK stat-fell banner pin moved as
  expected (stat timing 32→2, message timing +64 hold) and was updated —
  not a regression, the generic "every stat-change move" fix correctly
  reaching a second, independent move. `compare:differential` (base
  `8c78c807`, the three standing public sentinels): `battle-command-
  generated-off` **128/128**, `factory-arbitrary-intro-magneton-off`
  **751/751**, `interactive-generated-intro-off` **715/715**, all
  byte-identical before/after — none of these captures reach into a
  stat-change banner region, confirming zero unintended pixel impact.
  Live-oracle spot checks on `turn5-rockslide-off.json` (7/256) and
  `factory-terminal-round-won-off.json` (1/208) are pre-existing broken
  baselines **unrelated to this change** (confirmed identical via
  `git stash` before/after) — both are `canonical-recorded`/legacy-turn-owned
  or non-stat-change windows, structurally untouched by the constants this
  fix moved (each `turnN...PresentationStaging.ts` file already carries its
  own separate local `B_WAIT_TIME_LONG` constant, confirmed by grep before
  scoping). Did not chase that pre-existing oracle-compare breakage — out of
  scope for this step, flagged for whoever next needs live oracle-compare on
  those two fixtures.
- **Next:** species-dossier slice 4 (capstone `renderSceneOffTurnView`
  convergence) is still the last remaining slice. ISSUES #70's
  reachability-verified STRINGID batch-fix remainder is open.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes. **PAPERCUT:** `npm run
  compare` has no working trace/`appStage` path for dense `mechanicLab`
  fixtures like `tools/compare/fixtures/issue69-omniboost-dense-seed8.json`
  without hand-authoring a new named `appStage` (~15 min lost discovering
  this before falling back to the doc's own app-window script).
