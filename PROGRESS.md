# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 938 — [bounded MAIN worker, 2026-08-05] #73 LOSS decline continuation CLOSED end-to-end: generic NO-decline farewell through free-roam, new canonical trace exact **155/155** twice fresh

- **State:** master `39b30079` + `b6a5f9fa` + this docs commit, clean. New
  `loss-terminal-decline-continuation-off` **155/155** twice fresh,
  PNG-hash byte-identical on both sides; regressions re-held: LOSS **1943/1943**,
  WIN **890/890**, win-beyond **228/228**; smoke 347/347; full `npm test` 727
  files / **6,972 passed / 1 skipped** (+2 Tier-1) and `npm run build` green
  (final gates below).
- **Did:** closed #73's LOSS-decline gap by consuming `recordChoice` — the
  shared `advanceFactoryTerminalRecordPrompt` now stores the decline edge
  (the tick the record menu's NO is chosen, age 1757 = frame 4989 under the
  app's release-age convention) and a second-A dismiss; every later clock is
  edge-relative per `BattleFrontier_BattleFactoryLobby/scripts.inc:81-94`
  (`EndRecordBattle`: `msgbox Text_LookForwardToNextVisit, MSGBOX_DEFAULT;
  closemessage; setvar VAR_TEMP_CHALLENGE_STATUS, 255; releaseall`).
  `factoryTerminalRender` draws the decline span: YES/NO window clears at
  edge+1 (frame 4990), box wipes edge+3 (4992), the 35-glyph "We look
  forward to your next visit." types 1 glyph/tick from edge+4 (4993, last
  glyph edge+38, held from edge+39 with NO wait-cursor — measured), the
  farewell's own A dismiss registers at edge+102 (5091), and the box closes
  into the bare Lobby field at dismiss+2 (5093) — the field-only frame
  `toEqual(renderFactoryTerminalField())`. NO only; the YES/cancel branches
  stay unconsumed (record playback + GO ON selection remain out of scope).
  Focused 1-tick scratch compares pinned the boundaries first (4988-5030
  **43/43**, 5088-5094 **7/7**). New canonical trace
  `tools/compare/traces/loss-terminal-decline-continuation-off.json`:
  segments byte-for-byte the committed scratch-loss-beyond-boundary-probe
  schedule, `captureFrames` dense 4939..5093 (155). Two red-verified Tier-1
  pins (decline state machine + decline render, both fail with the old
  unconsumed-recordChoice source stashed). The evidence trace
  `loss-beyond-boundary-off` is unchanged: 162/183, all 183−162 residual
  frames are the fixture's own post-5174 walk samples (out of scope — no
  overworld movement subsystem built, per brief).
- **Next:** #73's remaining LOSS-terminal boundary is the record-YES
  playback + free-roam movement itself (a real overworld subsystem); WIN's
  remaining boundary is the GO ON/RECORD/REST/RETIRE selection. Both need
  new fixtures; the decline continuation here is exact end-to-end through
  the idle free-roam field (5093+ static frames already byte-exact).
- **Notes:** source-relative ages only, no absolute-frame/battle/fixture
  branch; LOSS-profile decline fields are inert in WIN (record prompt never
  reached in WIN windows). No new assets, no extractor change; the decline
  renders through the existing record-prompt drawer + message-box
  compositor. `PAPERCUT`: none new.

---
## 937 — [bounded MAIN worker, 2026-08-05] #73 WIN slice 4 CLOSED end-to-end: `win-terminal-window-off` extended and exact **890/890** through fixture endpoint 5512

- **State:** master `77f3787a` + this docs commit, clean. Committed windows
  twice-stable: WIN **890/890** (frames 4623-5512, PNG-hash byte-identical
  across two fresh runs), LOSS **1943/1943**. Ground-truth split windows
  reproduced at **256/256 + 131/131**; the canonical **503/503** baseline
  re-run before the extension. Full `npm test` and `npm run build` green
  (final gate below).
