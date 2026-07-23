# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 309 — Codex launcher attribution: **GREEN — mechanical and model-authoritative**

- **State:** Codex supervisor/worker launchers now pass their resolved model
  and effort to a Codex-only commit-message hook. Hook regression tests are
  **3/3** in both this run and the factory template; Tier-1 remains
  **1099/1099** and build passes (**5.497 MB**).
- **Did:** made launcher metadata replace any guessed/manual attribution,
  added the mechanical `Agent-effort` trailer, retained `unknown` fallbacks,
  and removed attribution instructions from agent-facing Markdown. Claude
  launches do not enable the hook and retain their provider-owned attribution.
- **Next:** resume S8 at **32570** with trainer exit/ball/KABUTO materialize
  and healthbox only; do not reopen exact Battle 2 send-out text.
- **Notes:** `tools/test-codex-git-attribution.sh` proves exact replacement,
  unknown fallback, and an untouched Claude commit. Shell syntax, resolved
  launcher configs, Codex deadline tests (**3/3**), Tier-1, and build pass.
