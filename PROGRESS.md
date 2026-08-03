# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 874 — [bounded MAIN worker, 2026-08-02] species-dossier slices 1+2 LANDED (family-C healthbox factory parameterization)

- **State:** master `4d767598` (two commits on top of `5aaba475`: `8d9f6a64`
  slice 1, `4d767598` slice 2). Full `npm test`: **633 files / 6,376 passed
  / 1 skipped** (+1 file/+6 tests over base). `npm run build` green (tsc -b
  + vite). Combined differential (`compare:differential`, union window list
  per the brief, base `5aaba475`): **PASS, 3,055/3,055 captures
  byte-identical** across all 17 traces (per-trace counts matched or
  exceeded the brief's expectations exactly, e.g. turn5-switchin 241,
  turn13-switchin 242, battle-command-generated-off 128).
- **Did:** per `docs/species-render-entry-point-retirement-design.md` §4
  rows 1-2. Slice 1 (`8d9f6a64`): `PIDGEOTTO_MAX_HP` now reads
  `TURN5_SWITCHIN.replacementHp.max` instead of a bare `156`;
  `murkrowHealthboxContentForHp`'s cache-miss branch reads
  `TURN13_SWITCHIN.replacementHp.max` instead of a bare `142` divisor
  (both occurrences). Turn-6 call sites (`:11934`/`:12581`, the census
  drift the design doc missed) keep reading the same constant, untouched.
  Slice 2 (`4d767598`): the six remaining family-C factories
  (`kabutoHealthboxContentForHp`, `onixPlayerHealthboxContentForState`,
  `featherDanceOnixOpponentHealthbox`, `featherDancePidgeottoPlayerHealthbox`,
  `flyMurkrowPlayerHealthbox`, `magbyPlayerHealthboxContentForHp`) now take
  name/level/maxHp (+gender for kabuto/magby) as explicit parameters
  instead of closing over a module constant/literal; all ~45 call sites
  thread the already-available identity (`ONIX_MENU_BATTLER`,
  `KABUTO_SENDOUT_BATTLER`, `TURN5_SWITCHIN`/`TURN13_SWITCHIN`-derived
  locals, or the pre-change literal for MAGBY, which has no equivalent
  named battler constant) explicitly, matching the already-parameterized
  `extremeSpeedOpponentHealthbox`/`shadowPunchOpponentHealthbox` shape.
  All six exported for testing. New
  `tests/battleSceneHealthboxFactories.test.ts` pins each factory's output
  (2 HP values each) against directly calling
  `composeOpponentHealthbox`/`composePlayerHealthbox` with the pre-change
  literal values — 6 tests, all green.
- **Next:** slices 3/4 of the same dossier (Family-A HP-drain
  generalization; capstone `renderSceneOffTurnView` convergence — both now
  UNGATED since dispatcher ladder slice 10 landed), then slice 5 (turn-15
  Onix gate cluster) and slice 6 (Grovyle/Kabuto intro materialize
  primitive); then entry-871 Turn1-13 type-ref follow-up, #62, #56.
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and
  green — no new recording imports, no barrier-count changes. No ISSUES
  entries closed this step (not in scope). PAPERCUT: the design brief's
  own call-site census undercounted volume for `onixPlayerHealthboxContentForState`
  (19 call sites, 6 relying on an omitted `gender` default) and
  `featherDanceOnixOpponentHealthbox` (13 call sites) — mechanical but
  ~15 min of extra scripted-edit + verification time versus a "small
  parameterization" characterization.
- **[supervisor addendum, ~22:05]** verified slices 1+2 (3-trace spot
  differential re-run 625/625, new factory test 6/6, smoke green).
  Side lane merged (`26df7c7c`): #62 census `05ac3009` — all 314 red
  frames accounted, 5 families, only the 187-frame HP-bar-fraction gap
  is candidate presentation work pending a discriminating state probe;
  ISSUES #62 trimmed to that remainder + routing decision recorded
  (profile-less legacy inputs correctly take the generated route; the
  deleted historical route stays deleted). Side worktree/branch cleaned.

---
## 873 — [supervisor orient, 2026-08-02 ~21:30] animation-main folded (fast concave + convex send-out families); union verified green

- **State:** master `5aaba475` = merge of `animation-main` (`29c9ebe0`, 9
  commits: `ANIM_SWING_CONCAVE_FAST` IGGLYBUFF + `ANIM_SWING_CONVEX_FAST`
  families accepted, Scene-ON evidence + fixtures). Union verified by
  supervisor: full `npm test` **632 files / 6,370 passed / 1 skipped**,
  `npm run build` green. Oracle freshness PASS (both profiles). Animation
  supervisor + nested worker live during fold (fold-race protocol: re-check
  at wind-down).
