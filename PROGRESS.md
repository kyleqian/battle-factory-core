# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 939 — [bounded MAIN worker, 2026-08-05] #73 WIN GO ON → first scouting message promoted into the canonical window: `win-terminal-window-off` extended and exact **2082/2082** through the held boundary 6704

- **State:** master `efdfcbf4`, clean. Extended canonical gate **2082/2082**
  twice fresh (frames 4623-6704, PNG-hash byte-identical both runs);
  regressions re-held: LOSS **1943/1943**, LOSS decline **155/155**, win-beyond
  **228/228**, GO ON scout **143/143**. Full `npm test` **727 files / 6,972
  passed / 1 skipped** and `npm run build` green; smoke 347/347.
- **Did:** promoted the supervisor-rerun GO ON → first scouting-message
  evidence (`win-go-on-scout-off` 143/143) into the canonical Battle Scene
  OFF WIN terminal acceptance window. **Pure data change — zero src edits.**
  `win-terminal-window-off`'s scenario switched from
  `win-terminal-explosion-dusclops-off` to `scratch-win-go-on-scout-probe`,
  its segments now byte-for-byte the fixture's own full 27-segment /
  7236-frame prefix (verified against the fixture before writing; no
  invented input, no presses past the fixture's single GO ON A at
  6634-6635), and `captureFrames` extend contiguously 4623..6704 (2082
  captures) through the genuine held first scouting boundary at 6704. The
  existing `postwin` continuation machinery
  (`acceptPostwinContinuation` → `dialoguePage 1` →
  `POSTWIN_SCOUTING_LINES[0]`) reproduced every measured boundary with no
  calibration: GO ON menu hold through 6633, dismiss/clear 6636-6638, the
  65-frame "I've conducted a little investigation\nabout your upcoming
  opponent." typing 6639-6703, and the wait-cursor hold from 6704.
- **Next:** #73's remaining WIN boundary is past the held first scouting
  page (the type/style commentary + swap offer + record menu, each needing
  its own new fixture A press); LOSS's remaining boundary stays the record
  playback + free-roam movement (a real overworld subsystem). The already-
  committed spec `win-go-on-scout-off` remains as the dense 6133-7236
  ground-truth window.
- **Notes:** no absolute-frame/battle-number/fixture branch added; the
  canonical baseline 890/890 was re-run via the extension itself (4623-5512
  is a subset of the new dense span). The 22→27 segment schedule change
  keeps the trace byte-for-byte the fixture's full input prefix, so the
  oracle replay stays gapless. `PAPERCUT`: none new.

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
