# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 877 — [bounded MAIN worker, 2026-08-02] species-dossier slice 3 LANDED (family-A HP-drain closed-form generalization)

- **State:** master `bb5289b2` (one commit on top of `40dcddff`). Full
  `npm test`: **633 files / 6,376 passed / 1 skipped** (unchanged from
  base — pure rename + adapter-source threading, no new tests needed).
  `npm run build` green (tsc -b + vite). Differential (`compare:differential`,
  10-trace window list from the brief plus `turn12-aerialace-off.json`
  insurance, base `40dcddff`): **PASS, 2,095/2,095 captures byte-identical**
  — 237/141/233/231/206/247/256/255/161/128, every brief-cited count
  (237, 141, 233, 231, 206, 256, 128) matched exactly.
- **Did:** per `docs/species-render-entry-point-retirement-design.md` §4
  row 3, §1.3A/§3 family-A row (gate opened by slice 10's dispatcher-ladder
  landing). Renamed the four species-suffixed HP-drain closed forms to
  drop their species suffix, keeping the move/turn prefix (matching
  `rockSlideOpponentHp`'s already-generic precedent):
  `dragonBreathGrovyleHp`→`dragonBreathHp` (battleScene.ts, 2 call sites:
  Grovyle turn 2, Pidgeotto turn 13), `endeavorOnixHp`→`endeavorHp`
  (battleMenu.ts, exported, 3 call sites: turns 2/3/5), `turn9OnixHp`→
  `turn9Hp` (1 call site), `turn10AerialAceOnixHp`→`turn10AerialAceHp`
  (2 call sites: turns 10/12). No formula or default-value change — every
  call site's resulting value is unchanged (trap 2 audited: all four
  functions' body/signature untouched except the name). Moved turn-9's
  and turn-10/12's `{from,to}` HP-drain endpoints off call-site literals
  onto their owning resolution adapters — `turn9ResolutionAdapter.ts`'s
  new `TURN9_QUICKATTACK_HP` (31→24), `turn10ResolutionAdapter.ts`'s new
  `TURN10_AERIALACE_HP` (24→14), `turn12ResolutionAdapter.ts`'s new
  `TURN12_AERIALACE_HP` (14→4) — the same shape
  `TURN13_DRAGONBREATH_HP.{from,to}` already uses, each adapter file
  wiring its own private literal (matching the file's existing sibling-
  independence convention, e.g. the ROCK_SLIDE HP chain) rather than
  cross-importing a sibling adapter's constant. battleScene.ts's own
  widely-reused scalar constants (`TURN9_ONIX_AFTER_QUICKATTACK_HP` etc.,
  8+ downstream consumers each) now read `.to` off the new adapter
  records instead of a bare literal, leaving every other consumer
  untouched. Turn-2/turn-3/turn-5's `endeavorHp` endpoints were already
  adapter/staging-derived (`TURN2_ENDEAVOR_HP`/`TURN5_ENDEAVOR_HP`/
  `BATTLE1_PRESENTATION_HP`) — verified provenance, left untouched per the
  brief's "do not churn" instruction. All rename references (doc comments,
  `tests/battleMenu.test.ts`, `tests/battleScene.test.ts`,
  `tests/turn{2,5}EndeavorPresentationStaging.test.ts`,
  `tools/probe/verify-turn13.ts`, two other tools/ scratch scripts) updated
  to match.
