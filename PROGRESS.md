# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 958 — [bounded MAIN worker, 2026-08-05] ISSUES #81 live Torment selection-rejection message phase landed; dense spec gated on pre-existing fight-menu chrome residuals

- **State:** master `7165ff5e`, clean. Typecheck green; full `npm test`
  **743 files / 7060 passed / 1 skipped** + `npm run build` green.
  `battle-command-generated-off` regression **128/128**; presentation/
  voluntary-switch/rejection suites green.
- **Did:** the live fight-menu now enters a rejection-message phase when the
  player confirms a slot whose `rejectionReasonBySlot` entry is non-null
  (Torment = acceptance vehicle): resolver's two lines type **1 glyph/frame
  from +3**, hold **button-gated** (`\p` PAUSE_UNTIL_PRESS, no auto-advance)
  with the wait ▼ bobbing from +66 (`CURSOR_Y_OFFSETS[age/9%4]`), and on
  **A or B** dismiss the fully-typed box freezes with the cursor held at its
  dismiss pose for **9 frames** before the move menu redraws byte-identical,
  cursor unchanged. Reuses `drawBattleMessageTextLines`/`drawCursor`/the
  battle-window tilemap — no new printer. Tier-1 pins:
  `tests/factoryTormentSelectionRejectionLive.test.ts` (7, red-verified on
  the +3 and +9 constants). App stage for
  `mechanic-selection-reject-torment-off.json` installed at the turn-2
  checkpoint (frame 734, player pre-Tormented + TACKLE last move).
