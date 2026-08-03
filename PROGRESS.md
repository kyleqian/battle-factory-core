# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 875 — [bounded MAIN worker, 2026-08-02] species-dossier slice 5 LANDED (turn-15 Onix gate cluster + family-H party literal)

- **State:** master `1c144a1c` (one commit on top of `537110fd`). Full
  `npm test`: **633 files / 6,376 passed / 1 skipped** (unchanged from
  base — naming/threading only, no new tests needed). `npm run build`
  green (tsc -b + vite). Differential (`compare:differential`, 13-trace
  window list from the brief, base `537110fd`): **PASS, 1,544/1,544
  captures byte-identical** — 256 (fly-strike), 43/43, 46/46, 16/16,
  144/144, 195/195 (rung pairs), 200/200 × 2 (party-select pair), every
  count matching or exceeding the brief.
- **Did:** per `docs/species-render-entry-point-retirement-design.md` §4
  row 5, §1.3H. Renamed the six grep-confirmed single-caller turn-15 gate
  functions to species-neutral names, threading their species-scoped
  constants as explicit parameters from the sole caller
  (`drawTurn15FlyStrikeWindow`) instead of closing over them — mirroring
  the rank-4 "caller passes its own staged stat" idiom, same shape as
  `dragonBreathGrovyleHp`'s `startHp`/`endHp` params:
  `turn15OnixInvisible`→`turn15StrikeTargetInvisible(t, pulseStartTick,
  pulseEndTick, pulsePeriod)`, `turn15MurkrowInvisible`→
  `turn15StrikeAttackerInvisible(t, revealTick)`, `turn15OnixShakeX2`→
  `turn15StrikeTargetShakeX2(t, magnitude, ramTicks)`,
  `turn15OnixHealthboxWobbleY2`→`turn15StrikeTargetHealthboxWobbleY2(t,
  wobbleStartTick, wobbleTicks)`, `turn15OnixHp`→`turn15StrikeTargetHp(t,
  startHp)`, `turn15OnixSinkSkipRows`→`turn15FaintSinkSkipRows(t,
  sinkStartTick, sinkRate)`. The previously-inline literal window
  boundaries (19107/19134/4/19075) are now named module constants passed
  at the call site, matching the file's existing convention. No formula
  change — every number is identical, this is naming + parameter
  threading only. Family H: collapsed the duplicated
  `(["ONIX","MAGBY","BAYLEEF"] as const)` literal (identical in
  `drawTurn15PartySelectList`/`drawTurn15PartyListObjMask`) into one
  named `TURN15_CANONICAL_PARTY_SPECIES` module constant; gating logic
  unchanged (deeper H retirement — reading the roster from real party
  state — stays out of scope per the brief).
- **Next:** slice 6 (Grovyle/Kabuto intro materialize primitive, family
  E) is the next ladder-independent slice; slices 3/4 (family-A HP-drain,
  capstone `renderSceneOffTurnView`) and slice 7 (family-B Sitrus anchor)
  remain after that. Turn-14's own `turn14MurkrowInvisible` stays
  untouched (different window/adapter, explicitly excluded by the brief).
- **Notes:** `tests/executableFrontierRatchet.test.ts` untouched and
  green — no new recording imports, no barrier-count changes. No ISSUES
  entries touched this step (not in scope).

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
