# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 312 — S8 Battle 2 player send-out: **GREEN — 32680-32849 exact**

- **State:** `battle2-player-sendout-dense.json` is **170/170 exact**
  across canonical 32680-32849. Predecessors remain KABUTO **151/151** and
  intro **251/251**; Battle 1 send-out remains accepted at **255/256**
  (frame 1496, 3px, #18 only). Tier-1 is **1110/1110** and build passes
  (**5.517 MB**).
- **Did:** separated the handoff-relative `Go! ONIX!` printer from Battle
  2's inherited player-controller visual clock. Brendan, party summary,
  thrown-ball arc/spin/open/hide, ONIX materialize/back animation, particles,
  and the 117/117 healthbox all reuse the Battle-1 mechanisms at visual
  delay +45; callback-age 14 advances only the summary eva coefficient.
- **Audit:** independent live RAM/IO replay now proves that sole exception:
  32741 has the shared task/sprite state but immediate `BLDALPHA=0x0808`;
  mapped Battle-1 1588 has its `0x0808` write buffered behind live `0x0709`,
  reconverging at the next callback. See `battle2-opening-notes.md`.
- **Next:** resume at **32850**, the first six-tick blank action-menu frame,
  then compose the Battle 2 ONIX/KABUTO action menu. Do not reopen the exact
  send-out span. S8 remains `[ ]`.
- **Notes:** visual mappings are 32727→1574 (throw starts), 32760→1607
  (ball first visible), 32768→1615 (spin), 32805→1652 (open), and
  32820→1667 (healthbox first visible); summary eva's sole phase boundary is
  canonical 32741 / callback age 14. No harvest, absolute-tick lookup,
  fitting, thinning, or work at 32850+.

---
## 311 — S8 Battle 2 player send-out: **PARTIAL — 32680-32726 exact**

- **State:** new every-frame `battle2-player-sendout-dense.json` is
  **47/170 exact** across canonical 32680-32849: the exact prefix now reaches
  32726, immediately before Brendan's first inherited visible pose at 32727.
  Predecessors remain KABUTO **151/151**, intro **251/251**, and Battle 1
  send-out **255/256** (#18 only). Tier-1 is **1109/1109**; build passes
  (**5.517 MB**).
- **Did:** reanchored the Battle-1 player ball/materialize/healthbox clock to
  the encounter handoff, retained KABUTO after its H-slide-wobble callback,
  pinned Battle 2's separate inherited trainer/summary clock and exact
  one-glyph-per-tick `Go! ONIX!` boundary, and added three Tier-1 tests.
- **Next:** resume exactly at **32727**. Derive Brendan's inherited
  entrance/throw pose + translation and its live OAM overlap with the ball;
  then close 32727-32849 without changing the accepted clocks or entering
  the 32850 blank-menu handoff. S8 remains `[ ]`.
- **Notes:** first visible trainer callback is handoff+157, while ball spin,
  open, materialize, and permanent settle remain handoff+153/+190/+191/+240.
  The dense remainder is intentionally unthinned and not claimed exact. No
  harvest, canonical-tick lookup, RGB/coordinate fitting, or menu work.

---
## 310 — S8 Battle 2 KABUTO opponent send-out: **GREEN — 32570-32681 exact**

- **State:** `battle2-kabuto-sendout-dense.json` is **151/151 exact**
  across canonical **32531-32681**, including the assigned **112/112**
  frames 32570-32681. Battle 2 intro remains **251/251**; Battle 1 send-out
  remains its accepted **255/256** (#18 only). Tier-1 is **1106/1106** and
  build passes (**5.517 MB**).
- **Did:** encounter-parameterized trainer exit, ball/particles, affine
  materialize, summary exit, and healthbox slide; added KABUTO's real
  two-frame 101-callback H-slide-wobble, tint ownership, and literal GBA
  sine table. Pinned handoff, ball/materialize/hide, 91/91 Lv50 healthbox,
  and species-animation boundaries.
- **Next:** resume S8 at canonical **32682** with Brendan/player ball, ONIX
  materialization/player healthbox, then the Battle 2 action menu. S8
  remains `[ ]`.
- **Notes:** JENSON's particle callback stall is encounter-relative +1;
  KABUTO healthbox first appears at handoff+32 at dx=-110, holds one render,
  then advances +5. No harvest, absolute tick lookup, fitting, or thinning.