- **Dense probe (scratch spec over the doc's window, 145 frames):** the
  message box + text region renders byte-exact — the frozen-box frame 977 and
  the GUST resolution 1050 both diff only **60px** (whole-frame), all inside
  three **pre-existing fight-menu chrome residual classes** (same family as
  the mid-battle-switch fixture's documented 48px, not this flow): the
  ~24px **pink-vs-cyan move-target arrow** baked in the static fight-submenu
  harvest (bbox y21-28 x55-59), the **detail-box type cell** ~28px
  (y80-87 x184-199), and the **type-name text** ~24px (y120-135 x205-215);
  plus the **unmodeled A-press highlight** state (~1776px bbox y74-110
  x127-229 at 766-769/987-1000) and the app's sprite-bounce phase vs the
  oracle's static move-menu sprites (up to ~950px at menu-idle frames). No
  full-frame byte-exact span → **no spec committed** (run's no-red-commits
  convention); ISSUES #81 trimmed to the spec-only remainder.
- **Next:** a fight-menu-chrome pass (target-arrow palette + detail-box/type
  cell + A-press highlight + move-menu bounce freeze) to close the dense
  window, then the `torment-selection-rejection-off` ground-truth spec; then
  #80 party-menu visuals.
- **Notes:** `PAPERCUT`: multi-round pixel-archaeology on the oracle's
  A-press-highlight/move-detail-box layout cost ~30 min before the
  pre-existing-chrome attribution was confirmed; the scratch spec's segments/
  captureFrames are in git history if that pass wants to re-probe.

---

## 957 — [bounded MAIN worker, 2026-08-05] ISSUES #78 slice 4 landed: recall 82f hold + return-to-ball switch-out; schedule exact through 1255, two residual classes remain

- **State:** master `8514c827`, clean. Typecheck green; full `npm test`
  **742 files / 7053 passed / 1 skipped** + `npm run build` green.
  `compare:differential --base 51a8fdaa` over battle-command-generated-off +
  turn15-fly-strike: **384/384 byte-identical** (forced/move paths unmoved).
- **Did:** STRINGID_RETURNMON message gains the 9-frame post-print hold
  (typing+9 = 42f message-only region 1044-1085); new `switch-out` command
  (`RETURN_TO_BALL_SPAN_FRAMES` = 32) emitted for the synthesized
  return-atk-to-ball receipt, rendering the affine scale-up 256→736 over
  relative frames 14-24 (trace 1100-1110) with the sprite freed from relative
  25 (1111+); SWITCHINMON timed 13f, party-summary draw+getswitched 7f
  (1119-1125), switch-in carries the 11f waitstate/move-load settle hold —
  so the pre-"Go!" window is the real 82f (1044-1125) and the opponent's
  "used" first glyph lands at 1242. Also fixed a masked bug the slice exposed:
  the switch-in command now restores the incoming battler's
  sprite/healthbox visibility (the recall receipt had hidden them; the
  resolution render view never re-enabled them). Tier-1 pins red-verified
  (seam test 7, battleResolutionPresentation 29).
- **Dense probe (`mid-battle-switch-dense-off`, dense-a, frames 1000-1255):**
  1035-1090 = 48px RATTATA-only; 1139 = 24px; 1140-1188 = 24-250px (send-in
  ball/emerge); **1228-1255 = 24px** (settled send-in + waitstate hold +
  "used SPLASH!" typing byte-aligned). Residual classes (both real oracle
  effects, neither modeled): (1) the **white BG palette fade** (1093-1126
  recall, 1191-1224 switch-in — `LaunchBallFadeMonTask`'s BeginNormalPaletteFade
  + the mon's ball-color blend; up to ~16k px at the scale-up peak); (2) the
  **in-battle party-summary panel pixels** (1127-1138, ~389 px). No byte-exact
  full-window span → **no spec committed** (still gated on the RATTATA
  palette fix + these two).
- **Next:** the two residuals (BG fade + party panel) to close the dense
  window, then the spec once the RATTATA palette is fixed; then #80, #81.
- **Notes:** contract fallback taken — the affine scale-up + teardown are in
  with probe numbers; the fades are the honestly-remaining sub-piece.

---

## 956 — [bounded MAIN worker, 2026-08-05] ISSUES #78 voluntary-switch presentation seam + party-menu close cadence landed

- **State:** master `a47ac0c9`, clean. Typecheck green; seam tests 5/5 (2
  orchestrator-level red-verified); orchestrator/resolution/partySelect/adapters
  104/104. Full `npm test` + `npm run build` green at the docs commit.
- **Did:** the live voluntary-switch route now presents instead of dropping
  to the turn-2 action menu — party-select branch routes the confirmed switch
  through `beginCommandResolution`; `createBattleResolutionPresentation`
  accepts a `switch` source decision (starts in the null-handoff field-hold
  confirm phase) and re-synthesizes the recall printstring + return-to-ball
  receipts the kernel skips (`runVoluntarySwitchAction`); the party menu holds
  through the real menu-close span (menu to 1019, fade 1019-1034, field idle
  1035-1043, recall first glyph 1044). Tier-1 pins:
  `tests/factoryVoluntarySwitchSeam.test.ts` (5).
- **Probe (`mid-battle-switch-dense-off` app stage, dense-a fixture):**
  frames 1035-1076 diff only the **pre-existing 48px staged-RATTATA residual**
  (recall text typing byte-aligned; app turn-2 fight menu lands at the real
  1407 edge); 1077+ diverges as expected (slice 4 recall hold). No byte-exact
  span → no spec committed (residual is a RATTATA palette gap in
  `src/assets/gen/**`, side-worker asset; fixed there → re-probe 1035-1076).
- **Next:** ISSUES #78 slice 4 (82f recall hold + return-to-ball scale-up), then
  the dense spec once the RATTATA palette residual is fixed; then #80, #81.
- **Notes:** party-menu fade pixels are held-and-cut (menu pixels are #80
  scope; frame budget is the acceptance). The 48px residual attribution is
  staged-fixture asset side, not the seam/renderer.

---

## 954 — [bounded MAIN worker, 2026-08-05] ISSUES #55 wiring landed: win-terminal scaffold produces the ROM's battle-2 LILIANA byte-for-byte

- **State:** master `67211ca2`, clean. Typecheck green; smoke 7/347 green;
  all five committed win/loss terminal traces byte-identical.
  **[Supervisor union verification 13:49, final session act:** full
  `npm test` green (288s run), `npm run build` green, guide-dismiss trace
  re-spot-checked **232/232** on this union — the deferred full-suite gap
  in this entry's Notes is closed. `animation-main` gained 4 commits after
  the 12:46 fold (sibling supervisor likely live) — left UNFOLDED
  deliberately at 13:52; next session folds at orient per protocol.**]**
- **Did:** wired receipt §7 into `winTerminalWindowStage`: `playerTrainerId`
  `0x18CC699A`, real six saved rental set ids 156/149/180/188/184/135, the
  synthetic terminal battle rngSeed transplanted to the probed pre-call
  cursor `0x7399E3AE`, and new `config.adoptedNextOpponent` that
  `preGenerateFactoryRoundNextOpponent` reads at the GO ON seam (per-mon
  construction cursors `0x2F959DF4/0xBD6F8138/0xDE320F3A` via
  `adoptFactoryOpponentSchedule`). Tier-1 pin: trainer 9 LILIANA, sets
  169/170/130, KADABRA/WAILMER/NUZLEAF, items 214/221/142, personalities
  `0x801D2ED7/0x0FFC69A4/0x1AE16FDA`, selection end cursor `0x50F04E72`.
  Regression list byte-identical: win-terminal-window-off 3590/3590,
  win-go-on-swap-offer-yes-off 248/248, no-off 213/213,
  no-guide-dismiss-off 232/232, loss-terminal-window-off 1943/1943.
- **Next:** (1) canonical-window extension past 10638 — the far side's
  LILIANA quote text now matches the oracle, but the battle-room opponent
  walk-in sprite still renders the static generic NPC
  (`battleRoomRender.ts:253`); it needs trainer-class-specific overworld
  sprites (LILIANA = School Kid F). Quote typing/msgbox at ~10724+ is already
  LILIANA-exact; the sprite head/hair pixels remain (189px at 10718+).
  (2) continue PROGRESS 953's ordered list (#78 slice 4, #81, #80, RECORD/
  RETIRE, lobby).
- **Notes:** `config.rngValue` stays 4 (it feeds the byte-identical battle-1
  opponent; the GO-ON cursor is carried at the boundary instead — the
  synthetic terminal resolution overwrites round.rules.rngValue before the
  GO ON edge). Full `npm test` deferred per cap discipline; smoke + focused +
  the compare list above are this step's acceptance.

---
