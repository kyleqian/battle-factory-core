# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 307 — Supervisor-accepted S8 Battle 2 opening probe: **GREEN evidence checkpoint**

- **State:** exact renderer endpoint remains **32280--32530 = 251/251**;
  canonical 33030 is documented only, not claimed pixel-exact. Tier-1 is
  **1098/1098** and build passes (**5.496 MB**).
- **Did:** replayed canonical segments 154--155 unchanged and added the
  source/RAM/OAM-ready 32531--33030 ledger in `docs/battle2-opening-notes.md`:
  JENSON handoff 32570; KABUTO ball/healthbox/species H-slide; ONIX throw,
  materialize, and menu blank/draw 32850--32856; 33030 full-HP FIGHT menu.
  Sparse app samples are exact at 32531/32533 then rank the remaining live
  gap (peak 11,210 px at 32831), without an acceptance claim or harvest.
- **Next:** implement only the ledgered live Battle-2 send-outs/menu in a
  later scoped increment; S8 stays `[ ]`.
- **Notes:** fresh RAM has `gMain.inBattle=2` throughout; no ordinary VBlank
  RNG. On-demand RNG is flat to 32893 then +1/+2/+5 at 32894/32898/32900
  (pre-turn/AI); 33030 is 3530724670 with execFlags=1. No trace/assets/runtime
  changes, screenshot lookup, tick fitting, or dynamic thinning. Supervisor
  independently reviewed the source/RAM boundary ledger and reverified all
  1098 Tier-1 tests and build.
