# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 953 — [interactive supervisor WIND-DOWN, 2026-08-05] Session summary: 10 workers / 5 rounds — swap-YES 248/248, provenance receipt, 4 user play-test bugs closed same-day, RECORD/RETIRE ground truth, animation fold

- **State:** master at this entry's commit, clean. Final independent union
  verification: full `npm test` **730+ files / 7,014 passed / 1 skipped**
  (+37 tests today), `npm run build` green, smoke green, animation-inventory
  pin green post-fold, `bin/oracle info` green. `animation-main` fully
  folded (METAL_CLAW 140/140, AGILITY complete, BULK_UP 104/104 — inventory
  now 113 exact). No worktrees or worker branches left; DEFERRED.md still
  has no open entries. Oracle freshness FAIL at orient was the documented
  docs-only false positive (harness commits since start touch only
  `_template`/NOTES) — no restart was needed.
- **Did (10 workers, 2 cap-kills both salvaged clean, 0 lost work):**
  R1: #73 swap-YES bound **248/248** (+2 generic src fixes) + #55 battle-2
  opponent provenance receipt (LILIANA byte-for-byte from the probed cursor;
  single-frame selection, per-mon construction cursors). R2: #76 Confuse Ray
  crash fixed same-day (confusion string family + reachable-gap census:
  38 unresolved ids split Factory-plausible vs out-of-scope) + #77 cadence
  ground truth. R3: #77 CLOSED (effectiveness/crit hold B_WAIT_TIME_LONG) +
  #78 switch ground truth (105-frame schedule, RAM-proven emerge ramp).
  R4: #78 slices 1-3 (cadence + materialize + healthbox slide; recall span
  remains) + #79 verdict + #80 party-menu inventory (~40% px, ranked).
  R5: #79 CLOSED (fight-menu handoff redraw was the break; DIG sibling
  pinned) + RECORD/RETIRE ground truth (headline: the prebattle-room
  question shows NO visible YES/NO window — dismiss-A IS default-NO,
  re-asked menu byte-identical; YES unreachable in that staging, flagged
  as hypothesis; RETIRE-YES tail = the already-exact LOSS script).
