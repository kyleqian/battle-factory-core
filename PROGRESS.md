# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 935 — [bounded MAIN worker, 2026-08-04] #73 LOSS slice 2 CLOSED end-to-end: player residual removed, `loss-terminal-window-off` extended and exact **839/839** through frame 3834

- **State:** master `85a69357` + this entry's commit, clean. Supervisor final
  gate: full `npm test` **727 files / 6,968 passed / 1 skipped** and
  `npm run build` green; worker smoke 347/347. Committed windows
  twice-stable: LOSS **839/839**
  (frames 2996-3834, byte-identical across two fresh runs), WIN **503/503**.
  Two red-verified Tier-1 pins (both fail with the old values stashed).
- **Did:** finished #73 LOSS slice 2 by removing the sole remaining player
  residual and extending the committed dense window through frame 3834.
  (1) **Player OAM anchor** — the generic Lobby object anchor's player-only
  `+1px x2` sub-pixel offset was erroneous: it drew the sprite at (113,56),
  reproducing the ~133px residual exactly; removed so every object event
  anchors at `tile*16 - cameraOriginPx` (player (4,8) + camera {x:-48,y:56}
  → (112,56)). The source-derived field + that player match oracle frame
  3365 with 0 differing pixels. (2) **Page-0 first-glyph age** —
  `FACTORY_LOSS_TERMINAL_PROFILE.firstPageTextAge` corrected **143 → 142**:
  the prior slice's scratch windows only covered page-1's span (3534+); a
  dense oracle re-probe of frames 3373-3375 shows the box opens at terminal
  age 141 and page-0's "T" lands at age 142, so the old 143 delayed every
  page-0 typing (3374-3403) + cursor phase (3412-3529) frame by one tick.
  The committed trace's segments were restored to the fixture's own real
  schedule through cumulative 3834 (segments 0..41, buttons unchanged — the
  committed window's tail had truncated the fixture at segment 39/3345) and
  `captureFrames` extended contiguously 2996..3834 (839 frames). No
  generated asset/extractor edit: `factory-lobby-terminal-npcs.json` already
  carried the exact north-facing Brendan frame 1 + palette (the supervisor's
  evidence; the "different player asset needed" claim is retracted).
  Tier-1 pins: player-unique pixels at source-derived positions
  (renderField, `factoryTerminalPresentation.test.ts`) + page-0 timing
  (`firstPageTextAge === 142`, visibleChars 0/1/2 at ages 141/142/143).
- **Next:** slice 2 is closed end-to-end. Slice 3 (restore/save + record
  prompt, whose 4054+ box-clear residual is already measured ~1,350px)
  rides on the corrected profile; slice 4 is WIN PreBattleRoom/heal.
- **Notes:** page-0 typing was never oracle-verified before this step (the
  scratch windows started at 3534), which is why the 143 constant survived;
  both corrections are pure terminal-presentation logic, inert in WIN
  (`exchangeNextPageVisualDelay`/roundWon profile untouched) — WIN re-ran
  503/503 after the change. Frame 3834 = the fixture's real page-1 A
  dismiss (terminal age 602), exactly slice 2's end; frame 3835+ is slice
  3. No absolute-frame/battle/fixture branch added. The bounded worker hit
  its cap during its redundant final full-suite run and produced no commit;
  the supervisor audited the diff, reran both committed oracle windows plus
  the full suite/build, and committed the intact bounded result.

---
