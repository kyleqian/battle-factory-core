# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 308 — Supervisor-accepted S8 Battle 2 send-out text: **GREEN — 32531-32569 exact**

- **State:** canonical **32531-32569 = 39/39 exact**, stopping one frame
  before the 32570 visual handoff; Battle 2 intro remains **251/251 exact**.
  Tier-1 is **1099/1099** and build passes (**5.497 MB**).
- **Did:** reused the stored delayed-A/send-out clock and registration lag,
  parameterized the shared printer from encounter identity as `FISHERMAN
  JENSON sent / out KABUTO!` (32 glyphs), and retained the Fisherman scene
  through both final post-text hold frames. Added the dense trace and Tier-1
  pins while preserving DESTIN/GROVYLE defaults.
- **Next:** begin at **32570** with trainer exit/ball/KABUTO materialize and
  healthbox only in a separately scoped increment. S8 stays `[ ]`.
- **Notes:** no trainer exit, ball, species, healthbox, particles, absolute
  tick lookup, framebuffer harvest, fitting, or trace thinning. Supervisor
  independently reviewed the press-relative encounter parameterization and
  reverified both traces, all 1099 Tier-1 tests, and build.

---
## 307 — Supervisor-accepted S8 Battle 2 opening probe: **GREEN evidence checkpoint**

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
  later scoped increment; S8 stays `[ ]`.
- **Notes:** fresh RAM has `gMain.inBattle=2` throughout; no ordinary VBlank
  RNG. On-demand RNG is flat to 32893 then +1/+2/+5 at 32894/32898/32900
  (pre-turn/AI); 33030 is 3530724670 with execFlags=1. No trace/assets/runtime
  changes, screenshot lookup, tick fitting, or dynamic thinning. Supervisor
  independently reviewed the source/RAM boundary ledger and reverified all
  1098 Tier-1 tests and build.

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
