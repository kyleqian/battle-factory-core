# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 308 — Supervisor-accepted S8 Battle 2 send-out text: **GREEN — 32531-32569 exact**

- **State:** canonical **32531-32569 = 39/39 exact**, stopping one frame
  before the 32570 visual handoff; Battle 2 intro remains **251/251 exact**.
  Tier-1 is **1099/1099** and build passes (**5.497 MB**).
- **Did:** reused the stored delayed-A/send-out clock and registration lag,
  parameterized the shared printer from encounter identity as `FISHERMAN
  JENSON sent / out KABUTO!` (32 glyphs), and retained the Fisherman scene
  through both final post-text hold frames. Added the dense trace and Tier-1
  pins while preserving DESTIN/GROVYLE defaults.
- **Next:** begin at **32570** with trainer exit/ball/KABUTO materialize and
  healthbox only in a separately scoped increment. S8 stays `[ ]`.
- **Notes:** no trainer exit, ball, species, healthbox, particles, absolute
  tick lookup, framebuffer harvest, fitting, or trace thinning. Supervisor
  independently reviewed the press-relative encounter parameterization and
  reverified both traces, all 1099 Tier-1 tests, and build.
