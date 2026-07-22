# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 267 — Bounded worker (ISSUES #37 rung 1): **GREEN CHECKPOINT — palette source blocker**

- **State:** supervisor independently verified and banked the safe partial
  implementation: Tier-1 **1005/1005**, build green at **5.32 MB**, oracle
  verifier **17/17**, compositor **5/5**. Canonical and delayed are both
  **192/200**, with the same eight frames at +30; rung 1 is not complete.
- **Did:** added a SEND OUT-edge-relative phase clock (hold → 16-frame
  fade → 39-frame generated black hold), live exit chrome/icon-frame logic,
  and the +57 dense capture windows in both party traces. Canonical confirms
  20245–47 and 20249/51/52/55–57/59/61/63–301 exactly; no absolute tick
  branch or full-screen replay asset was added.
- **Next:** corrective worker must probe real faded/unfaded palette and OAM
  state at the eight residual frames before editing. Close canonical + delayed
  to **200/200**; do not screenshot-fit or add absolute timing.
- **Notes:** residuals are 5px at 20248/50/58/60/62, 273px at 20253/54,
  and full-frame at 20302 (delayed +30). PAPERCUT: verbose compare output,
  ~2 min.

---
## 266 — Bounded characterization worker (ISSUES #37 post-SEND OUT): **READY FOR IMPLEMENTATION**

- **State:** **SUPERVISOR ACCEPTED** — post-confirm path is oracle/RAM-
  characterized only; no `src/` engine change. Independently reproduced
  **17/17 PASS** over 316 fresh dense oracle captures; party canonical +
  delayed remain **143/143**, Tier-1 **1004/1004**, build green.
- **Did:** added `docs/turn15-sendout-notes.md`, dense pixel verifier and
  RAM/OAM/VRAM dump. Pinned confirm/fade/black, field/text, Brendan+ball,
  particles/MAGBY tint, healthbox 268→158 slide, blank 20551–56, settled
  menu 20557 + bounce; recorded exact primitive-by-primitive reuse map.
- **Next:** implement #37 rung 1 only (submenu exit/fade/black), using its
  documented dense capture range; preserve no absolute tables/assets rule.
- **Notes:** RAM settles MAGBY 138/138, PP 15/20/10/20, cursor 0; healthbox
  pieces 1/63/62 slide -5 px/tick. PAPERCUT: mGBA emits megabytes of
  diagnostics unless redirected, ~2 min.

---
## 265 — Bounded worker (ISSUES #37 entry residual): **CLOSED — user-authorized probe outcome**

- **State:** committed at `d0f843c`: direct sprite/VRAM/palette probe closed
  the eight initial-icon residuals; canonical + delayed dense compares are
  **143/143**, composite **5/5**, and Tier-1 **1004/1004**.
- **Did:** BAYLEEF slot 8 is live through black; source frame1 bytes reach
  OBJ VRAM one VBlank after its command advance and own canonical 20061–68
  (delayed +30), with palette bank 4 fading normally. Added a matching
  source-erased `listOnixFrame1` chrome layer, selected only from existing
  menu-relative frame state; documented reproducible probe in
  `docs/party-menu-notes.md` §8. Trimmed #37 to post-SEND OUT only.
- **Next:** hand off #37's post-SEND OUT path; do not implement it in this
  worker.
- **Notes:** no coordinate patch, absolute tick branch, or frame asset added;
  the new chrome is source-erased per a live icon frame. Build JS **5.21 MB**
  (gzip **237.51 kB**). PAPERCUT: mGBA probe emits megabytes of harmless
  diagnostics unless redirected, ~2 min.
