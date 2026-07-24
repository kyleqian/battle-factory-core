# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 353 — S9 OFF Skills→Battle Moves layered wipe: **GREEN — 36/36 exact**

- **State:** settled ONIX Skills now advances RIGHT through the generic
  eight-step BG1/BG2 wipe to input-ready Battle Moves at +10.
- **Did:** composed the source Battle Moves tilemap, four move/PP/type rows,
  palette-8 PP text, title/pagination/A-INFO ownership, closed effect panel,
  and persistent portrait sprites. Tier-1 pins Skills→Battle ordering,
  layer offsets, selected rental, in-flight gates, +10 readiness, and edges.
- **Next:** supervisor verify this route and choose the next bounded S9
  increment; Contest Moves, move-select/highlight/reorder, and Moves-page mon
  switching remain untouched.
- **Notes:** `summary-skills-to-battle-moves.json` **36/36**; DOWN→UP
  **87/87**; DOWN **54/54**; Info **122/122 + 132/132**; install **3/3**;
  Info→Skills **25/25**; Skills→Info **56/56**. Tier-1 **1300/1300** and
  build green. No absolute ticks, framebuffer assets, runtime oracle/ROM,
  battle/controller, ROADMAP, or ISSUES edits.

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
