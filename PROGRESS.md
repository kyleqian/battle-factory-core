# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 300 — Supervisor-accepted S8 postwin increment: **GREEN — heal dismiss through next-match input ready**

- **State:** canonical dynamic ticks **25800-26009** are gaplessly
  **210/210 exact**, with six earlier static-hold anchors; the committed
  trace is **216/216**. `battle1-postwin-heal.json` remains **199/199**.
  Tier-1 is **1076/1076** and build passes (**5.469 MB**).
- **Did:** made the ~2000-frame heal hold a genuine stored A gate, modeled
  source `MUS_HEAL`/`waitfanfare` timing, atomic party HP restoration
  `[0,27,153]→[117,138,153]` at dismiss+163, box clear, 36-glyph next-match
  printer, and the source-tile four-choice menu through its true +207 input
  boundary. Early/delayed edges and VBlank RNG ownership are Tier-1 pinned.
- **Next:** resume after canonical **26009** if extending the input-ready
  menu hold, or at the canonical GO ON A **28002**. Scouting pages, swap
  paths, Battle 2, and the round loop remain open; S8 stays `[ ]`.
- **Notes:** implementation `dd76bc1`, dense trace `ef43ad6`. Fresh RAM dump
  is byte-identical to the committed 6007-row ledger; fresh DOWN sweep proves
  26008 is visible-but-rejecting and 26009 first accepts input. No forbidden
  framebuffer asset/table, absolute-tick/trace branch, fitting, exclusion,
  or dynamic capture thinning. Supervisor independently reviewed the
  edge-relative state/render path and reverified the 216/216 new trace,
  199/199 predecessor, all 1076 Tier-1 tests, and production build.

---
## 299 — Supervisor-accepted S8 first postwin increment: **GREEN — loss dismiss through heal prompt exact**

- **State:** canonical `23602--23800` is **199/199 exact**, every tick
  captured in `battle1-postwin-heal.json`; `turn17-rung8b.json` remains
  **118/118**. Tier-1 is **1073/1073** and build passes (**5.465 MB**).
- **Did:** added the real no-cursor DESTIN quote gate/stored edge,
  source-relative fast fade, battle teardown and +43 `inBattle`/RNG-mode
  handoff, battle-room flash, second black hold, counter-room fade/attendant
  composition, and both heal-message lines through the true +194 input
  boundary. State pins challenge battle 0→1 at +79 and opponent rental IDs
  `[188,184,135]` at +137.
- **Next:** resume at **23801** only if extending the held prompt, or at the
  explicitly out-of-scope heal dismiss **25802** for the next S8 slice;
  delayed party heal write 25965, continuation menu, swap flow, and battle 2
  remain untouched. S8 stays `[ ]`.
- **Notes:** implementation `258e7ad`, dense trace `df718a9`, RNG ownership
  correction `f32bddb`. The latter keeps VBlank RNG live through battle
  setup, applies the RAM/source-relative opponent-generation draws, and
  freezes only at `CB2_InitBattleInternal` rather than the speech edge. Fresh
  23792-23796 input sweep proves 23796 is the first accepted edge; fresh RAM
  rerun exactly matches the committed RNG dump hash and sharpens bookkeeping
  writes to +79/+137. All timing is dismiss-relative; no forbidden baked
  frame, lookup table, trace/absolute-tick branch, fitting, exclusion, or
  thinning. Supervisor independently reverified the 199/199 dense window,
  the 118/118 predecessor, the 245-tick Turn-17 verifier, all 1073 Tier-1
  tests, and the production build.

---
## 298 — Supervisor-accepted S7 completion: **GREEN — Battle 1 win endpoint exact**

- **State:** canonical `23229--23601` is gaplessly **373/373 exact** in two
  adjacent dense traces (**255/255 + 118/118**). Rung 7b remains **147/147**,
  `verify-turn17.ts` passes **245/245**, Tier-1 is **1067/1067**, and build
  passes (**5.462 MB**).
- **Did:** ported the source `-2px/callback` DESTIN trainer slide, retained
  the frozen outcome text/arrow through the three-frame settled pause, then
  switched to source-expanded Easy Chat loss text with exact glyph cadence,
  real `PAUSE_UNTIL_PRESS` gate, no cursor, and stable hold through 23601.
- **Next:** begin S8 only after tick **23601** with the loss-quote dismiss
  and post-battle swap/round flow. Parked/unrelated issues, including #38,
  remain untouched.
- **Notes:** implementation begins at `366234e`; a final fresh printer-RAM
  audit distinguishes glyph settle at 23279 from the real WAIT gate at
  23280. All timing is relative to the stored second outcome-dismiss edge
  and shifts under delayed-edge Tier-1 coverage. No framebuffer/screenshot
  asset, absolute-tick/trace branch, per-frame table, fitted geometry/color,
  excluded capture, or thinning. Supervisor independently reverified both
  dense windows, predecessor, turn-17 verifier, full Tier-1 suite, and
  production build; ROADMAP S7 marked complete.
