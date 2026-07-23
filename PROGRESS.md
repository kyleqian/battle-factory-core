# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 303 — Supervisor-accepted S8 postwin increment: **GREEN — Battle 2 opening quote exact**

- **State:** canonical **30031-32031** now reaches FISHERMAN JENSON's held,
  input-ready `"MY POKéMON WILL MAKE YOU DOWNCAST"` quote without dismissing
  it. Prefix-identical traces are **225/225 + 131/131 exact**, predecessor
  decline is **73/73**, Tier-1 is **1086/1086**, and build passes
  (**5.484 MB**).
- **Did:** stored the canonical 30032 guide dismiss edge, reused the shared
  close/walk/warp/camera/room/message machinery, source-selected Fisherman
  gfx + JENSON's Easy Chat quote, and modeled the returning attendant's real
  standard-animation alternation. Fresh RAM pins room/sprite boundaries and
  relative +109/+110 RNG bursts.
- **Next:** resume from held **32031**; freshly bisect the quote-dismiss
  gate, then implement Battle 2's trainer-intro transition toward the first
  action menu. This worker intentionally did not dismiss the quote. Battle
  2+, swap YES, and round completion remain open; S8 stays `[ ]`.
- **Notes:** implementation/traces `e149116`; evidence/docs commit follows.
  Every dynamic frame 30031-30382 is captured, with byte-static anchors
  through 32031. Gate: frame 29660 ready/first accepted press start, stored
  edge 29661; canonical starts 30031/stores 30032. No forbidden asset,
  lookup/table, tick/trace branch, fitting, exclusion, or thinning. Supervisor
  independently reviewed the cross-layer state/render/RNG handoff, then
  reverified both new traces, both regressions, all 1086 Tier-1 tests, and
  production build.
