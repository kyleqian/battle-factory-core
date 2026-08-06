# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 955 — [bounded MAIN worker, 2026-08-05] ISSUES #78 dense-compare app stage wired; dense acceptance blocked by the live voluntary-switch presentation seam

- **State:** master `16c65185`, clean. Typecheck green; `battle-command-generated-off`
  regression 128/128. Full `npm test` + `npm run build` gate green at the docs commit.
- **Did:** `mid-battle-switch-dense-off` app stage
  (`tools/compare/appTrace.ts`): installs a staged Level-50 RATTATA x3 / SPLASH
  battle (`createFactoryFullTurnBattleState`, the same seam battle2-off-turn1 and
  the terminal scaffolds use — the frontier corpus has no RATTATA/Splash set)
  into a real orchestrator at the scratch-mid-battle-switch-dense-a-off fixture's
  frame-0 fight-menu-open checkpoint, replaying the fixture's verbatim segments
  through the live route.
- **Probe (dense-a, seeded):** the stage reaches the checkpoint deterministically
  and turn-1's fight menu is byte-near-exact (48px systematic residual, opponent
  RATTATA sprite ~24px + top-left 24px); the party-menu voluntary switch completes
  at the real frame (party select created 763, RIGHT→slot 1 at 883, SEND OUT
  submenu 923, confirm 963).
- **Blocker found (reported to ISSUES #78):** the orchestrator's live voluntary
  switch path (`advanceFactoryRoundBattleCommand`'s party-select branch) hands the
  switch transition to `installDriveReceiptImmediately`, which installs the next
  command presentation and **drops the kernel's switch / switch-in-animation /
  message events** — the app shows the turn-2 action menu the moment the party
  menu closes, no recall/"Go!"/materialize/healthbox-slide frames exist to compare.
  No byte-exact span in the fixture's 1000-1460 window; the slices 1-3
  `battleResolutionPresentation` machinery is only exercised by forced-switch and
  direct Tier-1 tests. A red probe spec was authored then removed (run's no-red-commits
  convention); the dense spec waits on that seam + slice 4.
- **Next:** wire the voluntary-switch presentation seam (build a
  `battleResolutionPresentation` from the switch events in the party-select branch,
  mirroring `beginCommandResolution`), then author the dense spec over 1137-1255
  (+ pre-recall prefix) — then slice 4's recall-hold/return-to-ball (82f hold).
- **[Supervisor 16:05:** (1) at-orient fold of `animation-main` was a
  fast-forward (WRAP 115/276 + MUDDY_WATER); union verified full `npm test`
  739 files / 7027 passed / 1 skipped + build green. Oracle-freshness FAIL
  re-confirmed as the docs-only false positive (only `_template`/NOTES
  harness commits since oracle start). (2) SIDE R1 merged (`18deb820`):
  walk-in sprite now trainer-class-driven via `factoryTrainerOverworldGfx.ts`
  (SetBattleFacilityTrainerGfxId port, battle_tower.c:1161-1251;
  LILIANA → GIRL_3), girl_3 extracted, canonical
  `win-go-on-swap-offer-no-guide-dismiss-off` window extended
  **232 → 903/903** to the fixture endpoint 11308 — supervisor re-ran the
  headline (903/903), mapping test 4/4, smoke 347/347 on the union. 31 tower
  gfx ids still fall back to the generic sheet (asset debt, listed in
  `battleRoomRender.ts` opponentSheetForGfx doc). Worker's own gate: full
  suite 740/7031 + build green in worktree. (3) The seam finding above
  supersedes 953's "(a)/(b) closed" reading for the LIVE voluntary route —
  presentation machinery exists but voluntary switches bypass it; seam brief
  dispatched as main R2.**]**

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