- **User decisions this session (recorded in ROADMAP S10 + ISSUES #73):**
  full battle-parity breadth (all legal Gen-3 singles; barriers become
  implement-or-prove-unreachable; doubles out), RECORD stub-only, REST
  unselectable, RETIRE via loss-flow reuse, lobby walkable/no-exit/no-PC/
  silent NPCs. Play-preview worktree serves the user's pinned build at
  :5199 (commit `974ef563` — PRE-dates today's fixes; re-pin on request
  only, user directive "will NOT be overwritten").
- **Next (ordered):** (1) #55 provenance wiring into `winTerminalWindowStage`
  per receipt §7 → extend canonical WIN past 10638 (LILIANA room content);
  (2) #78 slice 4 (recall span) + dense-compare wiring; (3) #81 torment
  rejection message (resolver census names its string id); (4) #80
  party-menu binds per inventory; (5) RECORD/RETIRE binds per ground truth
  (resolve the YES-window staging hypothesis first); (6) lobby walkable +
  REST guard. No open DEFERRED entries; nothing blocks the next session.

---

## 952 — [bounded MAIN worker, 2026-08-05] ISSUES #79 CLOSED: airborne FLY/Dig sprite hidden through the fight-menu handoff

- **State:** master `21128f7a`, clean. Red-verified Tier-1 pins + fix committed.
- **Did:** ground truth (`docs/fly-semi-invisible-off-ground-truth.md`) said the
  consumption chain "looks wired end-to-end" — and the resolution path is
  (Tier-1-pinned). The break was the **fight-menu draw path**: the turn boundary
  hands the scene to `renderGeneratedBattleCommandPresentation` →
  `drawBattle2ActionMenuWindow`, which drew the fieldArt opponent/player sprites
  unconditionally — so the airborne opponent's sprite reappeared for the entire
  turn-boundary menu idle (~1200 of the staged trace's frames 333-1523). Fix is
  generic: `BattleCommandPresentationState` gains a persistent
  `spriteVisibility {player,opponent}`; `settledCommandForResolutionHandoff`
  threads it from the orchestrator `battlePresentationBoundaries` (already
  updated by `commitCompletedResolutionCommand` on every sprite-visibility
  receipt); the render view exposes it; `drawBattle2ActionMenuWindow` gates the
  sprite draws on it with the healthbox untouched (real
  `OpponentHandleSpriteInvisibility` semantics — Dig/Fly hides sprite only,
  recall hides both); the resolution confirmHandoff branch passes the
  resolution view's own visibility. Pins: `tests/flySemiInvisibleSceneOffPresentation.test.ts`
  (4 tests, each red-verified before the fix): (1) OFF-kernel ONIX-SPLASH vs
  MURKROW-FLY charge + locked strike — sprite hidden from the charge moveend
  through the strike, healthbox always true, restored at the strike moveend;
  (2) DIG sibling same toggle, healthbox never hidden; (3) fight-menu handoff
  carries `spriteVisibility.opponent === false` after the charge; (4) the
  fight-menu renderer's hidden-opponent frame differs from the visible frame
  only in the sprite region.
- **Next:** #81 torment message, #80 party-menu inventory, #55 provenance
  wiring, #78's recall-span slice 4.
- **Notes:** full `npm test` **730 files / 6,991 passed / 1 skipped**, build
  green, typecheck green, smoke 347/347, and insurance
  `compare:differential --base a0b9ad9a` **384/384 byte-identical**
  (battle-command-generated-off 128/128, turn15-fly-strike 256/256 — the
  canonical Fly window unmoved).

---

## 951 — [bounded MAIN worker, 2026-08-05] ISSUES #78 slices 1-3 landed: mid-battle switch cadence + materialize + healthbox slide

- **State:** master `db74b38c`, clean. Three green commits on top of the #77
  merge: slice 1 `f0890416`, slices 2/3 `db74b38c`. Smoke **347/347**,
  typecheck green, orchestrator/turn-portability/evidence suites green, and
  insurance `compare:differential --base d0a28fc3` **579/579 byte-identical**
  (battle-command-generated-off 128/128, turn15-sendout-rung6 195/195,
  turn15-fly-strike 256/256 — forced-switch-after-faint windows unmoved).
  Ground truth: `docs/mid-battle-switch-presentation-ground-truth.md` §2/§3/§6.
- **Did:** (1) **Slice 1 — cadence (closes 78(b)):** `SWITCH_IN_TIMING`
  `minimumFrames` 1→**91** (`SWITCH_IN_SPAN_FRAMES`, cited to `Cmd_switchinanim`
  battle_scripts_1.s:3122: the 1140-1230 `CONTROLLER_SWITCHINANIM` lifetime).
  With the app's 24f SWITCHINMON message + 1f party-summary hide, the
  opponent's move lands at the source's 116-frame gap exactly; "Go! …!"
  persists via latestMessage. Red-verified Tier-1 pin. (2) **Slices 2/3 —
  materialize + healthbox slide (closes 78(a)):** `midBattleSwitchInAt` keys
  the send-in on the switch-in command's own phaseElapsed: ball throw (45f,
  TranslateAnimHorizontalArc shape (24,68)), ball-release emerge
  (`sAffineAnim_Battler_Emerge` entered at accumulator 76 = pa 862, RAM ramp
  862→697→…→256 over 1188-1199, Tier-1 pinned via floor(0x10000/acc)), then
  settled; healthbox slide 110→0 @ 5 px/frame over 1205-1227
  (`StartHealthboxSlideIn` pokeball.c:1241-1269, Tier-1 pinned). Scene
  renderer owns the switch-in battler's pixels; generic draws gated.
- **Next:** slice 4 — recall-side span: `STRINGID_RETURNMON` shows ~35f vs
  real 82f (outgoing mon's return-to-ball scale-up 256→736 + teardown
  unmodeled). Then wire the scout's `scratch-mid-battle-switch-dense-*-off`
  traces into `tools/compare/appTrace.ts` (app stage at the fixture's
  fight-menu-open checkpoint) to execute the §6 dense-compare acceptance —
  the slices are Tier-1 + differential-verified but not pixel-compared. Then
  #79 Fly probe, #81 torment, #80 party-menu inventory, #55 provenance.
- **Notes:** forced-switch SEND OUT (`presenting-switch-in` phase) is
  untouched — driven by the party-select clock, not the command duration.
  `turn15-fly-strike` app-vs-oracle is 229/256 pre-existing (canonical Battle-2
  partial window); the differential proves my change moved nothing. Ball throw
  arc geometry is modeled (same source shape) but not brute-force pixel-fit —
  named in ISSUES #78's remainder for the dense compare.

---
