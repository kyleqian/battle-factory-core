# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

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

## 967 — [bounded MAIN worker, 2026-08-06] #80 rank 5 bound: in-battle party-menu status + held-item icons (spec 0/251->0/251 with 453px/frame off, all target bboxes glyph-exact)

- **State:** master `3e1d718e`, clean. Typecheck green; full `npm test`
  **754 files / 7132 passed / 1 skipped**; `npm run build` green.
  `battle-command-generated-off` **128/128**, `mid-battle-switch-dense-a-off`
  **95/95**, `fight-menu-chrome-torment-off` **52/57** — all unchanged.
- **Did (per `docs/party-menu-status-item-ground-truth.md` §7, one commit per
  rung):** (1) compare spec + app stage
  `party-menu-status-item-off` landed (mirrors `midBattleSwitchDenseOffStage`
  with the fixture's items 200/217/183 + opponent THUNDER_WAVE x4); oracle
  runs 251/251 twice-stable, app baseline 9687-9759px/frame (status glyphs
  rendered as Lv50 text). (2) `BattlePartySelectRow` + both state builders
  thread `item` (source party record) + `primaryStatusFromStatus1` (variant
  names poison|paralyzed|sleep|frozen|burn; Toxic collapses to poison;
  sleep-over-paralysis precedence) — forced-party projection threads them via
  `PartySelectMember` (sourced from the corpus rental record, so the canonical
  constant's items synced to 142/221/179). (3) `drawHeldItemIcon` (banked
  `party-menu-held-item.json` frames.item 8x8 at `heldItem` centers
  (20,50)/(108,28)/(108,52), hidden for ITEM_NONE) + `drawStatusIcon` (banked
  `party-menu-content.json` statusIcons 32x8 frame at `status` centers,
  drawn only for non-none) via a shared center-based `blitIconFrame`; Lv50
  gated on `status === null` (mirrors `DisplayPartyPokemonLevelCheck`).
  Draw order per sPartyMenuSpriteCoords: icon, heldItem, status, pokeball.
- **Oracle/acceptance:** frame-2150 target bboxes glyph-exact — status
  x40-59/y48-55 + x126-145/y23-30 (156/156 glyph pixels per the doc's own
  template measure) and item x17-23/y47-53, x105-111/y25-31, x105-111/y49-55
  (slot 2 fully byte-exact). Slot 2 keeps Lv50; slots 0/1 show the PRZ glyph
  and no level text (level-rect ink counts match the oracle 208/208 and
  137/137). Per-frame diffs 2050-2300 drop to **9234-9306px**, `<=` the
  rung-1 baseline on all 251 frames (0 frames worse; max reduction 453px).
  Residual classes (all pre-existing, out of scope): (a) the rank-6 cursor
  selected/unselected wash + card-text swap (~2180px; oracle cursor sits on
  slot 0, app on slot 1), incl. the 4 corner pixels per status bbox + 2 per
  item bbox; (b) the staged-RATTATA mon-icon/box palette class (~4-5kpx);
  (c) Lv50/HP-text ink class (~1.2kpx, app prints Lv50 blue vs oracle's
  white). Tier-1 pins: 4 new in `tests/inbattlePartyMenuVisualBind.test.ts`
  (item-on/off centers, variant selection paralyzed-vs-sleep, Lv50
  suppression via pixel (141,29), status1->variant mapping), all 3 pixel
  pins red-verified (3 failed with the draw change stashed).
- **Next:** #80 rank 6 (cursor/ball/selection + party-menu fade pixels),
  then the RECORD/RETIRE binds and lobby walkable + REST guard per PROGRESS
  966's ordered list.
- **Notes:** the app's party-menu-open cursor rule (active mon) differs from
  the oracle's (slot 0) — rank-6 cursor scope, flagged not fixed. The oracle
  prints Lv50 in white vs the app's card-text ink — pre-existing
  `drawRowText` color class, deliberately not changed this step (would risk
  the pinned 128/128). PAPERCUT: none new.

## 966 — [supervisor WIND-DOWN, 2026-08-06] Session summary: 10 workers / 5 rounds — #78 switch route fully bound, #81 fight menu 52/57, same-day canary regression caught+fixed, #80 rank 2 + 34 walk-in sheets landed, rank-5 ground truth banked

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **754 files / 7128 passed / 1 skipped**
  (+44 tests today), `npm run build` green, `mid-battle-switch-dense-a-off`
  **95/95**, `battle-command-generated-off` canary **128/128**,
  `fight-menu-chrome-torment-off` **52/57** (5 measured residuals listed in
  ISSUES #81). `animation-main`: nothing to fold at orient or wind-down. No
  worker worktrees/branches left. DEFERRED.md: no open entries.
  Oracle-freshness FAIL at orient was again the documented docs-only false
  positive (only `_template`/NOTES harness commits since oracle start).
- **Did (10 workers: 5 main, 5 side; 2 cap-kills, both salvaged):** MAIN —
  (961) #78 ball-fade mechanism bind, field byte-exact incl. the 1-frame
  render lag; (962) torment settled frames byte-exact via 3 staging pins
  (two prior attributions falsified: "type cell"/"type text" were staging,
  "HP-cap" was staged HP); (963) class-4 bounce bind 11→52/57 + the
  phantom-fade source gate; (964) canary regression isolated — `0aeb2fde`
  introduced 82/128, `f0b52d7d`'s gate IS the whole fix, differential vs
  `a75c0f3a` clean; (965) #78 residuals 1a-1d all bound (doubled affine box
  + 2-tick OAM latch, emerge acc-58 + textured ball-blend + 1-tick lag,
  healthbox slide +1 tick, pure ball-open particle scheduler). SIDE —
  fight-menu chrome ground truth (arrow class falsified, singles have no
  target arrow); #80 rank 2 landed (ROM mon-icon sAnim_0 cadence +
  party-box bank-3 palette; frame-905 6810→4975px); §10 OAM ground truth
  for 1a-1d (probe twice-run byte-identical + 2 doc corrections); all 34
  tower walk-in sheets extracted+wired (0 px mismatches; LILIANA 903/903 +
  FISHERMAN 98/98 hold); #80 rank-5 status/held-item ground truth (fixture
  twice-run 251/251, PRZ template 156/156, level-text-suppressed-by-status
  finding).
