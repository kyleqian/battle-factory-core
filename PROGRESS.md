# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 880 — [bounded MAIN worker, 2026-08-03] ISSUES #56 — MAGNETON frame-437 stallLag regression FIXED (closure audit's root cause)

- **State:** one commit on top of `963d6bc2`. Full `npm test`: **634 files /
  6,384 passed / 1 skipped** (+3 from this step's new pins). `npm run build`
  green (tsc -b + vite).
- **Did:** fixed the closure audit's (`docs/issue56-closure-audit.md`)
  named MAGNETON regression: `1aa13ebb` (2026-08-02) had keyed the generated
  Scene-OFF ball-open particle `stallLag` on `isCanonicalAnchorIntro`, which
  gives COMBUSKEN (YOSHI's fixture) and MAGNETON the same value even though
  the 2026-07-31 OAM probe's Round 2 Part A had already proven they need
  opposite values at their shared rawElapsed=31 materialize tick — and
  `1aa13ebb`'s own landing never re-ran the MAGNETON comparison to catch it.
  Neither evidence doc ever produced a species/cry-duration formula for
  *this* mechanism (Round 2 Part A explicitly parked the RAM probe needed to
  find one), and `generatedBattleStartOpponentHandoffTick` already
  normalizes out the only species-dependent delay this subsystem knows
  about — so the split is an honest per-route real-clock phase-alignment
  fact, the same class ISSUES #56 item 2's own design doc already named for
  its sibling display-tail mechanism. New `generatedParticleStallLag`
  (`src/engine/battleScene.ts`) keeps `isCanonicalAnchorIntro`'s lag-1 fact
  for the canonical anchor untouched, and for the generated route keys off
  the opponent's own species via a small, explicitly-scoped, evidence-
  extendable set (currently just MAGNETON) — mirroring the file's existing
  `elevatedEnemyShadowSpecies`/cry-duration-map pattern rather than adding a
  per-trainer selector. Tier-1 pin: 3 new cases in
  `tests/issue56ParticleStall.test.ts` (canonical anchor stays 1 regardless
  of species; MAGNETON generated → 1; COMBUSKEN generated → 0).
- **Verified (fresh reruns against the shared Battle Scene OFF oracle,
  not started/stopped):** `factory-arbitrary-intro-magneton-off`
  **702→703/751** (frame 437 green, matches the pre-regression documented
  baseline, all 48 remaining mismatches are the already-named idle-bounce
  family). `factory-arbitrary-intro-yoshi-off` **700/751 held** (frame 444
  unchanged at its settled 18px display-tail residual; 51 mismatches sum
  into the two named settled classes with no remainder, same as before).
  Canonical insurance: `interactive-generated-intro-off` **715/715**,
  `battle-command-generated-off` **128/128**, both held exactly.
- **Next:** per the closure audit's own stated bar for closure ("both
  fixtures re-verify... with every frame still mapping to the two named
  classes"), ISSUES #56 is now a clean candidate for settled-record
  closure — left as a candidate note rather than deleted outright, pending
  a supervisor closure pass. species-dossier slice 4 (capstone) remains
  untouched as the last slice; ISSUES #68's 47-id presentation-completeness
  reachability sweep (entry 879) is also still open.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, untouched, no
  new recording imports, no barrier-count changes (verified via
  `test:smoke`, all 339 tests green, plus the full suite run above). No
  PAPERCUT this step.
- **[supervisor addendum, ~00:30]** #56 fix verified live (MAGNETON
  **703/751** re-run confirmed). **#56 reclassified as a settled record**
  (supervisor decision): all three numbered items resolved, both public
  intro comparisons' residuals fully in settled classes (YOSHI 51 =
  1 display-tail + 50 idle-bounce; MAGNETON 48 = idle-bounce), route-term
  follow-up concluded 2026-08-01. Moved below the settled-records line
  (ROADMAP gate-5 note cites #56 by number); header lists updated. Open
  backlog is now #70, #69, #55, #39.


---
## 879 — [bounded MAIN worker, 2026-08-02] ISSUES #68 — MURKROW TORMENT presentation crash FIXED + pinned

- **State:** master `64fc0205` (one commit on top of `d7857d4e` — base
  drifted mid-session again: a side-lane merge + two supervisor docs
  commits landed after this step started, `abb89b0e`/`51e8ea13`/
  `0b8c0537`/`d7857d4e`. Note for the supervisor: `d7857d4e` already
  deleted ISSUES #68 from `ISSUES.md` *before* this step's fix landed —
  looks like a race with entry 878's own addendum, which says "#68 ...
  fix worker dispatched." Nothing left to trim here as a result; flagging
  it rather than silently re-adding/re-removing the entry.) Full
  `npm test`: **634 files / 6,378 passed / 1 skipped**. `npm run build`
  green (tsc -b + vite). Differential (`compare:differential`, base
  `d7857d4e`): **PASS, 639/639 captures byte-identical** — 255/256/128
  (turn3-endeavor-off, turn5-rockslide, battle-command-generated-off).
- **Did:** root-caused and fixed ISSUES #68 (same-day user report:
  MURKROW's first TORMENT throws mid-turn). Confirmed hypothesis 1
  exactly: `BattleScript_EffectTorment`'s `printstring
  STRINGID_PKMNSUBJECTEDTOTORMENT` (`battle_scripts_1.s:2139-2149`,
  `battle_message.c:223,676`: "{B_DEF_NAME_WITH_PREFIX} was subjected\nto
  TORMENT!") had zero mapping in `battleResolutionPresentation.ts`'s
  `messageLines` — the generic fallback only ever supplies
  B_ATK_NAME_WITH_PREFIX/B_EFF_NAME_WITH_PREFIX/
  B_SCR_ACTIVE_NAME_WITH_PREFIX/B_LAST_ITEM, so it hit
  `battleStringResolver.ts`'s completeness guard, same class as #65.
  Added one branch mirroring the existing `STRINGID_ITDOESNTAFFECT` shape
  (singles battle: target = ¬lastMoveAttacker, since Torment always
  targets the opponent) resolving `B_DEF_NAME_WITH_PREFIX` from the
  tormented battler. New `tests/murkrowTormentSubjectedPresentationRepro.
  test.ts`: (1) BUTTERFREE vs MURKROW all-four-TORMENT (AGENTS.md's
  constrain-to-one-legal-choice convention); reproduces the crash
  (red before the fix, verified via `git stash`), green after, asserts
  the resolved banner; (2) confirms next-turn `legalDecisions` excludes
  BUTTERFREE's just-used TACKLE (leaving GUST) and that
  `createBattleCommandPresentation`'s `legalMoveBySlot` reflects it
  (null for the blocked slot) — the brief's item 4 next-turn-flow ask.
  Item 4/5's kernel pieces (`checkBattleScriptMoveLimitations`'s TORMENT
  exclusion, `legalMoveDecisions`, all-four-blocked Struggle fallback)
  turned out already covered by `tests/battleScriptSettormentOpcode.
  test.ts`'s "Torment through the generic Factory action-admission seam"
  block (earlier session's work) — that suite never exercises the
  presentation layer, so it never caught this crash; reran, still green,
  untouched. The blocked-slot UI reject (pressing A on a null
  `legalMoveBySlot` entry) already no-ops without printing the source's
  limitation string — a pre-existing, uniform simplification across
  every move-limitation type (PP/Disable/Taunt/Choice/Encore/Torment
  alike), already pinned generically by `battleCommandPresentation.
  test.ts`'s "ignores A on a request-illegal move slot"; left as-is
  (source-faithful printing touches `nextCommandHandoff.ts`/
  `fightCommandPresentation.ts`, both out of scope this step).
- **Insurance sweep (item 3):** grepped every `STRINGID_*` referenced in
  `src/engine/*.ts` (122 distinct ids) against `messageLines`'s explicit
  branches + the generic fallback's 4 safe tokens. 47 reference a
  placeholder the fallback can't supply (mostly B_DEF_NAME_WITH_PREFIX/
  B_SCR_ACTIVE_ABILITY/B_BUFF1/B_BUFF2/B_CURRENT_MOVE/B_ATK_PREFIX2) and
  would throw the same way if actually reached — NOT reachability-
  verified (many are doc-comment citations, not confirmed producible by
  a wired opcode in Factory L50 singles), and far past the "~6" bound to
  fix in-step. Full 47-id list + 4 ids missing from the extracted table
  entirely (STRINGID_FAINTED, STRINGID_INTROSENDOUT,
  STRINGID_ITEMHEALHP_BERRY, STRINGID_USEDMOVE_OPERAND) reported to the
  supervisor in this step's final message for an ISSUES entry.
- **Next:** the enumerated presentation-completeness remainder above
  needs a reachability pass before any more of the 47 get fixed.
  species-dossier slice 4 (capstone) is untouched, still the last slice.
- **Notes:** `tests/executableFrontierRatchet.test.ts` green, no new
  recording imports, no barrier-count changes (checked via
  `test:smoke`). No PAPERCUT this step.

