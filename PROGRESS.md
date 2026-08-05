# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 940 — [supervisor fold, 2026-08-05] #73 WIN scouting page 2 bound: opponent-type commentary exact **93/93** through held boundary 7308

- **State:** side evidence commit `d7c58d75` merged after main's canonical
  promotion; union reruns are exact at type-commentary **93/93** and canonical
  WIN **2082/2082**. The side lane's full `npm test` was **727 files / 6,972
  passed / 1 skipped**, `npm run build` green, smoke 347/347; main independently
  reported the same full-suite/build result before the merge.
- **Did:** extended the source fixture by exactly one safely-held A press on
  the first scouting page. The ROM clears the box at 7240, types "The TRAINER
  appears to have no clear / favorites when it comes to type." at 7241-7307,
  then holds the real wait-cursor boundary from 7308. The existing generic
  `acceptPostwinDialoguePage` → `dialoguePage 2` path reproduced all 93
  captures twice with no production change. Banked the 29-segment fixture,
  ground-truth spec, and source-backed boundary ledger; the prior 27 segments
  remain byte-for-byte the previous fixture prefix.
- **Next:** press only the held type-commentary page and bind the battle-style
  page to its next genuine hold; after that, bind the swap offer/decision and
  promote proven spans into the canonical WIN window. LOSS record playback
  and moving free-roam remain separate real subsystems.
- **Notes:** no absolute-frame/battle/fixture branch and no `src/` or test
  edit. The parallel main promotion is already canonical through the first
  scouting hold (4623-6704); this entry records the next evidence-only page.
  `PAPERCUT`: none new.

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