- **Next (ordered):** (1) #78: extend the dense spec across the fade
  windows (measured remainder: 1188 27px emerge sliver, 1200 254px,
  1205-1207 staged-RATTATA class) and then the 1256-1407 fight-menu window;
  (2) #81's 5 residual frames (3 phase-boundary freeze-schedule frames —
  needs the shared battle-1 freeze constant question answered — + 2
  message-pacing); (3) #80 rank-5 bind per
  `docs/party-menu-status-item-ground-truth.md` §7, then rank 6; (4)
  RECORD/RETIRE binds per `docs/postwin-record-retire-ground-truth.md` §5;
  (5) lobby walkable + REST guard.
- **Notes:** two worker regression/attribution claims were disproven by
  supervisor cross-checks same-day (962's "pre-existing at baseline";
  963's "identical before/after gate") — verify such claims with per-frame
  sets and pixel samples before rebriefing on them. Salvage note: a draft
  1b boundary pin (frame-1104 particle count 15-vs-14) was dropped red at
  wind-down; re-derive from §10.2 with an oracle check if wanted. User
  directive mid-session: user reports are now written in Simplified
  Technical English (SUPERVISOR.md communication section updated).
  PAPERCUTS +2 (periodic-phase reconstruction tooling; diff-PNG legend).

## 965 — [bounded MAIN worker, 2026-08-06] #78 residuals 1a-1d bound: switch-out scale-up, send-in emerge, healthbox slide lag, ball-open particles — dense 95/95, command spec 128/128

- **State:** master `9a9c6563`, clean at commit. Typecheck green. Full
  `npm test` + `npm run build` NOT run (cap-killed at the docs gate);
  typecheck + `battle-command-generated-off` **128/128** +
  `mid-battle-switch-dense-a-off` **95/95** are the last verified tiers.
- **Did:** bound §10.5's four residual classes smallest-risk-first, one
  commit each: (1d `d8fd6b41`) healthbox slide keyed off elapsed 66-88 (the
  oracle renders the slide one tick later than the RAM: 110→0 over rendered
  1206-1228) — the 186-1379px healthbox band vanished, leaving only the
  particle + palette classes; (1a `07f632cb`) switch-out scale-up now uses
  the doubled 128px affine box + the `SetBattlerSpriteYOffsetFromYScale`
  feet-anchor y2 formula (var=64-2*13=38, `(var - floor(var<<8/scale))/2`),
  AND the rendered scale lags the §10.1 RAM table by **2 ticks** (the
  gOamMatrices write latches into the OAM matrix table two frames later —
  pixel-fit proved frame N renders §10.1's N-2 value; 813-988px → 46-78px,
  the mon scale-up itself byte-exact); (1c `2209e353`) emerge starts acc 58
  (not 76) + descends via the shared `MATERIALIZE_Y2_TABLE` (now exported)
  + textured OBJ-row ball-blend instead of the flat tint, rendered **1 tick
  behind** the §10.3 RAM table — 1189-1199 byte-exact (was 51-442px);
  (1b `9a9c6563`) recall (1089-1130, base (72,112)) + send-in (1187-1228,
  base (72,123)) ball-open particles via a pure scheduler
  (`midBattleSwitchParticleSchedulesAt`, age = frame-start-2-i, one-tick
  render lag) + the existing Sin/Cos + `sAnim_RegularBall` machinery —
  recall 1091-1099 and send-in 1195-1203 byte-exact.
- **Oracle:** `mid-battle-switch-dense-a-off` **95/95** (unchanged);
  `battle-command-generated-off` **128/128** (switch-route draws gated on
  `sourceDecision.kind === "switch"`, no leak into the GUST resolution).
  Remaining dense residuals (all measured): 1188 27px (emerge first-sliver),
  1200 254px, 1205-1207 25-48px (the pre-existing staged-RATTATA mon
  palette class, PROGRESS 957 side-asset) + 1203-1204 ~30px (particles tail
  + palette).
- **Next:** (1) extend the dense spec's `captureFrames` across 1091-1126 +
  1185-1227 (stage 5) — the committed spec stays 95/95; byte-exact is
  blocked only by the ~25-254px palette class; (2) the 1256-1407
  fight-menu window (out of scope for this step).
- **Notes:** three of the four classes needed a render-lag correction vs the
  doc's RAM tables (healthbox +1, particles +1, switch-out scale +2, emerge
  +1) — the probe reads the register/state the tick it's written, which
  renders one or two frames later; the §10 tables are the RAM state, not the
  rendered frame. PAPERCUT: the §10.2 particle z-order/draw-order and the
  scale-up pixel-fit each cost ~30-40 min of scratch-python forensics the
  doc's RAM-only tables couldn't answer (they had no per-frame rendered
  pixel ground truth).