- **Next:** slice 4 (capstone `renderSceneOffTurnView` convergence, now
  UNGATED) is the last species-dossier slice; slice 7 (family-B Sitrus
  anchor) remains after that.
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and
  green — no new recording imports, no barrier-count changes. No ISSUES
  entries touched this step (not in scope). PAPERCUT: `npm test`
  (~8.5 min wall-clock this session, vs. AGENTS.md's "~5-7 min") exceeded
  the Bash tool's foreground timeout and got auto-backgrounded by the
  harness rather than by my own choice — recovered by polling the
  originating process's pid in a single blocking loop rather than trusting
  a detached notification, per the execution-discipline note, but cost
  ~5 min of extra care; likely contention from concurrent sibling
  worker/animation test runs on the same shared machine this session.

---
## 876 — [bounded MAIN worker, 2026-08-02] species-dossier slice 6 LANDED (family-E materialize primitive + family-F palette source-sprite threading)

- **State:** master `d2608e83` (one commit on top of `68718a2a`). Full
  `npm test`: **633 files / 6,376 passed / 1 skipped** (unchanged from
  base). `npm run build` green (tsc -b + vite). Differential
  (`compare:differential`, corrected 8-trace window list, base `68718a2a`):
  **PASS, 1,429/1,429 captures byte-identical** — 191/209/16 (the three
  corrected battle2 windows), 170/151 (sendout-dense pair), 230/256/206
  (clone/doubleteam/aerialace), every count matching the brief.
- **Did:** per `docs/species-render-entry-point-retirement-design.md` §4
  row 6, §1.3E/F. Family E: extracted `drawFrontBackMaterialize(fb,
  tileset, palette, corner, geometry)`, a discriminated union
  (`settled`/`tint`/`stretch`/`rotate`) over the family's whole closed set
  of draw modes — each variant forwards to the exact already-generic
  low-level sampler (`drawSpriteSheet`/`drawSpriteSheetAffineTinted`/
  `drawSpriteSheetAffineStretch`/`drawSpriteSheetAffineRotate`) with its
  prior arguments unchanged. The six named functions
  (`drawGrovyleSettled`, `drawGrovyleMaterialize`, `drawKabutoMaterialize`,
  `drawGrovyleStretch`, `drawGrovyleStretchEarly`,
  `drawKabutoHSlideWobble`) kept their names and per-species/per-tick
  geometry math, becoming thin callers that resolve one geometry object
  and hand it to the primitive — no formula change, only removing the
  duplicated tileset/corner/low-level-call boilerplate each repeated. Did
  NOT force plain-draw/stretch/rotate into the tint-accumulator transform
  itself (they're genuinely different samplers); the primitive's
  parameter list adapted to the union of what the six bodies actually
  share, per the brief's own "do not force-fit" latitude. Family F:
  `getOnixDoubleTeamClonePalette`/`turn10OnixDarkPalette` now take the
  source `BattleBackSpriteAsset` as a parameter instead of closing over
  `onixBackSprite` by name; both call sites (the generic staged
  DOUBLE_TEAM clone renderer, `drawTurn5RockSlideAttack`'s two turn-10
  darken branches) thread `onixBackSprite` in explicitly. Palette
  derivation math byte-identical.
- **Next:** slices 3/4 (family-A HP-drain, capstone
  `renderSceneOffTurnView`) and slice 7 (family-B Sitrus anchor) remain.
  Slice 6 was the last ladder-independent slice besides those two gated
  ones — 3/4 are UNGATED (dispatcher ladder slice 10 already landed).
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and
  green — no new recording imports, no barrier-count changes. Base sha
  drifted from the step brief's assumption (other lane work landed on
  master mid-session: `68718a2a`, 3 commits ahead of the branch snapshot
  at session start) — recorded and used as the actual differential base.
  No ISSUES entries touched this step (not in scope).
- **[supervisor addendum, ~23:10]** slice 6 verified (653/653 spot
  differential). Side scout merged:
  `docs/battlescene-turnN-typeref-retirement-design.md` (`3946958c`) —
  entry-871's ~144 TurnN type refs censused literally (45 functions, 4
  families), 54+9+9=72 provably dead (all call sites pass literal null;
  existing shadow-equivalence suite pins the generic path), 6-slice plan;
  its slices 3/4b collide with species-dossier slice 7's file region →
  serialized on main, never concurrent. Side worktree/branch cleaned.

