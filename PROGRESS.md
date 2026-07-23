# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 307 — S8 Battle 2 opening probe: **GREEN evidence checkpoint; no runtime change**

- **State:** exact renderer endpoint remains **32280--32530 = 251/251**;
  canonical 33030 is documented only, not claimed pixel-exact. Tier-1 is
  **1098/1098** and build passes (**5.496 MB**).
- **Did:** replayed canonical segments 154--155 unchanged and added the
  source/RAM/OAM-ready 32531--33030 ledger in `docs/battle2-opening-notes.md`:
  JENSON handoff 32570; KABUTO ball/healthbox/species H-slide; ONIX throw,
  materialize, and menu blank/draw 32850--32856; 33030 full-HP FIGHT menu.
  Sparse app samples are exact at 32531/32533 then rank the remaining live
  gap (peak 11,210 px at 32831), without an acceptance claim or harvest.
- **Next:** implement only the ledgered live Battle-2 send-outs/menu in a
  later scoped increment; S8 stays `[ ].`
- **Notes:** `gMain.inBattle=2` from 32250; no ordinary VBlank or send-out
  RNG calls through the menu, except the source `TryDoEventsBeforeFirstTurn`
  on-demand turn-number call before choose-action. No trace/assets/runtime
  changes, screenshot lookup, tick fitting, or dynamic thinning.

---
## 306 — Supervisor-accepted S8 Battle 2 trainer intro: **GREEN — 32280-32530 exact**

- **State:** canonical **32280-32530** is **251/251 exact**, every frame
  captured from the first visible Battle 2 framebuffer through the held,
  input-ready FISHERMAN JENSON intro before A at 32531. Battle 2 transition
  remains **249/249** and Battle 1 scene assembly remains **256/256**.
  Tier-1 is **1098/1098**; build passes (**5.496 MB**).
- **Did:** preserved encounter identity across battle-scene advances and
  parameterized the shared BattleIntroSlide3/reveal/settled trainer/text/
  cursor renderer for Fisherman Jenson. Added `battle2-intro-dense.json`
  with all 251 captures and three encounter-selection Tier-1 pins.
- **Next:** resume at canonical A **32531**; reuse the shared send-out path
  for JENSON/KABUTO, then ONIX and the composed Battle 2 action menu. S8
  stays `[ ]`.
- **Notes:** scene elapsed zero remains 32245, so the shared local visual
  clock maps first visible 1075→32280. Text starts at local 1234 for both
  encounters; JENSON's 37 characters create the visible cursor at 1272,
  while its controller first accepts input at 1274. Cursor X remains
  width-derived 123. No absolute trace-time branch/table, framebuffer
  harvest, fitting, excluded capture, or thinning. Supervisor independently
  reviewed identity preservation and shared renderer selection, then
  reverified all three traces, all 1098 Tier-1 tests, and build.

---
## 305 — Supervisor-accepted S8 Battle 2 transition: **GREEN — 32031-32279 exact**

- **State:** canonical **32031-32279** is **249/249 exact**, every frame
  captured from JENSON's held quote through the final black frame.
  `battle2-room-b.json` remains **131/131** and Battle 1 `transition.json`
  remains **206/206**. Tier-1 is **1095/1095**; build passes (**5.487 MB**).
- **Did:** encounter-parameterized the shared Frontier circle transition,
  implemented source-exact sequential asymmetric-spiral geometry/timing,
  dynamic signed-Y OAM overlap order, center blend/hold, and exit fade.
  Added dense `battle2-transition.json` and six Tier-1 pins.
- **Next:** start at **32280**, the first visible Battle 2 framebuffer;
  implement Fisherman/KABUTO intro, KABUTO and ONIX send-outs, then the
  composed Battle 2 menu. S8 stays `[ ]`.
- **Notes:** settled age 0 is 32036; gray 25-72; circle render starts
  76/92/108; final settle/blend start 140; full blend 156; fade 190; black
  201. Fresh RAM callback probe: task 7, sprite slots 10/11/12; signed-Y
  stable tie at 32162. Frame 32280 is excluded by scope. No framebuffer
  harvest, absolute-tick branch/table, fitting, or capture thinning.
  Supervisor independently reviewed the live geometry/OAM/compositor path
  and reverified all three traces, all 1095 Tier-1 tests, and build.

---
## 304 — Supervisor-accepted S8 Battle 2 opening: **GREEN setup; pixels incomplete**

- **State:** the assigned 33030/33031 pixel endpoint is **not complete**.
  The last committed exact endpoint remains JENSON's held quote at 32031
  (**131/131**); predecessor decline remains **73/73**. Battle 2 identity,
  party, moves, room-to-scene RNG ownership, and input gates are now modeled
  and Tier-1 pinned. Full Tier-1 is **1089/1089** and build passes
  (**5.485 MB**).
- **Did:** freshly bisected quote and trainer-intro A gates; RAM-audited
  32020-33031 RNG/inBattle ownership; source-selected the sequential
  asymmetric-spiral transition; extracted Fisherman/KABUTO sprites; carried
  JENSON/KABUTO, healed `[117,138,153]`, and ONIX moves
  `[157,20,225,201]` through `EngineState`. Commits `012161f` and `d2d905f`.
- **Next:** implement the live three-circle sequential spiral, then
  encounter-parameterize Fisherman/KABUTO intro and both send-outs; compose
  the Battle 2 menu without Battle 1's harvested Grovyle base. Dense-capture
  all dynamic frames through 33030/33031 in ≤256-frame trace pieces. Stop
  before menu input. S8 stays `[ ]`.
- **Notes:** first accepted room-quote A starts at 30383 (30382 rejects);
  first accepted intro A starts at 32479 (32478 rejects). Canonical
  32031/32531 edges are delayed-valid. Setup RNG extras are
  `+50/+22/+4/+1`, selecting Frontier transition index 10; battle-scene
  elapsed zero is 32245 and in-battle freeze is 32250. No new pixel trace is
  claimed exact; no screenshot/tick lookup, fitting, or disguised chrome.
  Supervisor independently reviewed the encounter-relative setup/core path
  and reverified both predecessor traces, all 1089 Tier-1 tests, and build.