## 964 — [bounded MAIN worker, 2026-08-06] ball-fade canary regression isolated + already-fixed: 0aeb2fde introduced 82/128, f0b52d7d's gate restores 128/128 — no source change needed, 962/963 corrected

- **State:** master `407635d0`, clean at commit. Typecheck green; smoke
  347/347. Full `npm test` + `npm run build` at session-end gate.
- **Did:** decisively isolated the `battle-command-generated-off` regression
  the supervisor brief attributed to 0aeb2fde — then proved the current tree
  already fixes it, so **no source edit was warranted** (supervisor's 15:10
  "matched-frame set identical before/after the gate" was itself wrong).
  Worktree receipts (app-vs-oracle, all fresh oracle replays): a75c0f3a
  (pre-0aeb2fde baseline) = **128/128**; 0aeb2fde = **82/128** with exactly
  the reported 2124px plateau bbox 42,59-100,111 (frames ~119-135, the
  non-switch GUST resolution's `fadeTick` landing in the recall window);
  27be9ea2 (0aeb2fde descendant) = 82/128, i.e. PROGRESS 962's "pre-existing
  at session-start baseline" claim only checked post-0aeb2fde commits —
  **WRONG**, corrected below. f0b52d7d (the `sourceDecision.kind === "switch"`
  gate) = **128/128**; HEAD = **128/128** and `compare:differential --base
  a75c0f3a` clean 128/128 byte-identical. Gate red-test: reverting JUST the
  gate line at HEAD reproduces the identical 82/128 (same 46 frames, 2124px),
  so the gate is the whole fix — no other leak in 0aeb2fde's touch set.
- **Oracle:** `battle-command-generated-off` **128/128**, differential vs
  a75c0f3a clean; `mid-battle-switch-dense-a-off` **95/95**;
  `fight-menu-chrome-torment-off` **52/57** (same documented 5: 736/766/977
  freeze-boundary + 1100/1200 message-pacing, ISSUES #81). Tier-1 gate pins
  (`tests/battleResolutionPresentation.test.ts` "midBattleSwitchFade gate",
  2) re-red-verified this session (both fail with the gate line stashed).
- **Next:** canary regression closed as already-fixed; per ROADMAP continue
  #80 ranks 2/5/6, RECORD/RETIRE, lobby walkable, 31 tower gfx.
- **Notes:** PAPERCUT: supervisor's 15:10 "identical before/after gate"
  evidence path was wrong (the gate demonstrably flips 82↔128 on the canary);
  the reliable recipe was worktree compare at the four lineage commits + a
  one-line gate revert at HEAD. 963's "re-verified 82/128" line is likewise
  corrected — f0b52d7d is 128/128.
