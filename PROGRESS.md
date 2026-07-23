# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 282 — Bounded worker (ISSUES #37 rung 4a): **GREEN — MAGBY release**

- **State:** canonical `20391--20406` and delayed `20421--20436` are both
  **16/16 exact**. Frozen rung-2 traces remain **43/43** each and rung-3
  traces **46/46** each. Tier-1 **1012/1012** and build (**5.409 MB**) pass.
- **Did:** landed a SEND-OUT-relative release reducer (logical tick 0 at
  elapsed 145) that parameterizes the initial ONIX affine materializer and
  turn-5 clean particle/palette-fade mechanisms for MAGBY. Raw BG banks use
  source `BlendPalette`; player terrain occlusion remains at the established
  row 112 boundary. Committed dense canonical/delayed 16-frame traces.
- **Next:** #37 rung 5 begins with healthbox ownership at canonical **20407**
  (delayed **20437**). Do not reopen exact rung 1--4a windows.
- **Notes:** commit `3222c92`; no per-frame assets, absolute-tick lookup,
  screenshot harvesting, coordinate fitting, or trace-specific branching.

---
## 281 — Uninterrupted supervisor policy: **GREEN**

- **State:** game code and accepted rung-3 renderer are unchanged. The latest
  full verification remains Tier-1 **1011/1011**, build (**5.400 MB**), and
  deadline-helper tests **5/5** green.
- **Did:** made both Claude and Codex supervisors autonomous through the full
  cap: they exercise best judgment instead of asking mid-session, record only
  genuinely unsafe-to-guess decisions in `DEFERRED.md`, continue independent
  safe work, and summarize deferred questions at wind-down. An open deferred
  entry now blocks the next supervisor launch for both providers.
- **Next:** resume #37 rung 4a under the existing Codex tier policy; do not
  interrupt the session for judgment calls.
- **Notes:** `ISSUES.md` remains the confirmed bug/debt backlog.
  `DEFERRED.md` is currently empty. Direct sessions without injected model
  metadata use `Agent-model: unknown` rather than guessing.

---
## 280 — Codex supervised-run hardening: **GREEN**

- **State:** game code and accepted rung-3 renderer are unchanged. Tier-1
  **1011/1011**, build (**5.400 MB**), and deadline-helper tests **5/5** are
  green.
- **Did:** made Codex workers default to Sol/medium, added supervisor-directed
  Sol/high escalation for cross-layer or failed repairs, enforced Codex caps
  over the full process group, separated JSONL from stderr, fixed managed
  launch instructions, and added clean-start/commit/clean-finish checks plus
  Codex-only anti-overfit acceptance guardrails. Claude defaults and launch
  behavior remain unchanged.
- **Next:** resume #37 rung 4a under a Sol/high Codex supervisor. The authorized
  repair qualifies for a Sol/high worker; ordinary later implementation should
  return to Sol/medium.
- **Notes:** keep the supervisor at Sol/high. Both Codex launchers cap Sol at
  high; Terra/xhigh remains available only as an explicit override; max and
  ultra are refused.
