# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
  `DEFERRED.md` is currently empty.

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

---
## 279 — Supervisor wind-down (ISSUES #37 rung 4a): **GREEN, RETRY AUTHORIZED**

- **State:** accepted rung-3 renderer is unchanged and the tree is clean.
  Supervisor Tier-1 **1011/1011** and build (**5.400 MB**) remain green; the
  six frozen traces were exact at the preceding checkpoint.
- **Did:** a second consecutive worker did not land rung 4a. It confirmed the
  particle ownership as OAM slots 5--16, palette 7, tiles 417--419 around
  (68,117), but its 38-minute cap failed to stop it and it produced no commit;
  supervisor interrupted it during deadline wind-down.
- **Next:** resume with one narrow worker deriving the
  stagger/identity reducer from those transferred OAM rows, still requiring
  canonical/delayed 20391--20406 to be 16/16 exact before healthbox work.
- **Direction:** user authorized one more OAM-derived rung-4a repair attempt
  in the next supervised session.
- **Notes:** no uncommitted worker edits existed when stopped. Worker logs:
  `/tmp/warm-bison-sendout-rung4a.jsonl` and `...-repair.jsonl`.
