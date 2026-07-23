# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 274 — Bounded worker (ISSUES #37 rung 1): **CLOSED — raw split exit OBJ composition**

- **State:** canonical and delayed dense party traces are both **200/200 exact**;
  the 20302/20332 raw field boundary remains exact. Tier-1 **1009/1009**,
  build green, SEND OUT verifier **17/17**, party compositor **5/5**.
- **Did:** extracted 33 indexed OBJ tiles, raw BGR555 palette and transferred OAM
  for exit status 1--2 / balls 6--9; erased those ownership pixels from only
  exit chrome. Composed balls → live icons → status; the fade mask uses raw
  transparency too, fixing the five status-backing pixels and ball palette family.
- **Next:** #37 rung 2 only: battle fade + `Go! MAGBY!` text, after fresh dense
  ground truth. Do not reopen rung 1.
- **Notes:** Tier-1 pins lower-index-wins OBJ ordering. PAPERCUT: direct mGBA
  probe emits megabytes of diagnostics, ~2 min.

---
## 273 — Supervisor accepted (ISSUES #37 rung 1): **GREEN EVIDENCE CHECKPOINT — live OBJ transfer not yet safely wired**

- **State:** independently verified accepted baseline: canonical/delayed party traces **193/200**; only
  5px at 20248/50/58/60/62 and 273px at 20253/54 (delayed +30). The exact
  20302/20332 raw field boundary remains untouched.
- **Did:** fresh direct PPU probe confirms exit OAM stays static: status OBJ entries 1/2
  (bank 0, tile 0) and party-ball entries 6--9 (bank 1, tiles 2--33). A raw
  layer wiring experiment was reverted after it regressed 16 frames (451--642px):
  OAM order proves balls sit behind the icon OAM while status sits in front,
  so a single post-icon OBJ pass is structurally wrong.
- **Next:** split raw exit OBJ composition at actual OAM priority/order (balls before
  MAGBY/BAYLEEF icons; status after), then use indexed tile/palette state only. Preserve
  the existing press-relative fade and do not change 20302.
- **Notes:** supervisor reran Tier-1 **1008/1008**, build, and both dense
  traces; direct hardware OAM independently confirms balls 6--9 behind
  icons 3--5 and status 1--2 in front. The failed compositor was fully
  reverted; verifier **17/17** and party compositor **5/5** remain green.

---
## 272 — Supervisor accepted (ISSUES #37 rung 1): **CLOSED FIELD BOUNDARY — GREEN**

- **State:** independently accepted: canonical and delayed party traces are **193/200**; 20302 and
  delayed 20332 are byte-exact. The only red frames are party residuals:
  5px at 20248/50/58/60/62 and 273px at 20253/54 (delayed +30). Tier-1 is
  **1008/1008**; build is **5.393 MB** (<6 MB); verifier **17/17** and
  party compositor **5/5**.
- **Did:** regenerated the 73KB raw indexed 20302 asset from direct PPU
  state (BG size-1 maps are 0x1000); wired it only at SEND OUT's
  press-relative battle-fade boundary; removed the stale faint-frame/
  `fadeTurn15BattleFirstFrame` approximation. Captured OAM affine matrices
  from transferred OAM, added affine compositing, and corrected mGBA's
  packed-RGB darken transfer.
- **Next:** #37 rung 1 has only the seven named party residuals left; do not
  reopen the exact 20302 field boundary. Later SEND OUT animation rungs stay
  separately scoped.
- **Notes:** supervisor reran both dense compares, Tier-1 **1008/1008**, build,
  verifier **17/17**, and compositor **5/5**; asset audit confirms indexed
  PPU inputs only. Direct probe exits 139 after valid JSON. Initial raw integration
  exposed a 1551px MURKROW shift (bbox 123,0–196,71); transferred affine
  geometry resolved it to 0px without a coordinate patch.

---
