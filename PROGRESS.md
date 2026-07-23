# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 271 — Bounded worker (ISSUES #37 rung 1): **GREEN TRANSFER CHECKPOINT — raw field asset next**

- **State:** safe baseline retained: canonical/delayed **192/200**; the same
  seven party frames plus 20302/20332 remain. Tier-1 **1007/1007**, build
  **5.32 MB**, verifier **17/17**, party compositor **5/5**.
- **Did:** replaced the misleading 5-bit BLDY helper with source-pinned mGBA
  expanded packed-RGB `_darken` semantics (tests pin white `16,15,15` and a
  non-white BGR555 case); corrected the size-1 text-BG map capture to 0x1000.
- **Next:** run direct 20302 probe, regenerate the compact indexed asset, wire
  it only at the party send-out battle-fade boundary, then compare both traces.
- **Notes:** Tier-1 PPU test and build green. The direct probe can validly
  write JSON despite its expected mGBA teardown SIGSEGV.

---
## 269 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — raw field asset still required**

- **State:** restored and committed-green at the existing rung-1 checkpoint:
  canonical **192/200** (5px 20248/50/58/60/62; 273px 20253/54; 38400px
  20302). The palette-only experiment did not reduce this set safely.
- **Did:** re-ran the direct probe (valid 1.5 MB JSON despite expected exit
  139) and traced the five pixels to the top MAGBY/status overlap and the
  273px family to party-menu ball bank1/index15. A direct blue substitution
  merely shifted that family to 20252/53; swapping the screenshot overlays
  expanded it into 13--204px sprite diffs. Both were reverted.
- **Next — SUPERVISOR DECISION:** the authorized worker stopped before the
  central field task, so split it out: extract/compose BG char/map/palette +
  field OAM for 20302 only and improve both traces **192→193/200**. Party-
  menu OAM/palette residuals are a later increment. Do not use screenshot,
  overlay/mask, or RGB-candidate fitting.
- **Notes:** no production changes shipped. PAPERCUT: valid mGBA probe ends
  SIGSEGV 139, ~3 min.