- **Did:** closed #73 WIN slice 4 by promoting the supervisor-verified
  generic PreBattleRoom return/heal span (`docs/win-prebattleroom-return-
  evidence.md`) into the canonical committed Scene-OFF window. Pure data
  change — **zero src edits**. `win-terminal-window-off` extended
  contiguously 5126-5512: last segment 113→500, so the 22-segment schedule
  is now byte-for-byte the fixture's own full 5512-frame prefix (no invented
  input, no presses past the fixture's own last A at 5010-5011);
  `captureFrames` dense 4623..5512 (890 captures). The production postwin
  `counterRoom` path (age = frame − 5011) already reproduced every measured
  boundary with no clock adjustment: PreBattleRoom fade-in 5126-5140,
  settled hold 5141-5149, box fully formed 5150, 1-glyph/tick typing
  5151-5202 (52 glyphs), byte-identical held text 5202-5512. LOSS re-held
  1943/1943.
- **Next:** #73 WIN slice 4 is exact end-to-end. Both outcomes' remaining
  terminal boundary is out of this fixture's own recorded reach
  (record-accept/decline → free-roam, needs a new fixture per
  `docs/post-terminal-return-to-lobby-ground-truth.md` §5 slice 5).
  Animation/canonical Battle 2 untouched.
- **Notes:** no fanfare/GO ON extension, no LOSS record choice/free-roam, no
  absolute-frame/battle-number/fixture branch. `npm run compare --
  win-terminal-window-off` now exercises the full 890-frame contiguous span.

---
## 936 — [bounded MAIN worker, 2026-08-05] #73 LOSS slice 3 CLOSED end-to-end: `loss-terminal-window-off` extended and exact **1943/1943** through fixture endpoint 4938

- **State:** master `f20fab08` + this docs commit, clean. Full `npm test`
  **727 files / 6,970 passed / 1 skipped** (+2 new Tier-1) and `npm run
  build` green; `npm run test:smoke` 347/347; typecheck clean. Committed
  windows twice-stable: LOSS **1943/1943** (frames 2996-4938, PNG-hash
  byte-identical across two fresh runs), WIN **503/503**. Two red-verified
  Tier-1 pins (both fail with the old value stashed).
- **Did:** closed #73 slice 3 by mapping frames 3835-4938 dense and correcting
  one generic source-relative clock: `FACTORY_LOSS_TERMINAL_PROFILE.
  recordPromptDelayFromRestore` **172 → 169** (the same value the roundWon
  profile already carries). The app's release ages are the tick after the
  fixture's dismiss A (page-1 A at age 602 → secondPageReleaseAge 603,
  restore 653), so 653+169=822 lands exactly on the real record box-clear
  (frame 4054); text starts 823 (frame 4055, the "W" of "Would you like to
  record your last"), the first red wait-cursor at 886 (frame 4118), the
  fixture's own A at 4136-4138 dismisses it, and the box scrolls to the held
  "BATTLE FACTORY match on your / FRONTIER PASS?" + YES/▶NO multichoice
  (160,8) hold byte-identical to frame 4938. The old 172 cleared two ticks
  late and typed two chars behind every frame 4054-4126 (the measured
  ~1,350px box-clear residual). `loss-terminal-window-off` extended
  contiguously 2996..4938 (1943 captures) with the fixture's full 46-segment
  prefix byte-for-byte (the last A at 4136-4138 + 800 idle tail are the
  fixture's own recorded schedule; no invented input). No absolute-frame/
  battle-number/fixture branch, no generated asset/extractor change; the fix
  is LOSS-profile-only and inert in WIN. Tier-1 pins
  (`tests/factoryTerminalPresentation.test.ts`): the 169 delay + derived
  promptFirst 822 / textFirst 823 / inputReady 885 ages, and the render's
  empty box-clear frame at age 822 vs. the first "W" at 823.
- **Next:** slice 3 is exact end-to-end. LOSS-terminal's remaining boundary is
  out of this fixture's own recorded reach (record-accept/decline → free-roam,
  needs a new fixture per `docs/post-terminal-return-to-lobby-ground-truth.md`
  §5 slice 5). Slice 4 is WIN PreBattleRoom/heal; animation/canonical Battle 2
  untouched.
- **Notes:** the record question's real line 2 prints "BATTLE FACTORY match on
  your FRONTIER PASS?" on one row (no mid-typing scroll); the multichoice
  window sits at pixel (160,8), not the (160,64) the old renderer assumed —
  both already matched pre-fix via the shared record-prompt drawer. `npm run
  compare -- loss-terminal-window-off` now exercises the full 1943-frame
  contiguous span (the oracle client auto-batches past its 256-capture cap).

---
