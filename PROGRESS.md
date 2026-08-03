# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 878 — [bounded MAIN worker, 2026-08-02] species-dossier slice 7 LANDED (family-B Sitrus anchor/geometry de-hardcoding)

- **State:** master `a29fd795` (one commit on top of `f49e0b27` — base
  drifted from session start `fef2b77e`, a side-lane merge landed
  mid-session, same shared-master pattern noted in prior entries). Full
  `npm test`: **633 files / 6,376 passed / 1 skipped** (unchanged from
  base). `npm run build` green (tsc -b + vite). Differential
  (`compare:differential`, base `f49e0b27`): **PASS, 985/985 captures
  byte-identical** — 110/82/181/133/110/241/128, every brief-cited count
  matched exactly (turn5-sitrus-a/b/c/d, turn5-faint, turn5-switchin,
  battle-command-generated-off).
- **Did:** per `docs/species-render-entry-point-retirement-design.md` §4
  row 7, §1.3B, §5 traps 1/3. `turn5ResolutionAdapter.ts` now exposes
  three RAM-probed facts as adapter-owned exports (same hosting precedent
  as its existing `PIDGEOTTO_COMMAND_MENU_REDRAW_TICK`): `Turn5SitrusAdapter.
  procTriggerRamTick` (6872, the real Sitrus-proc-trigger RAM tick),
  `Turn5SitrusAdapter.onFieldCenter` ({x:72,y:88}, Onix's on-field screen
  center the ring/stars anchor to — the generic per-battler field-geometry
  catalog, `battleCommandFieldArt.ts`, isn't reachable from this staged-
  machine-state adapter, so this took the brief's documented-literal-fact
  fallback), and `Turn5SwitchInAdapter.materializeSettleTick` (6828,
  Pidgeotto's switch-in materialize settle). `battleScene.ts`'s
  `ONIX_SITRUS_IDENTITY_RENDER_TICK` (the shared epoch all seven family-B
  wrappers — `onixSitrusRotateMatrix`, `turn5GrantingStarPlacement`,
  `turn5SitrusHealTextVisibleChars`, `turn5SitrusOnixHp`,
  `turn5SitrusResettledBounceTick`, `onixSitrusTintCoeff`,
  `turn5SitrusRingMatrix` — key off, per trap 1), `TURN5_SITRUS_RING_CENTER`,
  and `TURN5_PIDGEOTTO_SETTLE_TICK` (feeding `turn5PidgeottoHealthboxSlideDx`)
  now derive from those adapter facts instead of hand-derived module
  constants — all moved in the same commit per trap 1. Trap 3 (lag
  asymmetry): kept rotate's own +2 render lag and the ring/stars' own +1
  render lag as two separately named constants
  (`ONIX_SITRUS_ROTATE_RENDER_LAG`/`TURN5_SITRUS_RING_RENDER_LAG`) with a
  runtime guard asserting they stay exactly 1 apart — only the rotate lag
  drives the shared epoch (matching what `heldItemHeal.ts`'s own
  `SITRUS_ITEM_*_FIRST_AGE` constants were fit against), so the ring/star
  fact is preserved as its own named constant rather than silently merged
  into one lag or used to compute a second, drifting epoch. All numeric
  values unchanged (6872, 72/88, 6828) — this moves ownership, not fit.
- **[supervisor addendum, ~23:55]** slice 7 verified (422/422 spot
  differential). #56 closure audit merged earlier (`f49e0b27`,
  `docs/issue56-closure-audit.md`): YOSHI 700/751 fully settled-classed;
  **MAGNETON regressed 703→702** (frame 437, 201px) — root-caused to
  `1aa13ebb`'s shared stallLag keying, landing never re-ran MAGNETON;
  ISSUES #56 updated with the bounded fix prescription. User play session
  filed #68 (TORMENT crash — fix worker dispatched) + #69 (omniboost OFF
  cadence + RNG bias — side probe running). Play-preview worktree serving
  frozen `3a165507` on :5199 (intentional, exclude from stale sweeps).
  `turn5SitrusResettledBounceTick` keys off a separate constant
  (`TURN5_SITRUS_MENU_REDRAW_TICK`, 7222) not among the three anchors the
  brief named, so it needed no change — confirmed by grep before scoping.
- **Next:** wrapper renames to species-neutral names (item 4, in scope
  only if the diff stays reviewable) were left as the honest remainder —
  ran out of budget after the anchor de-hardcoding landed clean. Slice 4
  (capstone `renderSceneOffTurnView` convergence) is now the LAST
  remaining species-dossier slice (1/2/3/5/6/7 all landed).
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and
  green — no new recording imports, no barrier-count changes. No ISSUES
  entries touched this step (not in scope).
