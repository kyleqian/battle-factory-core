# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 355 — S9 OFF Battle Moves LOCK_MOVES selector: **GREEN — 93/93 exact**

- **State:** A on input-ready ONIX Battle Moves enters the inert LOCK_MOVES
  selector, DOWN owns BIND details, and B restores the ordinary page at +4.
- **Did:** added reusable selector ownership, logical/presented indices,
  source-relative BG/OAM gates and clocks, extracted cursor/effect composition,
  power/accuracy/description details, CANCEL row, and locked A/B close behavior.
  Tier-1 pins setup/close gates, rental/page/mode preservation, immutable move
  order, staggered navigation, cursor clock reset, and no reorder state.
- **Next:** supervisor verify this bounded route and choose the next S9 summary
  increment; Contest move-select and Moves-page mon switching remain untouched.
- **Notes:** `summary-battle-move-select.json` **93/93** dense OFF exact;
  Contest **16/16**; Battle **36/36**; DOWN→UP **87/87**; DOWN **54/54**;
  Info **122/122 + 132/132**; install **3/3**; Info→Skills **25/25**;
  Skills→Info **56/56**. Tier-1 **1312/1312** and build green. No move
  reordering, Contest move-select, mon switching, battle/controller, absolute
  ticks, framebuffer assets, runtime oracle/ROM, ROADMAP, or ISSUES edits.

---
## 354 — S9 OFF Battle→Contest Moves layered wipe: **GREEN — 16/16 exact**

- **State:** settled ONIX Battle Moves now advances RIGHT through the generic
  eight-step BG1/BG2 wipe to input-ready Contest Moves at +10.
- **Did:** composed Contest tilemap closure, category icons, shared move/PP
  rows, title/pagination/A-INFO ownership, and persistent portrait sprites.
  Tier-1 pins Battle→Contest order/layers, selected rental, in-flight gates,
  endpoint behavior, +10 readiness, and deterministic per-rental rendering.
- **Next:** supervisor verify this route and choose the next bounded S9
  increment; move-select/highlight/reorder, reverse LEFT beyond the accepted
  readiness tick, and Moves-page mon switching remain untouched.
- **Notes:** `summary-battle-to-contest-moves.json` **16/16**; Skills→Battle
  **36/36**; DOWN→UP **87/87**; DOWN **54/54**; Info **122/122 + 132/132**;
  install **3/3**; Info→Skills **25/25**; Skills→Info **56/56**. Tier-1
  **1305/1305** and build green. No absolute ticks, framebuffer assets,
  runtime oracle/ROM, battle/controller, ROADMAP, or ISSUES edits.

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
