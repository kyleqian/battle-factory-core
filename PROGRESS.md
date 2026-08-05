# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.
---
## 945 — [bounded MAIN worker, 2026-08-05] #73 WIN swap-offer NO decision bound: `win-go-on-swap-offer-no-off` exact **213/213** twice fresh

- **State:** master `89693d9d`, clean. The swap-offer NO decision + the generic
  `Right this way, please!` guide are bound at **213/213** exact twice fresh
  (frames 9930-10406, dense; PNG-byte-identical both runs). Regressions
  re-held: canonical WIN **3590/3590**, LOSS **1943/1943**, LOSS decline
  **155/155**, win-beyond **228/228**, GO ON scout **143/143**, type **93/93**,
  style **92/92**, swap-offer **115/115**, battle-command-generated **128/128**.
  Full `npm test` **727 files / 6,973 passed / 1 skipped** and `npm run build`
  green; smoke 347/347.
- **Did:** authored `scratch-win-go-on-swap-offer-no-probe.json`, preserving the
  swap-offer fixture's 33 segments byte-for-byte and appending a safely-held
  DOWN (9943-9944, cursor display -> NO at 9944), a bounded idle, an A
  accepting NO at 10005-10006, and a bounded idle tail (37 segments / 10406
  frames). Dense oracle captures bind the NO decision, YES/NO-window dismissal
  (edge+1), box clear (edge+3), and the generic `Right this way, please!`
  guide typing 1 glyph/tick from edge+4 to its final glyph at edge+26 (frame
  10031), held **with no wait-cursor** through the endpoint 10406 — the genuine
  held/dismiss-ready boundary, unpressed per contract (no walk/warp). One
  generic src fix was required and landed (`overlayTerminalKernelParty` now
  overlays only the four battle-mutable fields — HP/status1/item/PP — onto the
  rental identity instead of spreading the whole terminal party): the WIN
  scaffold's placeholder terminal party (DUSCLOPS, personality `0xff`, IV 3)
  was corrupting the kernel party so `healFactoryKernelParty`'s identity guard
  threw on the NO advance. Red-verified Tier-1 pin
  (`tests/factoryRoundBattleOrchestrator.test.ts`); no calibration — the
  existing `movePostwinSwapCursor`/`acceptPostwinSwapDecline`/
  `postwinRightThisWay*` machinery reproduced every boundary with its current
  constants. Evidence: `docs/post-terminal-beyond-boundary-win-go-on-swap-offer-no-decision-evidence.md`.
- **Next:** a separate YES decision should enter the already-generic swap UI
  (or hand its fixture to the swap-screen path); the unexercised
  RECORD/REST/RETIRE continuation choices remain. Promote the proven decision
  span into the canonical WIN window once the YES/guide tail is also bound.
- **Notes:** no absolute frame/battle-number/fixture branch; the overlay fix is
  source-relative (the real game only writes HP/status/item/PP back to
  `gPlayerParty` during a battle — identity is never battle-mutable). LOSS
  record playback/free-roam remain separate.


---

## 944 — [supervisor recovery/fold, 2026-08-05] #73 WIN swap-offer boundary bound: YES/NO hold exact **115/115** through input-ready frame 9111

- **State:** recovered side evidence commit `61a7c343` merged after main's
  style-page canonical promotion. Union reruns are exact at swap offer
  **115/115** and canonical WIN **3590/3590**. Main's full `npm test` was
  **727 files / 6,972 passed / 1 skipped** and build green; the recovered
  data-only side packet passed smoke 347/347 and build.
- **Did:** stopped the evidence-only side worker when it began temporary
  production instrumentation, removed every debug edit, and retained only
  its twice-exact fixture/spec. The recovered 33-segment fixture preserves
  the prior 31 segments byte-for-byte, presses the held style page once at
  9040-9041, clears the box at 9044, types "Before starting the battle,
  would you / like to swap a POKéMON?" at 9045-9104, copies the YES/NO
  window at 9107, and reaches the real input-ready hold at 9111. Existing
  page-4/menu clocks reproduced all 115 captures with no production change.
- **Next:** exercise one bounded NO decision from the held swap offer through
  the `Right this way, please!` guide and next-battle handoff. A separate YES
  decision should enter the already-generic swap UI. Promote the proven offer
  span after the decision fixture is banked.
- **Notes:** no side-lane `src/` edit was committed; branch diff contained
  only the fixture, ground-truth spec, and evidence note. No absolute frame,
  battle number, or fixture branch. LOSS record playback/free-roam and the
  RECORD/REST/RETIRE continuation choices remain separate.

---

---

## 943 — [bounded MAIN worker, 2026-08-05] #73 WIN battle-style commentary page promoted into the canonical window: `win-terminal-window-off` exact **3590/3590** through held boundary 8212

- **State:** master `a048faa0`, clean. Extended canonical gate **3590/3590**
  twice fresh (frames 4623-8212, 7180 PNGs byte-identical both runs);
  regressions re-held: LOSS **1943/1943**, LOSS decline **155/155**,
  win-beyond **228/228**, GO ON scout **143/143**, type-page **93/93**,
  style-page **92/92**. Full `npm test` **727 files / 6,972 passed / 1
  skipped** and `npm run build` green.
- **Did:** promoted the supervisor-rerun opponent-style commentary evidence
  (`win-go-on-style-commentary-off` 92/92) into the canonical Battle Scene
  OFF WIN terminal acceptance window. **Pure data change — zero src edits.**
  `win-terminal-window-off`'s scenario switched from
  `scratch-win-go-on-type-commentary-probe` to
  `scratch-win-go-on-style-commentary-probe`; its segments are now
  byte-for-byte the newer fixture's own full 31-segment / 9040-frame
  schedule (prefix-proven before writing: the old canonical 29 segments ==
  the prior fixture's full 29, and the prior fixture's 29 == the newer
  fixture's first 29 — no invented input, nothing past the newer fixture's
  single style-page A at 8138-8139, no press into the swap offer), and
  `captureFrames` extend contiguously 4623..8212 (3590 captures) through the
  genuine held `MSGBOX_DEFAULT` StyleUnrestrained boundary at 8212. The
  existing `postwin` continuation machinery (`acceptPostwinDialoguePage` →
  `dialoguePage 3` → `POSTWIN_SCOUTING_LINES[2]`) reproduced every boundary
  with no calibration: held type page through 8141, the A press at
  8138-8139 with no visual change, box clear 8142, the 69-frame "The
  favorite battle style appears to / be free-spirited and unrestrained."
  typing 8143-8211, and the wait-cursor hold from 8212.
- **Next:** #73's remaining WIN boundaries are past the held battle-style
  page — the swap offer/decision and the unexercised RECORD/REST/RETIRE
  continuation choices, each needing its own new fixture A press. LOSS's
  remaining boundary stays the record playback + free-roam movement (a real
  overworld subsystem).
- **Notes:** no absolute-frame/battle-number/fixture branch and no `src/` or
  test edit. The canonical baseline 2686/2686 was re-run via the extension
  itself (4623-7308 is a subset of the new dense span). The 29→31 segment
  schedule change keeps the trace byte-for-byte the newer fixture's full
  input prefix, so the oracle replay stays gapless. `PAPERCUT`: none new.

---