- **Next:** dispatching species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md` — slices 1+2
  (family-C healthbox factories) first; slices 3/4 now UNGATED (dispatcher
  ladder slice 10 landed `7bd37eab`). Then entry-871 Turn1-13 type-ref
  follow-up, #62, #56 as time allows. Hard deadline 2026-08-03 05:06.
- **Notes:** design-doc window-list drift found while briefing:
  `battle2-off-turn1.json` (179) was deleted at rank-1 retirement — slice-6
  windows are `battle2-turn1-rockslide` 191 / `battle2-action-menu-dense`
  209 / `battle2-off-turn1-staged` 16; `PIDGEOTTO_MAX_HP` has 2 extra
  turn-6 call sites (:11934/:12581) the census missed — folded into briefs.

---
## 872 — [supervisor wind-down, 2026-08-02 ~20:45] slice-9 + slice-10 + full #66 family landed; dispatcher ladder rows 1-10 complete

- **State:** master = this docs commit on top of merge `d263968f`
  (slice-10 `7bd37eab` + side chain `4fd820fc`). Final union verified by
  supervisor at wind-down: full `npm test` **628 files / 6,351 passed /
  1 skipped**, `npm run build` green. DEFERRED.md: no entries opened this
  session. ISSUES #66 removed (fully fixed, see below).
- **Session outcomes (4 workers, 0 failures, all supervisor-verified):**
  1. **animation-main folded** at orient (fast-forward to `e3d7a0bc`, 7
     accepted front-animation families; union suite verified green, entry
     869).
  2. **Slice-9 fold landed** (`c5563c72`): PP-freshness design implemented
     verbatim; 14/14 differential windows byte-identical vs `105c72d5`
     (supervisor re-ran the two formerly-red windows independently);
     census state entries 0/0/0.
  3. **Slice-10 final interface cut landed** (`ad0cfa07`+`7bd37eab`):
     drawFightSubmenuWindow and currentPPForActiveMon positional handoff
     params 13→0 each; 53-trace row-10 union differential 9,238/9,238
     byte-identical vs `d4a89680` (supervisor spot re-ran 3 traces).
     Honest remainder in entry 871: battleScene.ts still carries ~144
     TurnN-handoff type refs on per-turn draw functions row 10 never
     named — that surface belongs to the #39 retirement program.
  4. **#66 fully closed in two stacked side steps** (`3631116d`,
     `4fd820fc`): (a) STATSWONTINCREASE/DECREASE crash fixed
     (red-before/green-after, real-ROM receipt); (b) pre-clamp
     "sharply/harshly" magnitude CONFIRMED by discriminating oracle probe
     (stage 11 + SWORDS DANCE → "sharply rose!" at post-clamp delta 1)
     then fixed via `requestedMagnitude` on the stat-stage-change event;
     plus a third find — generic-route stat names rendered lowercase vs
     the ROM's "ATTACK" — proven pixel-real on the kernel route only
     (162/9600 px diff → 0 after fix; legacy turn-owned windows
     structurally unaffected, which is why standing traces never caught
     it). Evidence docs + fixtures committed under docs/issue66* and
     tools/compare/fixtures/issue66*.
- **Next session (ordered):** (1) species-dossier slices per
  `docs/species-render-entry-point-retirement-design.md` (census 4→45,
  7-slice plan), folding in entry 871's recommended follow-up for
  battleScene.ts's remaining per-turn Turn1-13 type usage (same #39
  retirement surface); (2) #62 generated-route pixel-red reproducers;
  (3) #56 intro residuals.
- **Day-audit (read-only, post-wind-down commit):** 5 angles over today's
  surface — 4 explicitly clean (STAT_DISPLAY_NAME byte-exact vs
  gStatNamesTable; slice-10 helper algebraically equivalent at all-null;
  rebuilt turn5-13 pins kept every numeric tuple; slice-9 x #66 disjoint
  by grep). 1 latent finding filed as ISSUES #67 (unchecked
  `as 1 | 2` magnitude cast from raw script bytes + `>= 2` vs source's
  `== 2`, unreachable with stock data) — **fixed same-session (`e7ef6dab`):**
  runtime guard added at the cast site, `>= 2` tightened to `=== 2` at all
  four sharply/harshly sites, parametrized red/green test added; full
  `npm test` 628 files / 6,353 passed / 1 skipped, `npm run build` green.
- **Notes:** `animation-main` is a moving branch again (live animation
  supervisor + nested worker at wind-down; tip was `54b2d48e`+ during this
  session) — fold at next orient per protocol. PAPERCUTS: new entry for
  the full-suite-vs-Bash-timeout friction flagged by the #66(b) worker.
