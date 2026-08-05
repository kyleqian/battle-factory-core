# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 946 — [supervisor fold, 2026-08-05] #73 WIN guide dismissal through Battle Room handoff exact **232/232**

- **State:** union through `b727500d`; guide dismissal, attendant/player walk, warp
  fade, room fade-in, and battle-2 room handoff are exact at **232/232**
  (frames 10406-10637). Regression gates re-held: NO/guide **213/213**,
  canonical WIN **3590/3590**, LOSS **1943/1943**, LOSS decline **155/155**,
  and generated command **128/128**. Final union `npm test` is green at
  **727 files / 6,973 passed / 1 skipped**; `npm run build`, smoke **347/347**,
  typecheck, and `bin/oracle info` are green. `animation-main` has no commit
  missing from master at wind-down, so no second fold was required.
- **Did:** banked a 39-segment fixture that preserves the prior 37 segments
  byte-for-byte, presses the held `Right this way, please!` once, and idles
  through the Battle Room's stable quote. Existing generic postwin and room
  machinery reproduced every timing boundary through the first opponent-art
  pixel with no calibration or battle-number branch. A RAM probe identifies
  the ROM's next trainer as LILIANA (id 9). The app's synthetic terminal stage
  instead generates ABBIE (id 73), so divergence begins at 10638 solely in
  next-opponent sprite/quote content. Audited and narrowed the terminal-party
  overlay wording: Sketch is the general move-write exception, but no legal
  Factory set carries it; Transform/Mimic do not persist to party identity.
- **Next:** align the terminal comparison stage's round-RNG/opponent
  provenance with the ROM without trainer-specific staging, then bind the
  held battle-2 quote dismissal/setup. Separately exercise the WIN YES swap
  branch and RECORD/REST/RETIRE choices; do not resume the retired canonical
  Battle-2 turn march.
- **Notes:** the generic owner is already at battleIndex 1 before the
  guide/walk/warp. The far-side content gap is an exposure of #55's ambient
  RNG/provenance model, not a presentation-timing failure. Evidence:
  `docs/post-terminal-beyond-boundary-win-go-on-guide-dismiss-evidence.md`.

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
