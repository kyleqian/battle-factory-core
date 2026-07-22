# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 266 — Bounded characterization worker (ISSUES #37 post-SEND OUT): **READY FOR IMPLEMENTATION**

- **State:** post-confirm path is oracle/RAM-characterized only; no `src/`
  engine change. New verifier is **17/17 PASS** over 316 fresh dense oracle
  captures; party canonical + delayed remain **143/143**.
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

---
## 264 — Bounded worker (ISSUES #37 entry transition): **CHECKPOINT — OBJ ownership narrowed to BAYLEEF's initial icon frame**

- **State:** committed at `c13f645`; supervisor independently reproduced
  `npm test` **1003/1003**, build
  green (production JS **5.16 MB**), composite **5/5 PASS**. Both dense
  compares are **135/143** (same eight residual frames, delayed +30).
- **Did:** corrected the press-relative phase boundary (fade begins rendered
  elapsed 21), and added source-derived OAM ownership masks for MURKROW,
  healthbox, all party balls, FNT/status, held-item sprites, and live icons.
  All fade-out frames are now exact; only fade-in 20061–68 retains 48px.
- **Next:** **USER DECISION 2026-07-22:** use supervisor judgment; authorized
  the recommended third, probe-first attempt. Dump BAYLEEF's live OBJ
  tile/anim state at canonical 20061-20068 (delayed +30), then wire only the
  derived initial-frame rule. If direct evidence does not close 143/143,
  park these eight frames and proceed to post-SEND OUT; no coordinate patch.
- **Notes:** Independent compares are **135/143** each with only the named
  eight frames red; all other entry and settled frames are exact. PAPERCUT:
  none.

---
## 262 — Bounded worker (ISSUES #37 icon/OAM half): **CLOSED** — live icon-free party compositor; canonical + delayed traces **62/62, 0 diff**

- **State:** `npm test` **1001/1001**, `npm run build` green; production JS
  **5.16 MB** (<6 MB). `composite-party-menu.ts` **5/5 PASS, 0/38400 each**.
- **Did:** Regenerated persistent chrome with every source icon/status texel
  erased; production redraws source-extracted ONIX/MAGBY/BAYLEEF + BAYLEEF
  status OBJ over it from `PartySelectState.elapsed/cursor`, including
  selection panel state, 30/31 ONIX hop, full-icon 7/8 frame cadence, and
  the documented two-frame stall. Added Tier-1 layer/schedule tests. Both
  party traces gained 16 representative ONIX/MAGBY selected plateau captures
  (**46→62**) and remain 0 diff.
- **Next:** ISSUES #37 only: 80-frame entry fade/black and post-SEND-OUT
  ball/materialization/healthbox/menu. Keep per-tick replays and absolute-tick
  assets out.
- **Notes:** `docs/party-menu-notes.md` §7 explains the auditable no-baked-
  icon proof. No PAPERCUTS.
