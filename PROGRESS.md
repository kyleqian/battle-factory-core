# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 357 — S9 OFF Moves-page rental switching: **PARTIAL — 76/80 exact**

- **State:** generic UP/DOWN now switches rentals on Battle/Contest Moves;
  the dense Battle DOWN→UP→B route is exact except four BG0 copy transients.
- **Did:** removed the Info-only controller gate, preserved page/mode/selector
  ownership, generalized page-specific replacement composition and Moves-page
  exit fading, and Tier-1 pinned both Moves pages, clocks, and input gates.
- **Next:** reproduce `CopyWindowToVram`'s two partial move-name/PP tile-memory
  transfers at frames **162–163 and 195–196**, then prove the shared Contest
  route; do not fit coordinates or thin the dense trace.
- **Notes:** `summary-battle-moves-mon-down-up.json` **76/80**; residuals are
  **536/889/431/1235 px**, confined to x120–235 move-name/PP window rows.
  Info switch **87/87**; Battle/Contest selectors **93/93 + 93/93**; page
  routes **36/36 + 16/16**. Tier-1 **1329/1329** and build green. No reorder,
  battle/controller, Scene-ON, absolute ticks, framebuffer assets, runtime
  oracle/ROM, ROADMAP, or ISSUES edits.

---
## 356 — S9 OFF Contest Moves LOCK_MOVES selector: **GREEN — 93/93 exact**

- **State:** A on input-ready ONIX Contest Moves enters the shared inert
  selector, DOWN owns BIND details, and B restores ordinary Contest Moves.
- **Did:** reused the generic selector reducer/cursor lifecycle and added
  Contest-owned effect panel, appeal/jam hearts, effect descriptions, palette,
  and source display gates. Tier-1 pins shared indices/clocks/readiness,
  rental/page/mode/move-order preservation, and locked close restoration.
- **Next:** supervisor verify this bounded route and choose the next S9
  summary increment; actual reorder and Moves-page mon switching remain open.
- **Notes:** Contest selector **93/93**; Battle selector **93/93**; page
  routes **16/16 + 36/36**; switches **87/87 + 54/54**; Info
  **122/122 + 132/132**; Info/Skills **25/25 + 56/56**; install **3/3**.
  Tier-1 **1320/1320** and build green. No reorder, mon switching,
  battle/controller, Scene-ON, absolute ticks, framebuffer assets, runtime
  oracle/ROM, ROADMAP, or ISSUES edits.

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
