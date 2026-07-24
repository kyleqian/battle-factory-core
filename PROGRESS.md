# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 352 — S9 OFF Info rental DOWN→UP round trip: **GREEN — 87/87 exact**

- **State:** settled ONIX switches DOWN to input-ready MAGBY, then UP returns
  through the same slot-relative task to input-ready ONIX with zero pixel diff.
- **Did:** generalized replacement history so the outgoing sprite callback
  advances through teardown, the destination owns a fresh local animation
  clock, and the already-installed text window follows its subsequent-copy
  timing. Tier-1 pins the reverse destination, direction, in-flight gates,
  endpoint clamps, and Info/slot ownership.
- **Next:** supervisor verify this checkpoint and choose the next bounded S9
  route; Moves/Battle Moves/Contest Moves and move-select remain untouched.
- **Notes:** `summary-info-mon-down-up.json` **87/87**; DOWN **54/54**; Info
  ONIX **122/122** + MAGBY **132/132**; install **3/3**; RIGHT **25/25**;
  LEFT **56/56**. Tier-1 **1298/1298** and build green. No absolute ticks,
  framebuffer assets, runtime oracle/ROM, battle/controller, or ROADMAP/
  ISSUES edits.

---
## 351 — S9 OFF Info-page rental DOWN switch: **GREEN — 54/54 exact**

- **State:** settled ONIX Info now switches DOWN to MAGBY through the generic
  slot-relative replacement task and returns true input ownership at +20.
- **Did:** added direction/destination ownership, endpoint clamps, in-flight
  rejection, source-ordered portrait/ball/type/text replacement, and MAGBY's
  replacement-local vertical-squish callback. Tier-1 pins both directions,
  readiness, page ownership, and no-wrap behavior.
- **Next:** add targeted UP pixel acceptance, then continue the remaining
  bounded S9 Moves-page and move-select routes.
- **Notes:** `summary-info-mon-down.json` **54/54**; Info ONIX **122/122** +
  MAGBY **132/132**; install **3/3**; RIGHT **25/25**; LEFT round trip
  **56/56**. Supervisor reverified the new dense trace and merged the disjoint
  ON lane: ICE PUNCH is now exact at **1294/1294** opposite-side and
  **462/462** player-side, with FIRE PUNCH **225/225** preserved. Integrated
  Tier-1 **1297/1297** and build green. No deferred questions.

---
## 350 — S9 OFF Skills→Info reverse layered wipe: **GREEN — 56/56 exact**

- **State:** LEFT now returns settled ONIX Skills to an input-ready Info page
  through the generic eight-step BG1/BG2 wipe; the full round trip is zero diff.
- **Did:** reused source-relative layer offsets for the outgoing page, kept
  fixed BG3/OBJ, cleared moving-page windows, and deferred source title/
  pagination replacement until install. Tier-1 pins reverse offsets, gates,
  readiness, and immutable selected-slot ownership.
- **Next:** supervisor verify this LEFT checkpoint and choose the next bounded
  S9 route; mon switching, Moves pages, and move-select remain unclaimed.
- **Notes:** round trip **56/56** (RIGHT **25/25** preserved); install **3/3**;
  Info ONIX **122/122** + MAGBY **132/132**. Tier-1 **1289/1289**, build
  green. No absolute ticks, framebuffer assets, runtime oracle/ROM, or
  ROADMAP/ISSUES edits.
