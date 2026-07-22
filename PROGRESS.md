# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 264 — Bounded worker (ISSUES #37 entry transition): **CHECKPOINT — OBJ ownership narrowed to BAYLEEF's initial icon frame**

- **State:** committed at `4d997f0`; `npm test` **1003/1003**, build
  green (production JS **5.16 MB**), composite **5/5 PASS**. Both dense
  compares are **135/143** (same eight residual frames, delayed +30).
- **Did:** corrected the press-relative phase boundary (fade begins rendered
  elapsed 21), and added source-derived OAM ownership masks for MURKROW,
  healthbox, all party balls, FNT/status, held-item sprites, and live icons.
  All fade-out frames are now exact; only fade-in 20061–68 retains 48px.
- **Next:** inspect BAYLEEF's initial live OBJ frame/VRAM ownership at those
  eight frames; do not coordinate-patch it. Post-SEND OUT remains separate.
- **Notes:** PAPERCUT: none.

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

---
## 261 — Corrective follow-up: **SUPERSEDED BY 262** — removed the rejected replay; retained only settled live checkpoints

- **State:** then `npm test` 999/999 and build green.
- **Did:** Deleted the absolute-tick replay and made party selection
  press-relative. This was the safe base for 262, but icon pixels still lived
  in chrome; do not use its former 46/46 result as completion evidence.
- **Next:** Superseded by 262.

---
